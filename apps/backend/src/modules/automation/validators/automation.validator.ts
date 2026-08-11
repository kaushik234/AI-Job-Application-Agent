import { Injectable } from '@nestjs/common';

@Injectable()
export class AutomationValidator {
  isValidTaskId(taskId: string): boolean {
    return Boolean(taskId && taskId.startsWith('task_'));
  }
}
