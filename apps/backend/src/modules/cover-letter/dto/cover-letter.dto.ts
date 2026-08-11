import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateCoverLetterDto {
  @ApiProperty({ example: 'job_001' })
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @ApiProperty({ example: 'Atlassian' })
  @IsString()
  companyName!: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  jobTitle!: string;
}

export class CoverLetterResponseDto {
  @ApiProperty({ type: String, example: 'cl_123' })
  id!: string;

  @ApiProperty({ type: String, example: 'job_001' })
  jobId!: string;

  @ApiProperty({ type: String, example: 'Dear Hiring Manager...' })
  content!: string;

  @ApiProperty({ type: String, example: '/storage/cover_letter_123.pdf' })
  pdfUrl!: string;
}
