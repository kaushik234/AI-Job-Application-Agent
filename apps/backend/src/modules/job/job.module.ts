import { Module } from '@nestjs/common';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { JobValidator } from './validators/job.validator';

@Module({
  controllers: [JobController],
  providers: [JobService, JobValidator],
  exports: [JobService],
})
export class JobModule {}
