import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class UpdateMasterResumeDto {
  @ApiProperty({ example: 'Kaushik Khandhala' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  headline!: string;

  @ApiProperty({ example: ['TypeScript', 'NestJS', 'React', 'Docker'] })
  @IsArray()
  skills!: string[];

  @ApiProperty({ example: 'Over 6 years of building scalable distributed systems' })
  @IsString()
  summary!: string;
}

export class TailorResumeDto {
  @ApiProperty({ example: 'job_001' })
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @ApiProperty({ example: 'Senior Full Stack Engineer position at Atlassian' })
  @IsString()
  jobDescription!: string;
}
