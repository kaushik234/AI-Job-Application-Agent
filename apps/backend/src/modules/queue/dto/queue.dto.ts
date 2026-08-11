import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsObject, IsOptional, IsNumber } from 'class-validator';

export class EnqueueJobDto {
  @ApiProperty({ example: 'SCRAPE_TARGET_JOBS' })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({ example: 'job_search', required: false })
  @IsString()
  @IsOptional()
  queueName?: string;

  @ApiProperty({ example: { country: 'AU', query: 'Senior Software Engineer' } })
  @IsObject()
  payload!: Record<string, any>;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  priority?: number;

  @ApiProperty({ example: 3, required: false })
  @IsNumber()
  @IsOptional()
  maxRetries?: number;
}

export class QueueJobResponseDto {
  @ApiProperty({ type: String, example: 'job_123' })
  jobId!: string;

  @ApiProperty({ type: String, example: 'job_search' })
  queueName!: string;

  @ApiProperty({ type: String, example: 'ENQUEUED' })
  status!: string;
}

export class PauseQueueDto {
  @ApiProperty({ example: 'job_search' })
  @IsString()
  @IsNotEmpty()
  queueName!: string;
}

export class ResumeQueueDto {
  @ApiProperty({ example: 'job_search' })
  @IsString()
  @IsNotEmpty()
  queueName!: string;
}

export class RetryDlqDto {
  @ApiProperty({ example: 'job_123' })
  @IsString()
  @IsNotEmpty()
  jobId!: string;
}

export class QueueControlResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Queue paused successfully' })
  message!: string;
}
