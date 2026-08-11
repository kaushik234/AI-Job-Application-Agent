import { Injectable } from '@nestjs/common';

@Injectable()
export class SettingsValidator {
  isValidLimit(limit: number): boolean {
    return limit > 0 && limit <= 100;
  }
}
