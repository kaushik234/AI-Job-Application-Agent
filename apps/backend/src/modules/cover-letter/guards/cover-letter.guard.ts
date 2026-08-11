import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class CoverLetterGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
