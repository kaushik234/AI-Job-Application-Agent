import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class AutomationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
