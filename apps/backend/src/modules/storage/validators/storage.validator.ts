import { Injectable } from '@nestjs/common';

@Injectable()
export class StorageValidator {
  isValidFilename(filename: string): boolean {
    return Boolean(filename && filename.includes('.'));
  }
}
