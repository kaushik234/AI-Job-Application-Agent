import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from './dto/auth.dto';

describe('AuthService (Unit Tests)', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    setting: {
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    emailVerificationToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    passwordResetToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_jwt_token'),
    verify: jest.fn().mockReturnValue({
      sub: 'usr_test_123',
      email: 'test@sentinel.ai',
      role: 'USER',
      type: 'refresh',
    }),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock-jwt-secret'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashPassword & comparePasswords', () => {
    it('should hash a password with bcrypt and verify it correctly', async () => {
      const plainPassword = 'SecretPassword123!';
      const hash = await service.hashPassword(plainPassword);
      expect(hash).not.toEqual(plainPassword);
      expect(hash).toBeDefined();

      const isMatch = await service.comparePasswords(plainPassword, hash);
      expect(isMatch).toBe(true);

      const isWrong = await service.comparePasswords('WrongPassword', hash);
      expect(isWrong).toBe(false);
    });
  });

  describe('register', () => {
    it('should register a new user and generate an email verification token', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'usr_001',
        email: 'test@sentinel.ai',
        firstName: 'Kaushik',
        lastName: 'Khandhala',
        role: 'USER',
        isEmailVerified: false,
      });

      const result = await service.register({
        email: 'test@sentinel.ai',
        password: 'Password123!',
        firstName: 'Kaushik',
        lastName: 'Khandhala',
        role: UserRole.USER,
      });

      expect(result.user.email).toBe('test@sentinel.ai');
      expect(result.user.role).toBe('USER');
      expect(result.emailVerificationToken).toContain('verify_');
    });
  });

  describe('forgotPassword & resetPassword', () => {
    it('should issue reset password token for registered email', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'usr_001',
        email: 'test@sentinel.ai',
      });

      const result = await service.forgotPassword({ email: 'test@sentinel.ai' });
      expect(result.message).toBeDefined();
      expect(result.resetToken).toBeDefined();
    });

    it('should reset password successfully when given valid token', async () => {
      mockPrismaService.passwordResetToken.findFirst.mockResolvedValue({
        id: 'rst_001',
        userId: 'usr_001',
        token: 'reset_token_test',
        expiresAt: new Date(Date.now() + 3600000),
        isUsed: false,
      });

      const result = await service.resetPassword({
        token: 'reset_token_test',
        newPassword: 'NewPassword123!',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('oauthLogin', () => {
    it('should process Google OAuth login and generate access tokens', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        id: 'usr_oauth_001',
        email: 'oauth@gmail.com',
        firstName: 'Kaushik',
        lastName: 'OAuth',
        role: 'USER',
        isEmailVerified: true,
      });

      const result = await service.oauthLogin({
        provider: 'google',
        providerId: 'google_12345',
        email: 'oauth@gmail.com',
        firstName: 'Kaushik',
        lastName: 'OAuth',
      });

      expect(result.accessToken).toBe('mock_jwt_token');
      expect(result.user.email).toBe('oauth@gmail.com');
    });
  });
});
