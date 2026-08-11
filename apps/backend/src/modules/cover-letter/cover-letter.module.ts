import { Module } from '@nestjs/common';
import { CoverLetterController } from './cover-letter.controller';
import { CoverLetterService } from './cover-letter.service';
import { CoverLetterValidator } from './validators/cover-letter.validator';

@Module({
  controllers: [CoverLetterController],
  providers: [CoverLetterService, CoverLetterValidator],
  exports: [CoverLetterService],
})
export class CoverLetterModule {}
