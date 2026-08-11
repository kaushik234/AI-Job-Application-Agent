import { Controller, Post, Get, Body, Param, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { UploadFileDto, FileMetaResponseDto } from './dto/storage.dto';
import { StorageExceptionFilter } from './filters/storage.filter';
import { StorageInterceptor } from './interceptors/storage.interceptor';

@ApiTags('Storage')
@Controller('storage')
@UseFilters(StorageExceptionFilter)
@UseInterceptors(StorageInterceptor)
export class StorageController {
  constructor(@Inject(StorageService) private readonly storageService: StorageService) {}

  @Post('files')
  @ApiOperation({ summary: 'Register uploaded file metadata' })
  @ApiResponse({ status: 201, type: FileMetaResponseDto })
  async registerFile(@Body() dto: UploadFileDto): Promise<FileMetaResponseDto> {
    return this.storageService.registerFile(dto);
  }

  @Get('files/:fileId')
  @ApiOperation({ summary: 'Get metadata for a stored file' })
  async getFileMeta(@Param('fileId') fileId: string) {
    return this.storageService.getFileMeta(fileId);
  }
}
