import { InternalServerErrorException } from '@nestjs/common';

export class DashboardComputeException extends InternalServerErrorException {
  constructor(message: string) {
    super(`Dashboard metrics computation error: ${message}`);
  }
}
