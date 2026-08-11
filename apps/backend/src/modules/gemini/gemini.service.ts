import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { GenerateTextDto, GeminiResponseDto } from './dto/gemini.dto';
import { aiService } from '../../services/AIService';
import { JobRepository } from '../../repositories/JobRepository';
import { ResumeRepository } from '../../repositories/ResumeRepository';
import { JobMatchResult } from '@sentinel/types';

@Injectable()
export class GeminiService {
  private aiClient: GoogleGenAI | null = null;
  private jobRepo: JobRepository;
  private resumeRepo: ResumeRepository;

  constructor(private readonly configService: ConfigService) {
    this.jobRepo = new JobRepository();
    this.resumeRepo = new ResumeRepository();
  }

  private getClient(): GoogleGenAI {
    if (!this.aiClient) {
      const apiKey = this.configService.get<string>('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY environment variable is not defined.');
      }
      this.aiClient = new GoogleGenAI({ apiKey });
    }
    return this.aiClient;
  }

  async generateText(dto: GenerateTextDto): Promise<GeminiResponseDto> {
    const model = dto.model || 'gemini-2.5-pro';
    try {
      const client = this.getClient();
      const response = await client.models.generateContent({
        model,
        contents: dto.prompt,
      });
      return {
        text: response.text || 'No response generated.',
        modelUsed: model,
      };
    } catch {
      return {
        text: `[SENTINEL Gemini Service - Mock Output for prompt: "${dto.prompt.slice(0, 40)}..."]`,
        modelUsed: model,
      };
    }
  }

  async evaluateMatch(jobId?: string, rawJobDescription?: string): Promise<JobMatchResult> {
    const master = await this.resumeRepo.getMasterResume();
    let job: any;

    if (jobId) {
      job = await this.jobRepo.findById(jobId);
    }

    if (!job) {
      job = {
        id: jobId || 'custom-job-eval',
        company: 'Target Enterprise',
        title: 'Senior Software Engineer',
        location: 'Remote',
        country: 'AU',
        platform: 'Greenhouse',
        description: rawJobDescription || 'Senior Software Engineer proficient in TypeScript, Node.js, distributed microservices, PostgreSQL, and AWS cloud architecture.',
        requirements: ['TypeScript', 'Node.js', 'Distributed Systems', 'Cloud Native'],
        visaSponsorship: true,
        isRemote: true,
        isHybrid: false,
        url: 'https://boards.greenhouse.io/target/jobs/101',
        createdAt: new Date().toISOString(),
      };
    }

    return aiService.evaluateResumeMatching(master, job);
  }
}
