import { Controller, Post, Get, Body, Param, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { CoverLetterService } from './cover-letter.service';
import { GenerateCoverLetterDto, CoverLetterResponseDto } from './dto/cover-letter.dto';
import { CoverLetterExceptionFilter } from './filters/cover-letter.filter';
import { CoverLetterInterceptor } from './interceptors/cover-letter.interceptor';

@ApiTags('CoverLetter')
@Controller('cover-letter')
@UseFilters(CoverLetterExceptionFilter)
@UseInterceptors(CoverLetterInterceptor)
export class CoverLetterController {
  constructor(@Inject(CoverLetterService) private readonly coverLetterService: CoverLetterService) {}

  @Get()
  @ApiOperation({ summary: 'Get all cover letters (defaults to history list)' })
  async getAllCoverLetters() {
    return this.coverLetterService.getHistory();
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate personalized, single-page cover letter (PDF/DOCX/JSON)' })
  async generateCoverLetter(@Body() dto: GenerateCoverLetterDto) {
    return this.coverLetterService.generateCoverLetter(dto);
  }

  @Get('versions')
  @ApiOperation({ summary: 'Get cover letter version history list' })
  async getHistory() {
    return this.coverLetterService.getHistory();
  }

  @Get('versions/:id')
  @ApiOperation({ summary: 'Get cover letter preview for version ID' })
  async getPreview(@Param('id') versionId: string) {
    return this.coverLetterService.getPreview(versionId);
  }

  @Post('versions/compare')
  @ApiOperation({ summary: 'Compare two cover letter versions and return paragraph/tech stack diff' })
  async compareVersions(@Body() dto: { versionIdA: string; versionIdB: string }) {
    return this.coverLetterService.compareVersions(dto.versionIdA, dto.versionIdB);
  }

  @Post('versions/rollback')
  @ApiOperation({ summary: 'Rollback cover letter to a historic version' })
  async rollbackToVersion(@Body() dto: { versionId: string }) {
    return this.coverLetterService.rollbackToVersion(dto.versionId);
  }
}
