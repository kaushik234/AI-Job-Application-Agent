import { Module } from '@nestjs/common';
import { ResumeController } from './resume.controller';
import { ResumeService } from './resume.service';
import { ResumeValidator } from './validators/resume.validator';

@Module({
  controllers: [ResumeController],
  providers: [ResumeService, ResumeValidator],
  exports: [ResumeService],
})
export class ResumeModule {}
