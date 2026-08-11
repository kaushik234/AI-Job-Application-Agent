import { Module } from '@nestjs/common';
import { GeminiController } from './gemini.controller';
import { GeminiService } from './gemini.service';
import { GeminiValidator } from './validators/gemini.validator';

@Module({
  controllers: [GeminiController],
  providers: [GeminiService, GeminiValidator],
  exports: [GeminiService],
})
export class GeminiModule {}
