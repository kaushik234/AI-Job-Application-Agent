import { Module } from '@nestjs/common';
import { AutomationController } from './automation.controller';
import { ApplicationsController } from './application.controller';
import { BrowserController } from './browser.controller';
import { AutomationService } from './automation.service';
import { AutomationValidator } from './validators/automation.validator';

@Module({
  controllers: [AutomationController, ApplicationsController, BrowserController],
  providers: [AutomationService, AutomationValidator],
  exports: [AutomationService],
})
export class AutomationModule {}
