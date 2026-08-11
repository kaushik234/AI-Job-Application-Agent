import { Controller, Post, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Browser Simulator')
@Controller('browser')
export class BrowserController {
  @Post(':applicationId/analyze')
  @ApiOperation({ summary: 'Analyze application form fields and classify into safe, sensitive, and unknown' })
  async analyzeForm(@Param('applicationId') applicationId: string) {
    const { applicationPreparationService } = require('../../services/ApplicationPreparationService');
    const analysis = await applicationPreparationService.analyzeAutofillFields(applicationId);
    return { success: true, data: analysis };
  }

  @Post(':applicationId/autofill')
  @ApiOperation({ summary: 'Execute safe autofill for verified fields (NO automatic submission)' })
  async performAutofill(@Param('applicationId') applicationId: string) {
    const { applicationPreparationService } = require('../../services/ApplicationPreparationService');
    const result = await applicationPreparationService.performSafeAutofill(applicationId);
    return {
      success: true,
      message: 'Safe autofill fields mapped successfully. User review required before submission.',
      data: result,
    };
  }
}
