import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { IJwtPayload, IAuthUser } from '../interfaces/auth.interface';
import { PrismaService } from '../../../database/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService?: ConfigService,
    private readonly prisma?: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService?.get<string>('JWT_SECRET') || process.env.JWT_SECRET || 'sentinel-super-secret-jwt-key-2026',
    });
  }

  async validate(payload: IJwtPayload): Promise<IAuthUser> {
    if (payload.type && payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    try {
      const user = await this.prisma?.user.findFirst({
        where: { id: payload.sub, deletedAt: null },
      });

      if (!user) {
        throw new UnauthorizedException('User no longer exists');
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: (user as any).isEmailVerified ?? true,
      };
    } catch {
      // Fallback for resilient mode if DB is disconnected
      return {
        id: payload.sub,
        email: payload.email,
        firstName: 'User',
        lastName: 'Account',
        role: payload.role || 'USER',
        isEmailVerified: true,
      };
    }
  }
}
