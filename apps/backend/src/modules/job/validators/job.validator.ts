import { Injectable } from '@nestjs/common';

@Injectable()
export class JobValidator {
  isValidJobUrl(url: string): boolean {
    return /^https?:\/\//.test(url);
  }
}
