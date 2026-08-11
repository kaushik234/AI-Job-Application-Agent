import { Injectable } from '@nestjs/common';

@Injectable()
export class UserValidator {
  validateUserSkills(skills?: string[]): boolean {
    return Array.isArray(skills);
  }
}
