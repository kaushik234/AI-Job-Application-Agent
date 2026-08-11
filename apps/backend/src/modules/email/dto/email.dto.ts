import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { EmailCategory } from '@sentinel/types';

export class ScanEmailsDto {
  @ApiProperty({ type: Number, example: 10, required: false })
  @IsNumber()
  @IsOptional()
  maxResults?: number;

  @ApiProperty({ type: String, example: 'category:primary', required: false })
  @IsString()
  @IsOptional()
  query?: string;
}

export class ClassifyEmailDto {
  @ApiProperty({ type: String, example: 'Interview Invitation - Senior Backend Engineer' })
  @IsString()
  @IsNotEmpty()
  subject!: string;

  @ApiProperty({ type: String, example: 'We would love to invite you for a 45-minute technical screen next Tuesday.' })
  @IsString()
  @IsNotEmpty()
  body!: string;
}

export class EmailRecordDto {
  @ApiProperty({ type: String, example: 'gmail_msg_101' })
  id!: string;

  @ApiProperty({ type: String, example: 'careers@atlassian.com' })
  sender!: string;

  @ApiProperty({ type: String, example: 'Atlassian Technical Interview Invitation' })
  subject!: string;

  @ApiProperty({ type: String, example: 'Thanks for applying! We would love to schedule an interview.' })
  snippet!: string;

  @ApiProperty({ type: String, example: 'Hi Alex, Thanks for applying...' })
  fullBody!: string;

  @ApiProperty({ type: String, example: '2026-08-08T00:00:00.000Z' })
  receivedAt!: string;

  @ApiProperty({ enum: EmailCategory, enumName: 'EmailCategory', example: EmailCategory.INTERVIEW })
  classifiedCategory!: EmailCategory;

  @ApiProperty({ type: Number, example: 0.95 })
  confidenceScore!: number;

  @ApiProperty({ type: String, example: 'Atlassian', required: false })
  matchedCompany?: string;

  @ApiProperty({ type: String, example: 'Senior Backend Engineer', required: false })
  matchedJobTitle?: string;

  @ApiProperty({ type: String, example: 'app_atlassian_101', required: false })
  applicationId?: string;
}

export class ProcessEmailResultDto {
  @ApiProperty({ type: Object })
  email!: any;

  @ApiProperty({ type: Boolean, example: true })
  statusUpdated!: boolean;

  @ApiProperty({ type: String, example: 'Applied', required: false })
  previousStatus?: string;

  @ApiProperty({ type: String, example: 'Interview', required: false })
  newStatus?: string;

  @ApiProperty({ type: Boolean, example: true })
  notificationDispatched!: boolean;
}

export class EmailStatsDto {
  @ApiProperty({ type: Number, example: 12 })
  totalScanned!: number;

  @ApiProperty({ type: Number, example: 4 })
  interviewCount!: number;

  @ApiProperty({ type: Number, example: 2 })
  assessmentCount!: number;

  @ApiProperty({ type: Number, example: 1 })
  offerCount!: number;

  @ApiProperty({ type: Number, example: 3 })
  rejectionCount!: number;

  @ApiProperty({ type: Number, example: 2 })
  spamCount!: number;
}
