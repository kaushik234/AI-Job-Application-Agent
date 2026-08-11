import { NotFoundException } from '@nestjs/common';

export class FileNotFoundException extends NotFoundException {
  constructor(fileId: string) {
    super(`File with ID ${fileId} not found in storage`);
  }
}
