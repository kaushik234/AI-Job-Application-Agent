import { InternalServerErrorException } from '@nestjs/common';

export class QueueExecutionException extends InternalServerErrorException {
  constructor(message: string) {
    super(`Queue Task Failure: ${message}`);
  }
}
