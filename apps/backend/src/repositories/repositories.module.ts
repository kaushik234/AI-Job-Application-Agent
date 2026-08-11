import { Global, Module } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { JobRepository } from './job.repository';
import { ApplicationRepository } from './application.repository';
import { ResumeRepository } from './resume.repository';
import { ResumeVersionRepository } from './resume-version.repository';
import { CoverLetterRepository } from './cover-letter.repository';
import { CompanyRepository } from './company.repository';
import { CountryRepository } from './country.repository';
import { ApplicationLogRepository } from './application-log.repository';
import { EmailLogRepository } from './email-log.repository';
import { SettingRepository } from './setting.repository';
import { QueueRepository } from './queue.repository';
import { NotificationRepository } from './notification.repository';

const repositories = [
  UserRepository,
  JobRepository,
  ApplicationRepository,
  ResumeRepository,
  ResumeVersionRepository,
  CoverLetterRepository,
  CompanyRepository,
  CountryRepository,
  ApplicationLogRepository,
  EmailLogRepository,
  SettingRepository,
  QueueRepository,
  NotificationRepository,
];

@Global()
@Module({
  providers: [...repositories],
  exports: [...repositories],
})
export class RepositoriesModule {}
