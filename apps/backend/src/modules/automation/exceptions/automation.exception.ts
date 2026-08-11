import { NotFoundException } from '@nestjs/common';

export class AutomationTaskNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Automation task with ID ${id} not found`);
  }
}
