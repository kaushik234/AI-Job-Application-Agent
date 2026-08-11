import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsArray } from 'class-validator';

export class UpdateUserProfileDto {
  @ApiProperty({ example: 'Kaushik' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Khandhala' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'kaushik@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: ['Full Stack', 'NestJS', 'React'] })
  @IsOptional()
  @IsArray()
  skills?: string[];
}

export class UserResponseDto {
  @ApiProperty({ type: String, example: 'usr_123' })
  id!: string;

  @ApiProperty({ type: String, example: 'user@example.com' })
  email!: string;

  @ApiProperty({ type: String, example: 'Kaushik Khandhala' })
  name!: string;

  @ApiProperty({ type: String, example: '2026-08-07T00:00:00.000Z' })
  createdAt!: string;
}
