import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardValidator } from './validators/dashboard.validator';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, DashboardValidator],
  exports: [DashboardService],
})
export class DashboardModule {}
