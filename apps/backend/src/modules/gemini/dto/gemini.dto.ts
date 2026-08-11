import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateTextDto {
  @ApiProperty({ example: 'Analyze ATS keywords for Senior Software Engineer' })
  @IsString()
  @IsNotEmpty()
  prompt!: string;

  @ApiProperty({ example: 'gemini-2.5-flash', required: false })
  @IsString()
  @IsOptional()
  model?: string;
}

export class GeminiResponseDto {
  @ApiProperty({ type: String, example: 'Generated AI response text...' })
  text!: string;

  @ApiProperty({ type: String, example: 'gemini-2.5-flash' })
  modelUsed!: string;
}
