import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(@Inject(HealthService) private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'System health check and database connection diagnostic' })
  @ApiResponse({ status: 200, description: 'Health status response' })
  async checkHealth() {
    try {
      return await this.healthService.checkHealth();
    } catch (err: any) {
      return {
        status: 'degraded',
        timestamp: new Date().toISOString(),
        error: err.message,
      };
    }
  }
}
