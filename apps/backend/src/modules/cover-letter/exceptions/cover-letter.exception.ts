import { NotFoundException } from '@nestjs/common';

export class CoverLetterNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Cover letter with ID ${id} not found`);
  }
}
