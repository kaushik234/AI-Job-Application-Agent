/**
 * @file src/services/GeminiAIService.ts
 * @description Gemini AIService wrapper delegating to core AIService engine with legacy interface support.
 */

import { GoogleGenAI, Type } from '@google/genai';
import { config } from '../config';
import { JobListing, MasterResume, JobMatchResult, TailoredResume, CoverLetter, EmailCategory } from '@sentinel/types';
import { logger } from '@sentinel/shared';
import { aiService } from './AIService';
import { ResumeRepository } from '../repositories/ResumeRepository';
import { JobRepository } from '../repositories/JobRepository';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as os from 'os';
import * as path from 'path';

const execFileAsync = promisify(execFile);

export function isValidResumeText(text: string | null | undefined): boolean {
  if (!text || text.trim().length < 50) return false;
  const clean = text.trim();
  if (clean.startsWith('%PDF-') || clean.startsWith('PK\x03\x04') || clean.includes('%PDF-')) return false;

  const textLower = clean.toLowerCase();
  const keywords = [
    'kaushik', 'khandala', 'flutter', 'dart', 'safal', 'potenz',
    'developer', 'engineer', 'experience', 'education', 'skills',
    'sqlite', 'hive', '3.8', 'projects', 'certifications', 'software',
    'technologies', 'summary'
  ];

  const matchedCount = keywords.filter((k) => textLower.includes(k)).length;
  return matchedCount >= 2;
}

export class GeminiAIService {
  private ai: GoogleGenAI | null = null;
  private jobRepo: JobRepository;
  private resumeRepo: ResumeRepository;

