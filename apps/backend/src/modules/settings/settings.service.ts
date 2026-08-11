import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { UpdateSettingsDto, SettingsResponseDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private async getOrCreateUser() {
    let user = await this.prisma.user.findFirst({
      where: { email: 'khandhalakaushik234@gmail.com' },
    });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: 'khandhalakaushik234@gmail.com',
          firstName: 'Kaushik',
          lastName: 'Khandhala',
          role: 'APPLICANT',
          skills: [],
        },
      });
    }
    return user;
  }

  async getSettings(): Promise<SettingsResponseDto> {
    const user = await this.getOrCreateUser();
    let setting = await this.prisma.setting.findUnique({
      where: { userId: user.id },
    });

    if (!setting) {
      setting = await this.prisma.setting.create({
        data: {
          userId: user.id,
          dailyApplicationLimit: 15,
          targetCountries: ['AU', 'CA', 'DE'],
          jobTitles: ['Senior Software Engineer'],
          minimumSalary: 120000,
          visaRequired: false,
          remote: false,
          hybrid: false,
          keywords: ['TypeScript', 'NestJS'],
          requireHumanApproval: true,
          autoPilotEnabled: true,
        },
      });
    }

    return {
      dailyApplicationLimit: setting.dailyApplicationLimit,
      targetCountries: setting.targetCountries,
      requireHumanApproval: setting.requireHumanApproval,
      jobTitles: setting.jobTitles,
      minimumSalary: setting.minimumSalary,
      visaRequired: setting.visaRequired,
      remote: setting.remote,
      hybrid: setting.hybrid,
      keywords: setting.keywords,
    };
  }

  async updateSettings(dto: UpdateSettingsDto): Promise<SettingsResponseDto> {
    const user = await this.getOrCreateUser();
    
    // Find or create setting
    let setting = await this.prisma.setting.findUnique({
      where: { userId: user.id },
    });

    if (!setting) {
      setting = await this.prisma.setting.create({
        data: {
          userId: user.id,
          dailyApplicationLimit: dto.dailyApplicationLimit ?? 15,
          targetCountries: dto.targetCountries ?? ['AU', 'CA', 'DE'],
          jobTitles: dto.jobTitles ?? ['Senior Software Engineer'],
          minimumSalary: dto.minimumSalary ?? 120000,
          visaRequired: dto.visaRequired ?? false,
          remote: dto.remote ?? false,
          hybrid: dto.hybrid ?? false,
          keywords: dto.keywords ?? ['TypeScript', 'NestJS'],
          requireHumanApproval: dto.requireHumanApproval ?? true,
          autoPilotEnabled: true,
        },
      });
    } else {
      setting = await this.prisma.setting.update({
        where: { userId: user.id },
        data: {
          dailyApplicationLimit: dto.dailyApplicationLimit !== undefined ? dto.dailyApplicationLimit : setting.dailyApplicationLimit,
          targetCountries: dto.targetCountries !== undefined ? dto.targetCountries : setting.targetCountries,
          requireHumanApproval: dto.requireHumanApproval !== undefined ? dto.requireHumanApproval : setting.requireHumanApproval,
          jobTitles: dto.jobTitles !== undefined ? dto.jobTitles : setting.jobTitles,
          minimumSalary: dto.minimumSalary !== undefined ? dto.minimumSalary : setting.minimumSalary,
          visaRequired: dto.visaRequired !== undefined ? dto.visaRequired : setting.visaRequired,
          remote: dto.remote !== undefined ? dto.remote : setting.remote,
          hybrid: dto.hybrid !== undefined ? dto.hybrid : setting.hybrid,
          keywords: dto.keywords !== undefined ? dto.keywords : setting.keywords,
        },
      });
    }

    return {
      dailyApplicationLimit: setting.dailyApplicationLimit,
      targetCountries: setting.targetCountries,
      requireHumanApproval: setting.requireHumanApproval,
      jobTitles: setting.jobTitles,
      minimumSalary: setting.minimumSalary,
      visaRequired: setting.visaRequired,
      remote: setting.remote,
      hybrid: setting.hybrid,
      keywords: setting.keywords,
    };
  }
}
