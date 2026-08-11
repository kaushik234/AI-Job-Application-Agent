import { InternalServerErrorException } from '@nestjs/common';

export class GeminiApiException extends InternalServerErrorException {
  constructor(message: string) {
    super(`Gemini API Error: ${message}`);
  }
}
