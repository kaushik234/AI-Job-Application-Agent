import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class ResumeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
