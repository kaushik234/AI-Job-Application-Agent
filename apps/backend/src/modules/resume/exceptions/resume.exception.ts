import { NotFoundException } from '@nestjs/common';

export class ResumeNotFoundException extends NotFoundException {
  constructor(resumeId: string) {
    super(`Resume with ID ${resumeId} not found`);
  }
}