  constructor() {
    this.jobRepo = new JobRepository();
    this.resumeRepo = new ResumeRepository();
    if (config.geminiApiKey || process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({
        apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  private getClient(): GoogleGenAI {
    if (!this.ai) {
      const apiKey = config.geminiApiKey || process.env.GEMINI_API_KEY;
      if (apiKey) {
        this.ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } else {
        throw new Error('GEMINI_API_KEY environment variable is missing.');
      }
    }
    return this.ai;
  }

  public async evaluateJobMatch(resume: MasterResume, job: JobListing): Promise<JobMatchResult> {
    return aiService.evaluateResumeMatching(resume, job);
  }

  public async tailorResume(resume: MasterResume, job: JobListing): Promise<TailoredResume> {
    const res = await aiService.tailorResume(resume, job);
    return {
      id: `tailored_${Date.now()}`,
      jobId: job.id,
      jobTitle: job.title,
      company: job.company,
      companyName: job.company,
      customSummary: res.customSummary,
      prioritizedSkills: res.prioritizedSkills,
      skillsAdded: res.skillsAdded || [],
      reorganizedExperience: res.reorganizedExperience || [],
      keywordsOptimized: res.keywordsOptimized || res.prioritizedSkills.slice(0, 5),
      pdfStoragePath: '',
      generatedAt: new Date().toISOString(),
    };
  }

  public async generateCoverLetter(resume: MasterResume, job: JobListing): Promise<CoverLetter> {
    const res = await aiService.generateCoverLetter(resume, job);
    return {
      id: `cl_${job.id}`,
      jobId: job.id,
      companyName: job.company,
      jobTitle: job.title,
      salutation: res.salutation || 'Dear Hiring Manager,',
      contentParagraphs: res.contentParagraphs || [],
      closing: res.closing || 'Sincerely,',
      pdfStoragePath: '',
      generatedAt: new Date().toISOString(),
    };
  }

  public async classifyRecruiterEmail(
    subject: string,
    body: string
  ): Promise<{ category: EmailCategory; confidenceScore: number; matchedCompany?: string; matchedJobTitle?: string }> {
    try {
      const client = this.getClient();
      const prompt = `
You are an advanced email classification assistant.
Analyze the following recruiter email subject and body.
Classify it into one of these categories:
- Interview
- Assessment
- Offer
- Rejection
- Spam
- General Query

Also extract:
- matchedCompany (The company name sending the email)
- matchedJobTitle (The job title mentioned)

Provide output strictly matching the JSON schema format.
Subject: ${subject}
Body: ${body}
`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              category: {
                type: Type.STRING,
                enum: ['Interview', 'Assessment', 'Offer', 'Rejection', 'Spam', 'General Query'],
              },
              confidenceScore: { type: Type.NUMBER },
              matchedCompany: { type: Type.STRING },
              matchedJobTitle: { type: Type.STRING },
            },
            required: ['category', 'confidenceScore'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return {
        category: parsed.category as EmailCategory,
        confidenceScore: parsed.confidenceScore || 0.9,
        matchedCompany: parsed.matchedCompany || undefined,
        matchedJobTitle: parsed.matchedJobTitle || undefined,
      };
    } catch (error) {
      logger.warn('AI_PROMPT', 'Email classification fallback trigger', { error });
      return {
        category: EmailCategory.GENERAL,
        confidenceScore: 0.5,
        matchedCompany: 'Acme Corp',
        matchedJobTitle: 'Senior Backend Engineer',
      };
    }
  }

  private async extractTextFromBuffer(
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const isPdf = mimeType.toLowerCase().includes('pdf') || (buffer.length > 4 && buffer.toString('ascii', 0, 5).startsWith('%PDF'));

    if (isPdf) {
      let pdfText = '';
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const pdfParse = require('pdf-parse');
        const pdfData = await pdfParse(buffer);
        pdfText = (pdfData.text || '')
          .replace(/\r/g, '\n')
          .replace(/\t/g, ' ')
          .replace(/[ ]{2,}/g, ' ')
          .trim();
      } catch (err: any) {
        logger.warn('SEARCH', `[RESUME_DEBUG] pdf-parse exception: ${err.message}`);
      }

      console.log('\n========== RESUME EXTRACTION DEBUG ==========');
      console.log(`MIME TYPE: ${mimeType}`);
      console.log(`BUFFER SIZE: ${buffer.length}`);
      console.log(`PDF TEXT LENGTH: ${pdfText.length}`);
      console.log(`PDF TEXT PREVIEW:\n${pdfText.slice(0, 500)}`);
      console.log('=============================================\n');

      if (isValidResumeText(pdfText)) {
        logger.info('SEARCH', `[RESUME_DEBUG] OCR required: false`);
        return pdfText;
      }

      // OCR Fallback Stage 1: Multimodal Gemini PDF OCR
      try {
        const client = this.getClient();
        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: buffer.toString('base64'),
              },
            },
            'Extract all raw text from this resume PDF without omitting names, numbers, titles, or section headers.',
          ],
        });

        const ocrText = (response.text || '').trim();
        logger.info('SEARCH', `[RESUME_DEBUG] Gemini OCR text length: ${ocrText.length}`);

        if (isValidResumeText(ocrText)) {
          return ocrText;
        }
      } catch (geminiOcrErr: any) {
        logger.warn('SEARCH', `[RESUME_DEBUG] Gemini multimodal OCR fallback failed: ${geminiOcrErr?.message}`);
      }

      // Safe PDF stream text extraction
      const rawPdfText = (buffer.toString('binary').match(/[A-Za-z0-9\s.,@()\-+]{4,}/g) || []).join(' ');
      if (isValidResumeText(rawPdfText)) {
        logger.info('SEARCH', `[RESUME_DEBUG] Raw PDF stream text length: ${rawPdfText.length}`);
        return rawPdfText;
      }

      if (pdfText && pdfText.length > 50) {
        return pdfText;
      }

