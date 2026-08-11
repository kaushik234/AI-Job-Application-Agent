import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailValidator {
  isValidEmailAddress(email: string): boolean {
    return /^[^@]+@[^@]+\.[^@]+$/.test(email);
  }
}
