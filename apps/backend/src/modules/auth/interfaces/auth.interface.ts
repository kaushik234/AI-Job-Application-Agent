export interface IJwtPayload {
  sub: string;
  email: string;
  role: string;
  type?: 'access' | 'refresh';
}

export interface IAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isEmailVerified: boolean;
}

export interface ISessionInfo {
  id: string;
  userId: string;
  token: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
}
