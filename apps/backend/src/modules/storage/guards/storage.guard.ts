import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class StorageGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    return true;
  }
}
