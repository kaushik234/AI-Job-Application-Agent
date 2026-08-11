import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class EmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
