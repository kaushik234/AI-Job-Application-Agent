import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsBoolean, IsArray, IsNumber } from 'class-validator';

export enum TargetCountry {
  AU = 'AU',
  CA = 'CA',
  DE = 'DE',
}

export class ScrapeJobsDto {
  @ApiProperty({ required: false, example: 'Flutter Developer' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiProperty({ required: false, example: 'Flutter Developer' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiProperty({ required: false, example: 'ALL' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiProperty({ type: [String], required: false, example: ['AU', 'CA', 'DE'] })
  @IsOptional()
  @IsArray()
  countries?: string[];

  @ApiProperty({ required: false, example: true })
  @IsOptional()
  @IsBoolean()
  visaOnly?: boolean;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  remoteOnly?: boolean;

  @ApiProperty({ required: false, example: 100000 })
  @IsOptional()
  @IsNumber()
  minSalary?: number;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  keywords?: string[];
}

export class JobResponseDto {
  @ApiProperty({ type: String, example: 'job_123' })
  id!: string;

  @ApiProperty({ type: String, example: 'Senior Software Engineer' })
  title!: string;

  @ApiProperty({ type: String, example: 'Sentinel AI Corp' })
  company!: string;

  @ApiProperty({ type: String, example: 'Sydney, AU' })
  location!: string;

  @ApiProperty({ type: String, example: 'AU' })
  country!: string;

  @ApiProperty({ type: String, example: 'https://example.com/jobs/123' })
  url!: string;

  @ApiProperty({ type: String, example: 'LinkedIn' })
  platform!: string;

  @ApiProperty({ type: String, required: false })
  description?: string;

  @ApiProperty({ type: [String], required: false })
  requirements?: string[];

  @ApiProperty({ type: Boolean, required: false })
  visaSponsorship?: boolean;

  @ApiProperty({ type: Boolean, required: false })
  isRemote?: boolean;

  @ApiProperty({ type: String, required: false })
  postedDate?: string;

  @ApiProperty({ type: String, required: false })
  salaryText?: string;

  @ApiProperty({ type: Number, required: false })
  matchScore?: number;

  @ApiProperty({ type: String, required: false })
  applicationPriority?: string;

  @ApiProperty({ type: String, required: false })
  recommendation?: string;

  @ApiProperty({ type: String, required: false })
  visaStatus?: string;

  @ApiProperty({ type: Object, required: false })
  ranking?: any;

  @ApiProperty({ type: Object, required: false })
  evaluation?: any;
}
