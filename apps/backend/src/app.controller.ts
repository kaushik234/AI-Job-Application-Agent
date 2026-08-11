import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'API Root Information & Status' })
  getApiRoot() {
    return {
      name: 'SENTINEL AI - Autonomous Job Application Agent API',
      version: '1.0.0',
      status: 'online',
      docs: '/api/docs',
      health: '/api/health',
      timestamp: new Date().toISOString(),
    };
  }
}
