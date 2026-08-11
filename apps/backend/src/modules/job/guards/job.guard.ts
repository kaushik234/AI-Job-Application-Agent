import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class JobGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
