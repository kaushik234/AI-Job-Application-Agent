import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class QueueGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
