import { Injectable } from '@nestjs/common';

@Injectable()
export class DashboardValidator {
  isValidStats(): boolean {
    return true;
  }
}
