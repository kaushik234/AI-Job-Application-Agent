import { BadRequestException } from '@nestjs/common';

export class InvalidSettingsException extends BadRequestException {
  constructor(reason: string) {
    super(`Invalid settings provided: ${reason}`);
  }
}
