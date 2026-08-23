import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../user/user.entity';
import { MailService } from '../../common/mail/mail.service';

type MockRepo = {
  findOne: jest.Mock<Promise<User | null>, unknown[]>;
  save: jest.Mock<Promise<User>, [User]>;
  update: jest.Mock<Promise<undefined>, unknown[]>;
  create: jest.Mock<User, [Partial<User>]>;
};

function makeUser(overrides: Partial<User> = {}): User {
  const user = new User();
  user.id = 'user-1';
  user.email = 'user@example.com';
  user.name = 'Test User';
  user.password = null;
  user.currentRefreshTokenHash = null;
  user.passwordResetTokenHash = null;
  user.passwordResetTokenExpiresAt = null;
  user.createdAt = new Date();
  user.updatedAt = new Date();
  return Object.assign(user, overrides);
}

describe('AuthService', () => {
  let service: AuthService;
  let repo: MockRepo;
  let mailService: { sendPasswordResetEmail: jest.Mock };

  beforeEach(async () => {
    repo = {
      findOne: jest.fn<Promise<User | null>, unknown[]>(),
      save: jest.fn((u: User) => Promise.resolve(u)),
      update: jest.fn(() => Promise.resolve(undefined)),
      create: jest.fn((u: Partial<User>) => Object.assign(new User(), u)),
    };
    mailService = {
      sendPasswordResetEmail: jest.fn(() => Promise.resolve(undefined)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: repo },
        {
          provide: JwtService,
          useValue: { sign: jest.fn(() => 'signed-token'), verify: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: unknown) => def),
            getOrThrow: jest.fn(() => 'test-secret'),
          },
        },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('updatePassword', () => {
    it('hashes the new password rather than storing it in plaintext', async () => {
      const currentHash = await bcrypt.hash('OldPass123!', 10);
      const user = makeUser({ password: currentHash });
      repo.findOne.mockResolvedValue(user);

      await service.updatePassword('user-1', {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      });

      expect(repo.save).toHaveBeenCalled();
      const saved = repo.save.mock.calls[0][0];
      expect(saved.password).not.toBe('NewPass123!');
      expect(
        await bcrypt.compare('NewPass123!', saved.password as string),
      ).toBe(true);
    });

    it('revokes the current refresh token on password change', async () => {
      const currentHash = await bcrypt.hash('OldPass123!', 10);
      const user = makeUser({
        password: currentHash,
        currentRefreshTokenHash: 'some-old-hash',
      });
      repo.findOne.mockResolvedValue(user);

      await service.updatePassword('user-1', {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      });

      const saved = repo.save.mock.calls[0][0];
      expect(saved.currentRefreshTokenHash).toBeNull();
    });

    it('rejects an incorrect current password', async () => {
      const currentHash = await bcrypt.hash('OldPass123!', 10);
      repo.findOne.mockResolvedValue(makeUser({ password: currentHash }));

      await expect(
        service.updatePassword('user-1', {
          currentPassword: 'WrongPass!',
          newPassword: 'NewPass123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('forgotPassword', () => {
    it('sets a hashed, expiring reset token and emails the link when the user exists', async () => {
      const user = makeUser();
      repo.findOne.mockResolvedValue(user);

      await service.forgotPassword({ email: user.email });

      expect(repo.save).toHaveBeenCalled();
      const saved = repo.save.mock.calls[0][0];
      expect(saved.passwordResetTokenHash).toEqual(expect.any(String));
      expect(saved.passwordResetTokenHash).not.toContain(' ');
      expect(saved.passwordResetTokenExpiresAt).toBeInstanceOf(Date);
      expect(saved.passwordResetTokenExpiresAt!.getTime()).toBeGreaterThan(
        Date.now(),
      );
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        user.email,
        expect.stringContaining('/reset-password?token='),
      );
    });

    it('does not error or email anything for an unknown address (no enumeration)', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.forgotPassword({ email: 'nobody@example.com' }),
      ).resolves.toBeUndefined();
      expect(repo.save).not.toHaveBeenCalled();
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('rejects an unknown token', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(
        service.resetPassword({ token: 'bogus', newPassword: 'NewPass123!' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an expired token', async () => {
      const user = makeUser({
        passwordResetTokenHash: 'irrelevant-because-we-mock-findOne',
        passwordResetTokenExpiresAt: new Date(Date.now() - 1000),
      });
      repo.findOne.mockResolvedValue(user);

      await expect(
        service.resetPassword({
          token: 'whatever',
          newPassword: 'NewPass123!',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('hashes the new password and clears the reset token on success', async () => {
      const user = makeUser({
        passwordResetTokenHash: 'irrelevant-because-we-mock-findOne',
        passwordResetTokenExpiresAt: new Date(Date.now() + 60_000),
      });
      repo.findOne.mockResolvedValue(user);

      await service.resetPassword({
        token: 'whatever',
        newPassword: 'NewPass123!',
      });

      const saved = repo.save.mock.calls[0][0];
      expect(
        await bcrypt.compare('NewPass123!', saved.password as string),
      ).toBe(true);
      expect(saved.passwordResetTokenHash).toBeNull();
      expect(saved.passwordResetTokenExpiresAt).toBeNull();
    });
  });
});
