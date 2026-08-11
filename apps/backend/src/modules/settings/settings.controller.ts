import { Controller, Get, Put, Body, UseFilters, UseInterceptors, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto, SettingsResponseDto } from './dto/settings.dto';
import { SettingsExceptionFilter } from './filters/settings.filter';
import { SettingsInterceptor } from './interceptors/settings.interceptor';

@ApiTags('Settings')
@Controller('settings')
@UseFilters(SettingsExceptionFilter)
@UseInterceptors(SettingsInterceptor)
export class SettingsController {
  constructor(@Inject(SettingsService) private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current agent system settings' })
  @ApiResponse({ status: 200, type: SettingsResponseDto })
  async getSettings(): Promise<SettingsResponseDto> {
    return this.settingsService.getSettings();
  }

  @Put()
  @ApiOperation({ summary: 'Update agent system settings' })
  @ApiResponse({ status: 200, type: SettingsResponseDto })
  async updateSettings(@Body() dto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    return this.settingsService.updateSettings(dto);
  }
}
