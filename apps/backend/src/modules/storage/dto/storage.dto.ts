import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UploadFileDto {
  @ApiProperty({ example: 'tailored_resume.pdf' })
  @IsString()
  @IsNotEmpty()
  filename!: string;

  @ApiProperty({ example: 'resumes' })
  @IsString()
  folder!: string;
}

export class FileMetaResponseDto {
  @ApiProperty({ type: String, example: 'file_123' })
  fileId!: string;

  @ApiProperty({ type: String, example: '/storage/resumes/file_123.pdf' })
  path!: string;

  @ApiProperty({ type: Number, example: 102400 })
  size!: number;

  @ApiProperty({ type: String, example: 'application/pdf' })
  mimeType!: string;
}
