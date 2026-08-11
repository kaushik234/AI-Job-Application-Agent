import { UnauthorizedException } from '@nestjs/common';

export class InvalidCredentialsException extends UnauthorizedException {
  constructor() {
    super('Invalid email or password provided');
  }
}

export class TokenExpiredException extends UnauthorizedException {
  constructor() {
    super('Authentication token has expired');
  }
}
