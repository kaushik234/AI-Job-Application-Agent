import { Injectable } from '@nestjs/common';
import { UpdateUserProfileDto, UserResponseDto } from './dto/user.dto';
import { UserNotFoundException } from './exceptions/user.exception';

@Injectable()
export class UserService {
  async getUserById(id: string): Promise<UserResponseDto> {
    if (!id) throw new UserNotFoundException(id);
    return {
      id,
      email: 'applicant@sentinel.ai',
      name: 'Kaushik Khandhala',
      createdAt: new Date().toISOString(),
    };
  }

  async updateProfile(id: string, dto: UpdateUserProfileDto): Promise<UserResponseDto> {
    return {
      id,
      email: dto.email || 'applicant@sentinel.ai',
      name: `${dto.firstName || 'Kaushik'} ${dto.lastName || 'Khandhala'}`.trim(),
      createdAt: new Date().toISOString(),
    };
  }
}
