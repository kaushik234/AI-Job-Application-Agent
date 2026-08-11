import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum } from 'class-validator';

export enum ATSPlatform {
  GREENHOUSE = 'Greenhouse',
  LEVER = 'Lever',
  ASHBY = 'Ashby',
  WORKABLE = 'Workable',
  GENERIC = 'Generic',
}

export class TriggerAutomationDto {
  @ApiProperty({ example: 'job_001' })
  @IsString()
  @IsNotEmpty()
  jobId!: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  requireHumanApproval?: boolean;

  @ApiProperty({ enum: ATSPlatform, example: ATSPlatform.GREENHOUSE, required: false })
  @IsEnum(ATSPlatform)
  @IsOptional()
  platform?: ATSPlatform;

  @ApiProperty({ example: 'https://boards.greenhouse.io/example/jobs/101', required: false })
  @IsString()
  @IsOptional()
  targetUrl?: string;
}

export class ApproveSubmissionDto {
  @ApiProperty({ example: 'job_001' })
  @IsString()
  @IsNotEmpty()
  jobId!: string;
}

export class ResumeCaptchaDto {
  @ApiProperty({ example: 'job_001' })
  @IsString()
  @IsNotEmpty()
  jobId!: string;
}

export class AutomationTaskStatusDto {
  @ApiProperty({ type: String, example: 'task_123' })
  taskId!: string;

  @ApiProperty({ type: String, example: 'APPLYING' })
  status!: string;

  @ApiProperty({ type: String, example: 'Greenhouse form auto-fill in progress' })
  step!: string;

  @ApiProperty({ type: [String], example: ['Submitted initial form step', 'Uploaded resume'] })
  logs!: string[];

  @ApiProperty({ type: Boolean, example: false, required: false })
  captchaPaused?: boolean;

  @ApiProperty({ type: Boolean, example: false, required: false })
  approvalPaused?: boolean;

  @ApiProperty({ type: [String], example: ['data/screenshots/app_101.png'], required: false })
  screenshots?: string[];

  @ApiProperty({ type: String, example: 'data/browser_videos/video_101.webm', required: false })
  videoPath?: string;
}
