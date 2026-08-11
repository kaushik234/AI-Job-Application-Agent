import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth.module';
import { DatabaseModule } from '../../database/database.module';
import { RepositoriesModule } from '../../repositories/repositories.module';
import { AuthService } from './auth.service';

describe('AuthModule (Full Integration Test Suite)', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        DatabaseModule,
        RepositoriesModule,
        AuthModule,
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    authService = moduleRef.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('1. should register a new user successfully', async () => {
    const testEmail = `integration_${Date.now()}@sentinel.ai`;
    const res = await authService.register({
      email: testEmail,
      password: 'Password123!',
      firstName: 'Integration',
      lastName: 'User',
    });

    expect(res).toBeDefined();
    expect(res.user.email).toBe(testEmail);
    expect(res.user.role).toBe('USER');
    expect(res.emailVerificationToken).toBeDefined();
  });

  it('2. should authenticate user and issue JWT Access and Refresh Tokens', async () => {
    const testEmail = `login_${Date.now()}@sentinel.ai`;
    await authService.register({
      email: testEmail,
      password: 'Password123!',
      firstName: 'Auth',
      lastName: 'Tester',
    });

    const loginRes = await authService.login(
      { email: testEmail, password: 'Password123!' },
      '127.0.0.1',
      'IntegrationTest/1.0'
    );

    expect(loginRes.accessToken).toBeDefined();
    expect(loginRes.refreshToken).toBeDefined();
    expect(loginRes.user.email).toBe(testEmail);
  });

  it('3. should refresh access token using valid refresh token', async () => {
    const testEmail = `refresh_${Date.now()}@sentinel.ai`;
    await authService.register({
      email: testEmail,
      password: 'Password123!',
      firstName: 'Refresh',
      lastName: 'Tester',
    });

    const loginRes = await authService.login({ email: testEmail, password: 'Password123!' });
    const refreshed = await authService.refreshToken({ refreshToken: loginRes.refreshToken });

    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.refreshToken).toBeDefined();
  });

  it('4. should handle Google & GitHub OAuth login and account creation', async () => {
    const googleRes = await authService.oauthLogin({
      provider: 'google',
      providerId: 'google_oauth_999',
      email: 'oauth.google@sentinel.ai',
      firstName: 'OAuth',
      lastName: 'Google',
    });

    expect(googleRes.accessToken).toBeDefined();
    expect(googleRes.user.email).toBe('oauth.google@sentinel.ai');

    const githubRes = await authService.oauthLogin({
      provider: 'github',
      providerId: 'github_oauth_888',
      email: 'oauth.github@sentinel.ai',
      firstName: 'OAuth',
      lastName: 'GitHub',
    });

    expect(githubRes.accessToken).toBeDefined();
    expect(githubRes.user.email).toBe('oauth.github@sentinel.ai');
  });

  it('5. should verify user email using token', async () => {
    const testEmail = `verify_${Date.now()}@sentinel.ai`;
    const regRes = await authService.register({
      email: testEmail,
      password: 'Password123!',
      firstName: 'Verify',
      lastName: 'Tester',
    });

    const verifyRes = await authService.verifyEmail({ token: regRes.emailVerificationToken! });
    expect(verifyRes.success).toBe(true);

    const profile = await authService.getProfile(regRes.user.id);
    expect(profile.isEmailVerified).toBe(true);
  });

  it('6. should handle forgot and reset password flow', async () => {
    const testEmail = `reset_${Date.now()}@sentinel.ai`;
    await authService.register({
      email: testEmail,
      password: 'OldPassword123!',
      firstName: 'Reset',
      lastName: 'Tester',
    });

    const forgotRes = await authService.forgotPassword({ email: testEmail });
    expect(forgotRes.resetToken).toBeDefined();

    const resetRes = await authService.resetPassword({
      token: forgotRes.resetToken!,
      newPassword: 'NewPassword123!',
    });

    expect(resetRes.success).toBe(true);

    const loginRes = await authService.login({ email: testEmail, password: 'NewPassword123!' });
    expect(loginRes.accessToken).toBeDefined();
  });

  it('7. should list and revoke user active sessions', async () => {
    const testEmail = `sessions_${Date.now()}@sentinel.ai`;
    await authService.register({
      email: testEmail,
      password: 'Password123!',
      firstName: 'Session',
      lastName: 'Tester',
    });

    const loginRes = await authService.login(
      { email: testEmail, password: 'Password123!' },
      '192.168.1.1',
      'TestBrowser/1.0'
    );

    const sessions = await authService.getUserSessions(loginRes.user.id);
    expect(sessions.length).toBeGreaterThan(0);

    const revokeRes = await authService.revokeSession(loginRes.user.id, sessions[0].id);
    expect(revokeRes.success).toBe(true);
  });
});
