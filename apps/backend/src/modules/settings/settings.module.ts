import { Module } from '@nestjs/common';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';
import { SettingsValidator } from './validators/settings.validator';

@Module({
  controllers: [SettingsController],
  providers: [SettingsService, SettingsValidator],
  exports: [SettingsService],
})
export class SettingsModule {}
