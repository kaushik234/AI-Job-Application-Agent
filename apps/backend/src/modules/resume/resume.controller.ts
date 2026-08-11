import { Controller, Get, Put, Post, Delete, Body, Param, UseFilters, UseInterceptors, Inject, UploadedFile, Res, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ResumeService } from './resume.service';
import { UpdateMasterResumeDto, TailorResumeDto } from './dto/resume.dto';
import { ResumeExceptionFilter } from './filters/resume.filter';
import { ResumeInterceptor } from './interceptors/resume.interceptor';

@ApiTags('Resume')
@Controller('resume')
@UseFilters(ResumeExceptionFilter)
@UseInterceptors(ResumeInterceptor)
export class ResumeController {
  constructor(@Inject(ResumeService) private readonly resumeService: ResumeService) {}

  @Get('master')
  @ApiOperation({ summary: 'Get current master resume' })
  async getMasterResume() {
    return this.resumeService.getMasterResume();
  }

  @Put('master')
  @ApiOperation({ summary: 'Update master resume' })
  async updateMasterResume(@Body() dto: UpdateMasterResumeDto) {
    return this.resumeService.updateMasterResume(dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload and parse a new master resume PDF or DOCX file using Gemini' })
  async uploadResume(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No resume file provided in the upload request.');
    }
    return this.resumeService.uploadResumeFile(file);
  }

  @Get('download/:id')
  @ApiOperation({ summary: 'Download resume file for target version ID or master' })
  async downloadResume(@Param('id') id: string, @Res() res: Response) {
    const file = await this.resumeService.downloadResumeFile(id);
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.filename}"`,
      'Content-Length': file.buffer.length,
    });
    res.end(file.buffer);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resume version or master resume profile' })
  async deleteResume(@Param('id') id: string) {
    return this.resumeService.deleteResume(id);
  }

  @Post('tailor')
  @ApiOperation({ summary: 'Tailor resume for specific job posting using Gemini' })
  async tailorResume(@Body() dto: TailorResumeDto) {
    return this.resumeService.tailorResume(dto);
  }

  @Get('tailored')
  @ApiOperation({ summary: 'Get all tailored resumes' })
  async getTailoredResumes() {
    return this.resumeService.getTailoredResumes();
  }

  @Get('versions')
  @ApiOperation({ summary: 'Get resume version history list' })
  async getVersions() {
    return this.resumeService.getVersions();
  }

  @Get('versions/:id')
  @ApiOperation({ summary: 'Get full resume preview payload for version ID' })
  async getVersionPreview(@Param('id') id: string) {
    return this.resumeService.getVersionPreview(id);
  }

  @Post('versions/compare')
  @ApiOperation({ summary: 'Compare two resume versions and return side-by-side diff' })
  async compareVersions(@Body() dto: { versionIdA: string; versionIdB: string }) {
    return this.resumeService.compareVersions(dto.versionIdA, dto.versionIdB);
  }

  @Post('versions/rollback')
  @ApiOperation({ summary: 'Rollback candidate master resume to a historic version snapshot' })
  async rollbackToVersion(@Body() dto: { versionId: string }) {
    return this.resumeService.rollbackToVersion(dto.versionId);
  }
}
