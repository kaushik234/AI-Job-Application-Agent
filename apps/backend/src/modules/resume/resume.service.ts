import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { UpdateMasterResumeDto, TailorResumeDto } from './dto/resume.dto';
import { ResumeEngine } from '../../resume/ResumeEngine';
import { ResumeRepository } from '../../repositories/ResumeRepository';
import { PrismaService } from '../../database/prisma.service';
import { storageService } from '../../storage/StorageService';
import { geminiAIService } from '../../services/GeminiAIService';
import { MasterResume, TailoredResume, ResumeVersion, ResumeDiff, ResumeRollbackResult } from '@sentinel/types';

@Injectable()
export class ResumeService {
  private resumeEngine: ResumeEngine;
  private resumeRepo: ResumeRepository;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {
    this.resumeRepo = new ResumeRepository();
    this.resumeEngine = new ResumeEngine(this.resumeRepo);
  }

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

  async getMasterResume(): Promise<MasterResume> {
    // Read from PostgreSQL if connected
    const user = await this.getOrCreateUser();
    const resume = await this.prisma.resume.findFirst({
      where: { userId: user.id, isMaster: true, deletedAt: null },
      include: { versions: { orderBy: { createdAt: 'desc' } } },
    });

    let activeProfile: MasterResume | null = null;

    if (resume && resume.versions.length > 0) {
      try {
        const latestVersion = resume.versions[0];
        const parsed = JSON.parse(latestVersion.content);
        if (parsed && typeof parsed === 'object' && parsed.fullName && !parsed.fullName.includes('Alex Mercer')) {
          activeProfile = parsed as MasterResume;
        }
      } catch (err) {
        // Fallback to engine
      }
    }

    if (!activeProfile) {
      activeProfile = await this.resumeEngine.getMasterResume();
    }

    // Sanitize any leftover legacy demo values
    if (activeProfile.email === 'kaushik.khandala@example.com' || !activeProfile.email) {
      activeProfile.email = 'kaushikkhandalakaushik234@gmail.com';
    }
    if (activeProfile.phone === '+61 412 345 678' || !activeProfile.phone) {
      activeProfile.phone = '+91 8849170743';
    }
    if (activeProfile.location?.includes('Sydney') || !activeProfile.location) {
      activeProfile.location = 'Ahmedabad, India';
    }
    if (activeProfile.education?.[0]?.institution?.includes('University')) {
      activeProfile.education = [
        {
          institution: 'Sal Engineering & Technical Institute',
          degree: 'B.E',
          fieldOfStudy: 'Information Technology',
          graduationYear: '2022',
        },
      ];
    }
    if (activeProfile.certifications && activeProfile.certifications.length > 0 && activeProfile.certifications[0]?.includes('Certified Mobile')) {
      activeProfile.certifications = [];
    }

    // Enforce exact explicit skills
    const candidateLanguages = (activeProfile.skills?.languages || []).filter((s) => !['TypeScript', 'JavaScript', 'Kotlin', 'Swift', 'SQL'].includes(s));
    activeProfile.skills = {
      languages: candidateLanguages.length > 0 ? candidateLanguages : ['Dart'],
      frameworks: ['Flutter', 'BLoC'],
      cloudAndDevOps: ['Firebase'],
      databases: ['SQLite', 'Hive'],
      tools: ['Git', 'VSCode', 'Android Studio'],
    };

    activeProfile.explicitExperienceYears = 3.8;
    activeProfile.experienceSource = 'RESUME_EXPLICIT';

    return activeProfile;
  }

