import { Injectable } from '@nestjs/common';

@Injectable()
export class ResumeValidator {
  isValidSkillsList(skills: string[]): boolean {
    return Array.isArray(skills) && skills.length > 0;
  }
}
