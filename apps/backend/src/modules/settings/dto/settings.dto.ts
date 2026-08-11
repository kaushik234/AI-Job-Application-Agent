import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsBoolean, IsArray, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({ example: 15 })
  @IsNumber()
  @IsOptional()
  dailyApplicationLimit?: number;

  @ApiProperty({ example: ['AU', 'CA', 'DE'] })
  @IsArray()
  @IsOptional()
  targetCountries?: string[];

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  requireHumanApproval?: boolean;

  @ApiProperty({ example: ['Senior Software Engineer', 'Full Stack Developer'] })
  @IsArray()
  @IsOptional()
  jobTitles?: string[];

  @ApiProperty({ example: 120000 })
  @IsNumber()
  @IsOptional()
  minimumSalary?: number;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  visaRequired?: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  @IsOptional()
  remote?: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  hybrid?: boolean;

  @ApiProperty({ example: ['TypeScript', 'NestJS', 'React'] })
  @IsArray()
  @IsOptional()
  keywords?: string[];
}

export class SettingsResponseDto {
  @ApiProperty({ type: Number, example: 15 })
  dailyApplicationLimit!: number;

  @ApiProperty({ type: [String], example: ['AU', 'CA', 'DE'] })
  targetCountries!: string[];

  @ApiProperty({ type: Boolean, example: true })
  requireHumanApproval!: boolean;

  @ApiProperty({ type: [String], example: ['Senior Software Engineer'] })
  jobTitles!: string[];

  @ApiProperty({ type: Number, example: 120000 })
  minimumSalary!: number;

  @ApiProperty({ type: Boolean, example: true })
  visaRequired!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  remote!: boolean;

  @ApiProperty({ type: Boolean, example: false })
  hybrid!: boolean;

  @ApiProperty({ type: [String], example: ['TypeScript', 'NestJS'] })
  keywords!: string[];
}
