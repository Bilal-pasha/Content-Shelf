import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../user/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from './dto/auth-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { GoogleUserDto } from './dto/google-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { hashToken } from '../../common/security/token-hash';
import { MailService } from '../../common/mail/mail.service';
import { toJwtExpiresIn } from '../../utils/jwt-expiry';
import { randomBytes } from 'crypto';

const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{
    user: UserResponseDto;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const { email, name, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Create new user
    const user = this.userRepository.create({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      password, // Will be hashed by entity hook
    });

    const savedUser = await this.userRepository.save(user);

    const tokens = await this.issueTokens(savedUser);

    return {
      user: this.mapUserToResponse(savedUser),
      tokens,
    };
  }

  async login(loginDto: LoginDto): Promise<{
    user: UserResponseDto;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.issueTokens(user);

    return {
      user: this.mapUserToResponse(user),
      tokens,
    };
  }

  async validateUser(userId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: userId } });
  }

  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        },
      );

      // Get user from token
      const user = await this.validateUser(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Reject if this token isn't the currently-valid one for this user —
      // it was already rotated away (or the user logged out / changed
      // password), so treat it as a revoked/reused token.
      if (
        !user.currentRefreshTokenHash ||
        user.currentRefreshTokenHash !== hashToken(refreshToken)
      ) {
        throw new UnauthorizedException('Refresh token has been revoked');
      }

      // Rotate: issue new tokens and store the new hash.
      return await this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /** Invalidates the current refresh token so it can no longer be used (logout / password change). */
  async revokeRefreshToken(userId: string): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { currentRefreshTokenHash: null },
    );
  }

  private async issueTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokens = this.generateTokens(user);
    await this.userRepository.update(
      { id: user.id },
      { currentRefreshTokenHash: hashToken(tokens.refreshToken) },
    );
    return tokens;
  }

  private generateTokens(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    const jwtSecret = this.configService.getOrThrow<string>('JWT_SECRET');
    const jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1h');

    const refreshSecret =
      this.configService.getOrThrow<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtSecret,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expiresIn: toJwtExpiresIn(jwtExpiresIn),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expiresIn: toJwtExpiresIn(refreshExpiresIn),
    });

    return { accessToken, refreshToken };
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update user fields
    if (updateProfileDto.name !== undefined) {
      user.name = updateProfileDto.name.trim();
    }

    const updatedUser = await this.userRepository.save(user);
    return this.mapUserToResponse(updatedUser);
  }

  async updatePassword(
    userId: string,
    updatePasswordDto: UpdatePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(
      updatePasswordDto.currentPassword,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash explicitly: the entity's @BeforeInsert hook does not run on save() of an
    // already-persisted row, so an update path must hash the password itself.
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(updatePasswordDto.newPassword, salt);
    // Force re-login everywhere else: an in-flight session's refresh token
    // (e.g. on another device) should not survive a password change.
    user.currentRefreshTokenHash = null;
    await this.userRepository.save(user);
  }

  /**
   * Always resolves the same way regardless of whether the email exists —
   * revealing that would let an attacker enumerate registered accounts.
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) return;

    const rawToken = randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetTokenExpiresAt = new Date(
      Date.now() + PASSWORD_RESET_TOKEN_TTL_MS,
    );
    await this.userRepository.save(user);

    // Use the app's universal-link domain (Android App Links / iOS Universal
    // Links), not a bare custom scheme — most email clients strip or refuse
    // to render tappable custom-scheme (myapp://) links, but an https link
    // opens the app directly on a device that has it installed and falls
    // back to a normal web page otherwise.
    const appLinkBase = this.configService.get<string>(
      'APP_UNIVERSAL_LINK_BASE',
      'https://online2.video-mobile-application.com',
    );
    const resetLink = `${appLinkBase}/reset-password?token=${rawToken}`;
    await this.mailService.sendPasswordResetEmail(user.email, resetLink);
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const user = await this.userRepository.findOne({
      where: { passwordResetTokenHash: tokenHash },
    });

    if (
      !user ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(dto.newPassword, salt);
    user.passwordResetTokenHash = null;
    user.passwordResetTokenExpiresAt = null;
    user.currentRefreshTokenHash = null; // force re-login everywhere
    await this.userRepository.save(user);
  }

  async googleAuth(googleUser: GoogleUserDto): Promise<{
    user: UserResponseDto;
    tokens: { accessToken: string; refreshToken: string };
    isNewUser: boolean;
  }> {
    const { googleId, email, name, picture } = googleUser;

    // Check if user exists with this Google ID
    let user = await this.userRepository.findOne({
      where: { oauthProvider: 'google', oauthId: googleId },
    });

    let isNewUser = false;

    if (!user) {
      // Check if user exists with this email (from regular signup)
      user = await this.userRepository.findOne({
        where: { email: email.toLowerCase().trim() },
      });

      if (user) {
        // Link existing account to Google
        user.oauthProvider = 'google';
        user.oauthId = googleId;
        if (picture && !user.avatar) {
          user.avatar = picture;
        }
        await this.userRepository.save(user);
      } else {
        // Create new user
        isNewUser = true;
        user = this.userRepository.create({
          email: email.toLowerCase().trim(),
          name: name.trim(),
          avatar: picture,
          oauthProvider: 'google',
          oauthId: googleId,
          password: null, // OAuth users don't have passwords
        });
        user = await this.userRepository.save(user);
      }
    } else {
      // Update avatar if changed
      if (picture && picture !== user.avatar) {
        user.avatar = picture;
        await this.userRepository.save(user);
      }
    }

    const tokens = await this.issueTokens(user);

    return {
      user: this.mapUserToResponse(user),
      tokens,
      isNewUser,
    };
  }

  private mapUserToResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