  async updateMasterResume(dto: UpdateMasterResumeDto): Promise<MasterResume> {
    const current = await this.getMasterResume();
    const updated: MasterResume = {
      ...current,
      fullName: dto.fullName || current.fullName,
      summary: dto.summary || current.summary,
      skills: {
        ...current.skills,
        languages: dto.skills || current.skills.languages,
      },
    };

    // Save to PostgreSQL
    const user = await this.getOrCreateUser();
    
    // Split name
    const nameParts = (dto.fullName || current.fullName).split(' ');
    const firstName = nameParts[0] || 'Kaushik';
    const lastName = nameParts.slice(1).join(' ') || 'Khandhala';

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        skills: dto.skills || current.skills.languages,
      },
    });

    const existingResume = await this.prisma.resume.findFirst({
      where: { userId: user.id, isMaster: true, deletedAt: null },
    });

    if (existingResume) {
      const updatedResume = await this.prisma.resume.update({
        where: { id: existingResume.id },
        data: {
          fullName: dto.fullName || current.fullName,
          summary: dto.summary || current.summary,
          skills: dto.skills || current.skills.languages,
        },
      });

      await this.prisma.resumeVersion.create({
        data: {
          resumeId: updatedResume.id,
          versionName: `Form Update - ${new Date().toLocaleDateString()}`,
          content: JSON.stringify(updated),
        },
      });
    }

    return this.resumeEngine.updateMasterResume(updated);
  }

  async uploadResumeFile(file: { originalname: string; buffer: Buffer; mimetype: string }): Promise<MasterResume> {
    const { logger } = await import('@sentinel/shared');
    logger.info('RESUME_GEN', `[Audit] Starting upload and parse sequence for file: ${file.originalname}`);

    if (!file.buffer || file.buffer.length === 0) {
      logger.error('RESUME_GEN', '[Audit] Empty file buffer detected during upload');
      throw new Error('Invalid file upload. Buffer is empty.');
    }

    const user = await this.getOrCreateUser();
    logger.info('RESUME_GEN', `[Audit] Synced PostgreSQL user ID: ${user.id} for master resume update`);

    // 1. Upload file using StorageService
    let storageRes;
    try {
      storageRes = await storageService.uploadUserResume(file.originalname, file.buffer, file.mimetype);
      logger.info('RESUME_GEN', `[Audit] Storage uploaded successfully. Path: ${storageRes.path}`);
    } catch (storageErr: any) {
      logger.error('RESUME_GEN', `[Audit] File storage upload failed: ${storageErr.message}`);
      throw new Error(`Failed to store uploaded resume file: ${storageErr.message}`);
    }

    // 2. Parse file using Gemini with Master Resume fallback
    let parsed: MasterResume;
    try {
      logger.info('RESUME_GEN', '[Audit] Dispatching resume to Gemini parsing engine...');
      parsed = await geminiAIService.parseResumeFile(file.buffer, file.mimetype, file.originalname);
      logger.info('RESUME_GEN', `[Audit] Gemini resume parsing successful for: ${parsed.fullName}`);
    } catch (parseErr: any) {
      logger.warn('RESUME_GEN', `[Audit] Gemini parsing failed: ${parseErr.message}. Utilizing Master Resume profile fallback.`);
      parsed = await this.resumeEngine.getMasterResume();
    }

    // Defensive skills checks & fallback mapping
    if (!parsed.skills) {
      parsed.skills = {
        languages: [],
        frameworks: [],
        cloudAndDevOps: [],
        databases: [],
        tools: [],
      };
    } else {
      parsed.skills.languages = parsed.skills.languages || [];
      parsed.skills.frameworks = parsed.skills.frameworks || [];
      parsed.skills.cloudAndDevOps = parsed.skills.cloudAndDevOps || [];
      parsed.skills.databases = parsed.skills.databases || [];
      parsed.skills.tools = parsed.skills.tools || [];
    }

    parsed.portfolio = parsed.portfolio || '';
    parsed.github = parsed.github || '';
    parsed.linkedIn = parsed.linkedIn || '';
    parsed.certifications = parsed.certifications || [];
    parsed.projects = parsed.projects || [];
    parsed.experience = parsed.experience || [];
    parsed.education = parsed.education || [];

    logger.info('RESUME_GEN', `[RESUME_DEBUG] extractedProfile: ${parsed.fullName} (${parsed.email}, ${parsed.phone}, ${parsed.location})`);
    logger.info('RESUME_GEN', `[RESUME_DEBUG] normalizedProfile skills: ${JSON.stringify(parsed.skills)}`);
    logger.info('RESUME_GEN', `[RESUME_DEBUG] databaseWrite target user ID: ${user.id}`);

    // 3. Update User Profile in PostgreSQL
    const nameParts = (parsed.fullName || 'Kaushik Khandhala').split(' ');
    const firstName = nameParts[0] || 'Kaushik';
    const lastName = nameParts.slice(1).join(' ') || 'Khandhala';

    const flattenedSkills = Array.from(
      new Set([
        ...parsed.skills.languages,
        ...parsed.skills.frameworks,
        ...parsed.skills.cloudAndDevOps,
        ...parsed.skills.databases,
        ...parsed.skills.tools,
      ])
    );

    try {
      logger.info('RESUME_GEN', '[Audit] Persisting user skills updates and master resume record in PostgreSQL transaction...');
      await this.prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: user.id },
          data: {
            firstName,
            lastName,
            skills: flattenedSkills,
          },
        });

        // 4. Soft-delete previous Master Resumes in PostgreSQL
        await tx.resume.updateMany({
          where: { userId: user.id, isMaster: true, deletedAt: null },
          data: { deletedAt: new Date() },
        });

        // 5. Create new Master Resume in PostgreSQL
        const dbResume = await tx.resume.create({
          data: {
            userId: user.id,
            title: file.originalname,
            fullName: parsed.fullName || 'Kaushik Khandhala',
            headline: parsed.experience[0]?.role || 'Software Engineer',
            summary: parsed.summary || 'Senior Software Engineer',
            skills: flattenedSkills,
            isMaster: true,
            pdfPath: storageRes.path,
          },
        });

        // 6. Save Resume Version
        await tx.resumeVersion.create({
          data: {
            resumeId: dbResume.id,
            versionName: `Master Upload: ${file.originalname}`,
            content: JSON.stringify(parsed),
            pdfUrl: storageRes.path,
          },
        });
      });

      logger.info('RESUME_GEN', '[Audit] PostgreSQL persistence complete. Synchronized relational database.');
    } catch (dbErr: any) {
      logger.error('RESUME_GEN', `[Audit] PostgreSQL database persistence failed: ${dbErr.message}`);
      throw new Error(`Failed to save resume record to PostgreSQL database: ${dbErr.message}`);
    }

    // 7. Save to local JSON-resilient file DB
    try {
      await this.resumeEngine.updateMasterResume(parsed);
      logger.info('RESUME_GEN', '[Audit] Updated master resume copy in local resilient JSON-file backup database.');
    } catch (backupErr: any) {
      logger.warn('RESUME_GEN', `[Audit] Local backup db update failed (non-blocking): ${backupErr.message}`);
    }

    return parsed;
  }

  async downloadResumeFile(id: string): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const user = await this.getOrCreateUser();
    let pathTarget = '';
    let nameTarget = 'resume.pdf';

    if (id === 'master') {
      const resume = await this.prisma.resume.findFirst({
        where: { userId: user.id, isMaster: true, deletedAt: null },
      });
      if (!resume || !resume.pdfPath) {
        throw new NotFoundException('Master resume PDF file not found.');
      }
      pathTarget = resume.pdfPath;
      nameTarget = resume.title || 'resume.pdf';
    } else {
      const version = await this.prisma.resumeVersion.findFirst({
        where: { id, deletedAt: null },
        include: { resume: true },
      });
      if (!version || !version.pdfUrl) {
        throw new NotFoundException('Resume version PDF file not found.');
      }
      pathTarget = version.pdfUrl;
      nameTarget = `${version.resume.title}_${version.versionName}.pdf`;
    }

    const buffer = await storageService.downloadFile('resume-uploads', pathTarget);
    const mimeType = pathTarget.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf';

    return {
      buffer,
      filename: nameTarget,
      mimeType,
    };
  }

  async deleteResume(id: string): Promise<boolean> {
    const user = await this.getOrCreateUser();
    if (id === 'master') {
      await this.prisma.resume.updateMany({
        where: { userId: user.id, isMaster: true, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    } else {
      await this.prisma.resume.updateMany({
        where: { id, userId: user.id },
        data: { deletedAt: new Date() },
      });
    }
    return true;
  }

  async tailorResume(dto: TailorResumeDto): Promise<ResumeVersion> {
    const { tailoredResumeService } = require('../../services/TailoredResumeService');
    const result = await tailoredResumeService.generateTailoredResume(dto.jobId);
    
    // Return structured resume version record
    return {
      id: result.tailoredResume.id,
      versionTag: `v${result.version}`,
      jobId: result.tailoredResume.jobId,
      jobTitle: result.tailoredResume.jobTitle,
      company: result.tailoredResume.company,
      changeDescription: `Tailored resume v${result.version} generated for ${result.tailoredResume.jobTitle} at ${result.tailoredResume.company}`,
      masterSnapshot: await this.getMasterResume(),
      tailoredPayload: result.tailoredResume,
      formats: {
        pdfDataUrl: result.tailoredResume.pdfStoragePath,
        docxBase64: '',
        jsonRepresentation: result.structured,
      },
      createdAt: result.tailoredResume.generatedAt,
    };
  }

  async getVersions(jobId?: string): Promise<ResumeVersion[]> {
    const user = await this.getOrCreateUser();
    const resume = await this.prisma.resume.findFirst({
      where: { userId: user.id, isMaster: true, deletedAt: null },
    });

    if (resume) {
      const dbVersions = await this.prisma.resumeVersion.findMany({
        where: { resumeId: resume.id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      return dbVersions.map((v) => {
        let masterSnapshot: any = {};
        try {
          masterSnapshot = JSON.parse(v.content);
        } catch {
          // Ignored
        }
        return {
          id: v.id,
          versionTag: v.versionName,
          jobId: v.tailoredForJobId || undefined,
          changeDescription: `Version generated for ${v.versionName}`,
          masterSnapshot,
          formats: {
            pdfDataUrl: v.pdfUrl || '',
            docxBase64: '',
            jsonRepresentation: masterSnapshot,
          },
          createdAt: v.createdAt.toISOString(),
        } as any;
      });
    }

    return this.resumeEngine.getVersionHistory(jobId);
  }

  async getVersionPreview(versionId: string) {
    return this.resumeEngine.getResumePreview(versionId);
  }

  async compareVersions(versionIdA: string, versionIdB: string): Promise<ResumeDiff> {
    return this.resumeEngine.compareVersions(versionIdA, versionIdB);
  }

  async rollbackToVersion(versionId: string): Promise<ResumeRollbackResult> {
    return this.resumeEngine.rollbackToVersion(versionId);
  }

  async getTailoredResumes(): Promise<TailoredResume[]> {
    return this.resumeRepo.findAllTailoredResumes();
  }
}
