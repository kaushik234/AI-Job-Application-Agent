import { Injectable } from '@nestjs/common';

@Injectable()
export class CoverLetterValidator {
  isValidJobId(jobId: string): boolean {
    return Boolean(jobId && jobId.length > 0);
  }
}
