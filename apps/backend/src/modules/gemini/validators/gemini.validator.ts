import { Injectable } from '@nestjs/common';

@Injectable()
export class GeminiValidator {
  isValidPrompt(prompt: string): boolean {
    return Boolean(prompt && prompt.trim().length > 0);
  }
}
