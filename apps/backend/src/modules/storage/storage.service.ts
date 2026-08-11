import { Injectable } from '@nestjs/common';
import { UploadFileDto, FileMetaResponseDto } from './dto/storage.dto';

@Injectable()
export class StorageService {
  async registerFile(dto: UploadFileDto): Promise<FileMetaResponseDto> {
    return {
      fileId: `file_${Date.now()}`,
      path: `/uploads/${dto.folder}/${dto.filename}`,
      size: 102450,
      mimeType: 'application/pdf',
    };
  }

  async getFileMeta(fileId: string): Promise<FileMetaResponseDto> {
    return {
      fileId,
      path: `/uploads/resumes/${fileId}.pdf`,
      size: 102450,
      mimeType: 'application/pdf',
    };
  }
}
