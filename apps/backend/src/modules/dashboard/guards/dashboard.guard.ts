import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class DashboardGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