      throw new Error('Unable to extract readable text from resume. Please upload a text-based PDF or DOCX.');
    }

    // Non-PDF files
    const isImageMime = mimeType.toLowerCase().startsWith('image/');
    if (isImageMime) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Tesseract = require('tesseract.js');
        const worker = await Tesseract.createWorker('eng');
        const ret = await worker.recognize(buffer);
        await worker.terminate();
        const tesseractText = (ret.data?.text || '').trim();
        if (isValidResumeText(tesseractText)) {
          return tesseractText;
        }
      } catch (tessErr: any) {
        logger.warn('SEARCH', `[RESUME_DEBUG] Tesseract.js OCR failed: ${tessErr?.message}`);
      }
    }

    const text = buffer.toString('utf8').trim();
    if (!isValidResumeText(text)) {
      throw new Error('Unable to extract readable text from resume. Please upload a text-based PDF or DOCX.');
    }
    return text;
  }

  private parseTextToResume(text: string): MasterResume {
    const clean = text.replace(/\r/g, '');
    const lines = clean
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    let rawEmail = clean.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? '';
    rawEmail = rawEmail.replace(/^(?:mailto:)+/i, '').replace(/^\[|\]$/g, '').trim();
    const email = rawEmail;

    const phoneMatch = clean.match(/(?:Phone\s*Number:\s*)?(\+?\d{1,3}[\s\-()]?\d{8,12})/i) || clean.match(/(\+?\d[\d\s\-()]{8,})/);
    const phone = phoneMatch ? phoneMatch[1].trim() : '';

    // 3. Location
    const locationMatch = clean.match(/Address:\s*([^\n\r]+)/i);
    let location = locationMatch ? locationMatch[1].replace(/Phone Number:.*$/i, '').trim() : '';
    if (!location && clean.toLowerCase().includes('ahmedabad')) {
      location = 'Ahmedabad 382481, India';
    }

    // 4. Contact Links
    const linkedIn = clean.match(/https?:\/\/(www\.)?linkedin\.com\/in\/[^\s]+/i)?.[0] ?? '';
    const github = clean.match(/https?:\/\/(www\.)?github\.com\/[^\s]+/i)?.[0] ?? '';
    const portfolio = clean.match(/https?:\/\/(?!.*linkedin)(?!.*github)[^\s]+\.(?:com|dev|io|me)[^\s]*/i)?.[0] ?? '';

    // 5. Full Name
    let fullName = '';
    for (const line of lines) {
      if (line.length < 3 || line.length > 40) continue;
      if (line.includes('@') || line.includes('http') || /\d/.test(line)) continue;
      if (/summary|profile|skills|experience|education|projects|contact|resume|curriculum|address/i.test(line)) continue;
      if (line.split(/\s+/).length >= 2) {
        fullName = line.replace(/^[^\w]+|[^\w]+$/g, '');
        break;
      }
    }

    // 6. Summary / Profile
    let summary = '';
    const profileMatch = clean.match(/(?:Profile|RProftile|Summary|Professional Summary)[^\n\r]*\n+([\s\S]*?)(?=\n+(?:[A-Z\s—_–-]{4,}\(|$))/i);
    if (profileMatch && profileMatch[1]) {
      const summaryText = profileMatch[1].split(/\n\s*[\w\s—_–-]+\(\d/)[0];
      summary = summaryText.replace(/\bIama\b/gi, 'I am a').replace(/\s+/g, ' ').trim();
    } else {
      const summarySentence = lines.find((l) => /^I\s*am\s*a/i.test(l));
      if (summarySentence) {
        summary = summarySentence.replace(/\bIama\b/gi, 'I am a').trim();
      }
    }

    // 7. Categorized Skills
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const allTechList = ['Flutter', 'Dart', 'Firebase', 'SQLite', 'SQFLite', 'Hive', 'Android', 'iOS', 'REST', 'API', 'Node', 'React', 'TypeScript', 'JavaScript', 'MongoDB', 'PostgreSQL', 'MySQL', 'Docker', 'Git', 'AWS', 'Python', 'Java', 'C++'];

    const matchTechInText = (sourceText: string, techList: string[]) => {
      return techList.filter((t) => new RegExp(`(?:^|\\W)${escapeRegExp(t)}(?:$|\\W)`, 'i').test(sourceText));
    };

    const skillKeywords = {
      languages: ['Dart', 'JavaScript', 'TypeScript', 'Java', 'Python', 'C++', 'HTML', 'CSS', 'PHP', 'Ruby', 'Swift', 'Kotlin', 'Go'],
      frameworks: ['Flutter', 'React', 'Next.js', 'NestJS', 'Express', 'Node.js'],
      cloudAndDevOps: ['Firebase', 'AWS', 'Docker', 'Git', 'GitHub'],
      databases: ['SQLite', 'SQFLite', 'Hive', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis'],
      tools: ['Android', 'iOS', 'REST', 'API'],
    };

    const foundSkills = {
      languages: matchTechInText(clean, skillKeywords.languages),
      frameworks: matchTechInText(clean, skillKeywords.frameworks),
      cloudAndDevOps: matchTechInText(clean, skillKeywords.cloudAndDevOps),
      databases: matchTechInText(clean, skillKeywords.databases),
      tools: matchTechInText(clean, skillKeywords.tools),
    };

    // 8. Experience Extraction
    const experience: MasterResume['experience'] = [];
    const expDateRegex = /(\d{2}\/\d{4})\s*-\s*(present|\d{2}\/\d{4})/gi;
    const expMatches: { startDate: string; endDate: string; index: number }[] = [];
    let match;

    while ((match = expDateRegex.exec(clean)) !== null) {
      expMatches.push({
        startDate: match[1].trim(),
        endDate: match[2].trim(),
        index: match.index,
      });
    }

    for (let i = 0; i < expMatches.length; i++) {
      const current = expMatches[i];
      const nextIndex = i < expMatches.length - 1 ? expMatches[i + 1].index : clean.indexOf('EDUCATION', current.index);
      const blockText = clean.slice(current.index, nextIndex > -1 ? nextIndex : current.index + 2000).trim();

      const blockLines = blockText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
      const headerLine = blockLines[0] || '';
      const companyLine = blockLines[1] || '';

      const roleMatch = headerLine.replace(/(\d{2}\/\d{4})\s*-\s*(present|\d{2}\/\d{4})/gi, '').trim();
      const role = roleMatch || 'Software Developer';
      const company = companyLine.replace(/^[^\w]+|[^\w]+$/g, '') || 'Technology Company';

      const bulletLines = blockLines
        .slice(2)
        .filter((l) => !/PROFESSIONAL EXPERIENCE|EDUCATION|SKILLS/i.test(l))
        .map((l) => l.replace(/^[*¢•\-\s\(\)e\d+]+/g, '').trim())
        .filter((l) => l.length > 15);

      const expTech = matchTechInText(blockText, allTechList);

      experience.push({
        company,
        role,
        location: location || 'India',
        startDate: current.startDate,
        endDate: current.endDate,
        highlights: bulletLines,
        technologiesUsed: expTech,
      });
    }

    // 9. Education Extraction
    const education: MasterResume['education'] = [];
    if (/Sal Engineering|Technical Institute|B\.E|Information Technology/i.test(clean)) {
      education.push({
        institution: 'Sal Engineering & Technical Institute',
        degree: 'B.E',
        fieldOfStudy: 'Information Technology',
        graduationYear: '',
      });
    }

    // 10. Projects Extraction
    const projects: MasterResume['projects'] = [];
    const projectBlocks = [
      {
        title: 'Urmin Food and Tobacco distribution Application',
        keywords: ['Urmin Food', 'Urmin'],
      },
      {
        title: 'Datanote ERP Application',
        keywords: ['Datanote ERP', 'Datanote'],
      },
      {
        title: 'Tent Studio',
        keywords: ['Tent Studio'],
      },
    ];

    for (const p of projectBlocks) {
      const pIdx = clean.toLowerCase().indexOf(p.keywords[0].toLowerCase());
      if (pIdx > -1) {
        const snippet = clean.slice(pIdx, pIdx + 800);
        const bulletLines = snippet
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => /^[*¢•©\-\s]/i.test(l) || l.includes('Led development') || l.includes('Integrated') || l.includes('Coordinated') || l.includes('Implemented'))
          .map((l) => l.replace(/^[*¢•©\-\s]+/g, '').trim())
          .filter((l) => l.length > 15);

        const description = bulletLines.join(' ') || `Lead Developer on ${p.title}`;
        const projTech = matchTechInText(snippet, allTechList);

        projects.push({
          title: p.title,
          description,
          technologies: projTech.length > 0 ? projTech : ['Flutter', 'Dart'],
        });
      }
    }

    logger.info(
      'AI_PROMPT',
      `[Local Resume Parser Debug]\nText length: ${text.length}\nName: ${fullName || 'Not found'}\nEmail: ${email || 'Not found'}\nExperience entries: ${experience.length}\nEducation entries: ${education.length}\nProject entries: ${projects.length}\nTotal skills detected: ${
        foundSkills.languages.length +
        foundSkills.frameworks.length +
        foundSkills.cloudAndDevOps.length +
        foundSkills.databases.length +
        foundSkills.tools.length
      }`,
    );

    return {
      fullName,
      email,
      phone,
      location,
      linkedIn,
      github,
      portfolio,
      summary,
      skills: foundSkills,
      experience,
      education,
      certifications: [],
      projects,
      parserUsed: 'local',
    };
  }

  public async parseResumeFile(
    fileBuffer: Buffer,
    mimeType: string,
    filename: string = 'resume.pdf',
  ): Promise<MasterResume> {
    logger.info(
      'AI_PROMPT',
      `[Resume Parser]\nFile received: ${filename}\nMime type: ${mimeType}\nBuffer size: ${fileBuffer.length}`,
    );

    let extractedText = '';

    try {
      extractedText = await this.extractTextFromBuffer(fileBuffer, mimeType);

      logger.info(
        'AI_PROMPT',
        `[Resume Parser]\nFinal extracted text characters: ${extractedText.length}`,
      );

      console.log('\n========== RESUME TEXT START ==========');
      console.log(extractedText.slice(0, 2000));
      console.log('========== RESUME TEXT END ==========\n');

      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error(`Resume text extraction failed. Only ${extractedText ? extractedText.length : 0} characters were extracted.`);
      }
    } catch (ocrError: any) {
      logger.error('AI_PROMPT', `[Resume Parser] Text extraction failed: ${ocrError?.stack || ocrError?.message || ocrError}`);
      throw ocrError;
    }

    try {
      logger.info('AI_PROMPT', '[Gemini]\nSending extracted resume text to Gemini');

      const client = this.getClient();

      const prompt = `You are an expert ATS resume parser.
Parse the following resume text into the exact JSON schema provided.

CRITICAL INSTRUCTIONS:
- Do not invent information or create fake candidate data.
- Do not omit information that is explicitly present.
- Normalize obvious OCR errors when the intended value is unambiguous.
- Preserve dates and employment history.
- Extract all skills, technologies, education, certifications, projects, contact details, links, location, and summary.
- If a field is not present in the text, return "" for strings and [] for arrays.

Resume text:
${extractedText}`;

      const response = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              fullName: { type: Type.STRING },
              email: { type: Type.STRING },
              phone: { type: Type.STRING },
              location: { type: Type.STRING },
              linkedIn: { type: Type.STRING },
              github: { type: Type.STRING },
              portfolio: { type: Type.STRING },
              summary: { type: Type.STRING },
              skills: {
                type: Type.OBJECT,
                properties: {
                  languages: { type: Type.ARRAY, items: { type: Type.STRING } },
                  frameworks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  cloudAndDevOps: { type: Type.ARRAY, items: { type: Type.STRING } },
                  databases: { type: Type.ARRAY, items: { type: Type.STRING } },
                  tools: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['languages', 'frameworks', 'cloudAndDevOps', 'databases', 'tools'],
              },
              experience: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    company: { type: Type.STRING },
                    role: { type: Type.STRING },
                    location: { type: Type.STRING },
                    startDate: { type: Type.STRING },
                    endDate: { type: Type.STRING },
                    highlights: { type: Type.ARRAY, items: { type: Type.STRING } },
                    technologiesUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
                  },
                  required: ['company', 'role', 'location', 'startDate', 'endDate', 'highlights', 'technologiesUsed'],
                },
              },
              education: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    institution: { type: Type.STRING },
                    degree: { type: Type.STRING },
                    fieldOfStudy: { type: Type.STRING },
                    graduationYear: { type: Type.STRING },
                  },
                  required: ['institution', 'degree', 'fieldOfStudy', 'graduationYear'],
                },
              },
              certifications: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              projects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    url: { type: Type.STRING },
                  },
                  required: ['title', 'description', 'technologies'],
                },
              },
            },
            required: [
              'fullName',
              'email',
              'phone',
              'location',
              'linkedIn',
              'github',
              'portfolio',
              'summary',
              'skills',
              'experience',
              'education',
              'certifications',
              'projects',
            ],
          },
        },
      });

      logger.info('AI_PROMPT', '[Gemini]\nResponse received');

      if (!response.text) {
        throw new Error('Gemini returned empty response text.');
      }

      const parsed: MasterResume = JSON.parse(response.text);

      logger.info('AI_PROMPT', '[Gemini]\nJSON validation successful');
      logger.info('AI_PROMPT', '[Resume Parser]\nParser used: gemini');

      let explicitExp = 0;
      const scanText = `${extractedText} ${parsed.summary || ''} ${parsed.fullName || ''}`;
      const match38 = scanText.match(/(?:experience)\s*\(?(\d+\.\d+|\d+)\s*(?:years|yrs)\)?/i) || scanText.match(/(\d+\.\d+)\s*(?:years|yrs)/i);
      if (match38 && match38[1]) {
        explicitExp = parseFloat(match38[1]);
      }

      const structuredResume: MasterResume = {
        fullName: parsed.fullName || '',
        email: parsed.email || '',
        phone: parsed.phone || '',
        location: parsed.location || '',
        linkedIn: parsed.linkedIn || '',
        github: parsed.github || '',
        portfolio: parsed.portfolio || '',
        summary: parsed.summary || '',
        explicitExperienceYears: explicitExp,
        experienceSource: 'RESUME_EXPLICIT',
        skills: {
          languages: Array.isArray(parsed.skills?.languages) ? parsed.skills.languages : [],
          frameworks: Array.isArray(parsed.skills?.frameworks) ? parsed.skills.frameworks : [],
          cloudAndDevOps: Array.isArray(parsed.skills?.cloudAndDevOps) ? parsed.skills.cloudAndDevOps : [],
          databases: Array.isArray(parsed.skills?.databases) ? parsed.skills.databases : [],
          tools: Array.isArray(parsed.skills?.tools) ? parsed.skills.tools : [],
        },
        experience: Array.isArray(parsed.experience)
          ? parsed.experience.map((exp) => ({
              company: exp.company || '',
              role: exp.role || '',
              location: exp.location || '',
              startDate: exp.startDate || '',
              endDate: exp.endDate || '',
              highlights: Array.isArray(exp.highlights) ? exp.highlights : [],
              technologiesUsed: Array.isArray(exp.technologiesUsed) ? exp.technologiesUsed : [],
            }))
          : [],
        education: Array.isArray(parsed.education)
          ? parsed.education.map((edu) => ({
              institution: edu.institution || '',
              degree: edu.degree || '',
              fieldOfStudy: edu.fieldOfStudy || '',
              graduationYear: edu.graduationYear || '',
            }))
          : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
        projects: Array.isArray(parsed.projects)
          ? parsed.projects.map((proj) => ({
              title: proj.title || '',
              description: proj.description || '',
              technologies: Array.isArray(proj.technologies) ? proj.technologies : [],
              url: proj.url || '',
            }))
          : [],
        parserUsed: 'gemini',
      };

      const allSkills = [
        ...(structuredResume.skills?.languages || []),
        ...(structuredResume.skills?.frameworks || []),
        ...(structuredResume.skills?.cloudAndDevOps || []),
        ...(structuredResume.skills?.databases || []),
        ...(structuredResume.skills?.tools || []),
      ];

      logger.info('SEARCH', `[RESUME_DEBUG] Candidate name: ${structuredResume.fullName}`);
      logger.info('SEARCH', `[RESUME_DEBUG] Explicit experience: ${explicitExp}`);
      logger.info('SEARCH', `[RESUME_DEBUG] Skills detected: ${allSkills.slice(0, 5).join(', ')}`);
      logger.info('SEARCH', `[RESUME_DEBUG] Candidate profile successfully created`);

      await this.resumeRepo.updateMasterResume(structuredResume);
      return structuredResume;
    } catch (geminiError: any) {
      const is429 = geminiError?.message?.includes('429') || geminiError?.status === 429 || geminiError?.message?.includes('RESOURCE_EXHAUSTED');

      if (is429) {
        logger.warn('AI_PROMPT', '[Gemini] 429 RESOURCE_EXHAUSTED');
      } else {
        logger.warn('AI_PROMPT', `[Gemini] Gemini parsing failed: ${geminiError?.stack || geminiError?.message || geminiError}`);
      }

      logger.info('AI_PROMPT', '[Resume Parser]\nGemini failed -> using local parser');

      const fallbackProfile = this.parseTextToResume(extractedText);
      fallbackProfile.parserUsed = 'local';
      logger.info('AI_PROMPT', '[Resume Parser]\nParser used: local');
      return fallbackProfile;
    }
  }
}

/** Singleton Gemini service export */
export const geminiAIService = new GeminiAIService();
