import { Injectable } from '@nestjs/common';
import { LoginDto } from '../dto/auth.dto';

@Injectable()
export class AuthValidator {
  validateLoginPayload(dto: LoginDto): boolean {
    return Boolean(dto.email && dto.password && dto.password.length >= 8);
  }
}
