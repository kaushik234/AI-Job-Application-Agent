import { Module } from '@nestjs/common';
import { EmailController } from './email.controller';
import { EmailService } from './email.service';
import { EmailValidator } from './validators/email.validator';

@Module({
  controllers: [EmailController],
  providers: [EmailService, EmailValidator],
  exports: [EmailService],
})
export class EmailModule {}
