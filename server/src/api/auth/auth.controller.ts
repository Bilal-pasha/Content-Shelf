import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  Req,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { PinoLogger, InjectPinoLogger } from 'nestjs-pino';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../user/user.entity';
import { COOKIE_NAMES } from '../../common/constants/app.constants';
import { setAuthCookies, clearAuthCookies } from '../../utils/cookie.utils';
import { OAuth2Client } from 'google-auth-library';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  private googleClient: OAuth2Client;
  // Accepted `aud` values for a Google ID token. With the mobile SDK
  // configured with `webClientId`, tokens are minted for the web client on
  // both platforms — but we also accept the iOS/Android client IDs when set,
  // so a future mobile-config change can't silently break verification.
  private readonly googleAudiences: string[];

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    @InjectPinoLogger(AuthController.name)
    private readonly logger: PinoLogger,
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.googleAudiences = [
      googleClientId,
      this.configService.get<string>('GOOGLE_IOS_CLIENT_ID'),
      this.configService.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
    ].filter((id): id is string => Boolean(id));

    if (googleClientId) {
      this.googleClient = new OAuth2Client(googleClientId);
    }
  }

  private getCookieConfig() {
    const isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
    const accessTokenExpiresIn = this.configService.get<string>(
      'JWT_EXPIRES_IN',
      '1h',
    );
    const refreshTokenExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
    return { isProduction, accessTokenExpiresIn, refreshTokenExpiresIn };
  }

  @Post('signup')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.register(registerDto);

    // Set HTTP-only cookies
    const { isProduction, accessTokenExpiresIn, refreshTokenExpiresIn } =
      this.getCookieConfig();
    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      isProduction,
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
    );

    return {
      success: true,
      message: 'Account created successfully',
      data: { user },
    };
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const { user, tokens } = await this.authService.login(loginDto);

    // Set HTTP-only cookies
    const { isProduction, accessTokenExpiresIn, refreshTokenExpiresIn } =
      this.getCookieConfig();
    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      isProduction,
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
    );

    return {
      success: true,
      message: 'Login successful',
      data: { user },
    };
  }

  @Post('token/refresh')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiCookieAuth()
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refreshToken(
    @Req() req: Request,
    @Body() body: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    // Support both cookie-based (web) and body-based (mobile) refresh tokens
    const cookieToken = req.cookies as Record<string, string> | undefined;
    const refreshToken: string | undefined =
      cookieToken?.[COOKIE_NAMES.REFRESH_TOKEN] || body?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not provided');
    }

    const tokens = await this.authService.refreshToken(refreshToken);

    // Set new HTTP-only cookies (for web clients)
    const { isProduction, accessTokenExpiresIn, refreshTokenExpiresIn } =
      this.getCookieConfig();
    setAuthCookies(
      res,
      tokens.accessToken,
      tokens.refreshToken,
      isProduction,
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
    );

    return {
      success: true,
      message: 'Token refreshed successfully',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged out',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logout(
    @CurrentUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.revokeRefreshToken(user.id);
    clearAuthCookies(res);

    return {
      success: true,
      message: 'Logout successful',
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current user' })
  @ApiResponse({
    status: 200,
    description: 'Current user information',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCurrentUser(@CurrentUser() user: User): AuthResponseDto {
    return {
      success: true,
      message: 'User retrieved successfully',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      },
    };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<AuthResponseDto> {
    const updatedUser = await this.authService.updateProfile(
      user.id,
      updateProfileDto,
    );

    return {
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    };
  }

  @Put('password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update user password' })
  @ApiResponse({
    status: 200,
    description: 'Password updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Current password is incorrect' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updatePassword(
    @CurrentUser() user: User,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.updatePassword(user.id, updatePasswordDto);

    return {
      success: true,
      message: 'Password updated successfully',
    };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password reset email' })
  @ApiResponse({
    status: 200,
    description: 'A reset email is sent if the address is registered',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.forgotPassword(dto);
    return {
      success: true,
      message: 'If that email is registered, a reset link has been sent',
    };
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password using a token from the reset email',
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired reset token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
  ): Promise<{ success: boolean; message: string }> {
    await this.authService.resetPassword(dto);
    return { success: true, message: 'Password reset successfully' };
  }

  @Post('google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Google' })
  @ApiResponse({
    status: 200,
    description: 'Google authentication successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid Google token' })
  async googleAuth(
    @Body() googleAuthDto: GoogleAuthDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    if (!this.googleClient) {
      this.logger.error(
        'Google sign-in called but GOOGLE_CLIENT_ID is not configured',
      );
      throw new ServiceUnavailableException('Google sign-in is not configured');
    }

    try {
      // Verify Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleAuthDto.idToken,
        audience: this.googleAudiences,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new UnauthorizedException('Invalid Google token');
      }

      // Validate required fields
      if (!payload.sub || !payload.email) {
        throw new UnauthorizedException(
          'Google token missing required information',
        );
      }

      // Extract user information
      const googleUser = {
        googleId: payload.sub,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        picture: payload.picture,
      };

      // Authenticate or create user
      const { user, tokens, isNewUser } =
        await this.authService.googleAuth(googleUser);

      // Set HTTP-only cookies
      const { isProduction, accessTokenExpiresIn, refreshTokenExpiresIn } =
        this.getCookieConfig();
      setAuthCookies(
        res,
        tokens.accessToken,
        tokens.refreshToken,
        isProduction,
        accessTokenExpiresIn,
        refreshTokenExpiresIn,
      );

      return {
        success: true,
        message: isNewUser
          ? 'Account created successfully'
          : 'Login successful',
        data: { user },
      };
    } catch (error: unknown) {
      this.logger.error({ err: error }, 'Google authentication failed');
      throw new UnauthorizedException('Invalid Google token');
    }
  }
}
