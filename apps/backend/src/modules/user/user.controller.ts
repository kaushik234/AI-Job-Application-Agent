import { Controller, Get, Put, Body, Param, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserProfileDto, UserResponseDto } from './dto/user.dto';
import { UserNotFoundFilter } from './filters/user.filter';
import { UserInterceptor } from './interceptors/user.interceptor';

@ApiTags('Users')
@Controller('users')
@UseFilters(UserNotFoundFilter)
@UseInterceptors(UserInterceptor)
export class UserController {
  constructor(@Inject(UserService) private readonly userService: UserService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  async getUser(@Param('id') id: string): Promise<UserResponseDto> {
    return this.userService.getUserById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(@Param('id') id: string, @Body() dto: UpdateUserProfileDto) {
    return this.userService.updateProfile(id, dto);
  }
}
