import { Injectable } from '@nestjs/common';

@Injectable()
export class QueueValidator {
  isValidJobType(type: string): boolean {
    return Boolean(type && type.length > 0);
  }
}
