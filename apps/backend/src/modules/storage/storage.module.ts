import { Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { StorageValidator } from './validators/storage.validator';

@Module({
  controllers: [StorageController],
  providers: [StorageService, StorageValidator],
  exports: [StorageService],
})
export class StorageModule {}
