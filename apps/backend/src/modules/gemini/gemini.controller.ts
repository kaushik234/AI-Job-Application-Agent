import { Controller, Post, Body, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GeminiService } from './gemini.service';
import { GenerateTextDto, GeminiResponseDto } from './dto/gemini.dto';
import { GeminiExceptionFilter } from './filters/gemini.filter';
import { GeminiInterceptor } from './interceptors/gemini.interceptor';

@ApiTags('Gemini')
@Controller('gemini')
@UseFilters(GeminiExceptionFilter)
@UseInterceptors(GeminiInterceptor)
export class GeminiController {
  constructor(@Inject(GeminiService) private readonly geminiService: GeminiService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generate text content using Gemini 2.5 Pro API' })
  @ApiResponse({ status: 200, type: GeminiResponseDto })
  async generateText(@Body() dto: GenerateTextDto): Promise<GeminiResponseDto> {
    return this.geminiService.generateText(dto);
  }

  @Post('match')
  @ApiOperation({ summary: 'Evaluate candidate match against job description using Gemini 2.5 Pro' })
  async evaluateMatch(@Body() dto: { jobId?: string; jobDescription?: string }) {
    return this.geminiService.evaluateMatch(dto.jobId, dto.jobDescription);
  }
}
