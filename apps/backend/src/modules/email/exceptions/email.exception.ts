import { InternalServerErrorException } from '@nestjs/common';

export class EmailScanException extends InternalServerErrorException {
  constructor(message: string) {
    super(`Email Scan Error: ${message}`);
  }
}
