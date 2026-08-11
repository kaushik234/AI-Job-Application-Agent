/**
 * @file src/services/ai/PromptTemplateManager.ts
 * @description Manages versioned prompt templates and system instructions for AI Service.
 */

import { PromptTemplate } from '@sentinel/types';

export class PromptTemplateManager {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.registerDefaultTemplates();
  }

  private registerDefaultTemplates(): void {
    // 1. Resume Matching Template
    this.templates.set('resume_matching', {
      id: 'pt-matching',
      name: 'resume_matching',
      version: 'v2.0.0',
      description: 'Evaluates candidate resume against target job description with strict candidate/job context separation.',
      templateText: `You are an expert technical recruiter and AI job matching specialist.
Evaluate how well the candidate matches the target job description using strict context isolation.

================ CANDIDATE =================
The following information is the ONLY authoritative source for candidate qualifications.

CANDIDATE NAME: {{candidate.fullName}}
CANDIDATE TOTAL EXPERIENCE: {{candidate.totalExperienceYears}} years
CANDIDATE SUMMARY: {{candidate.summary}}
CANDIDATE SKILLS: {{candidate.skills}}
CANDIDATE EXPERIENCE HIGHLIGHTS:
{{candidate.experience}}

================ END CANDIDATE =============

================ JOB ========================
The following information describes the JOB ONLY.

JOB TITLE: {{job.title}}
JOB COMPANY: {{job.company}}
JOB LOCATION: {{job.location}} (Country: {{job.country}})
JOB VISA SPONSORSHIP: {{job.visaSponsorship}}
JOB REMOTE STATUS: {{job.isRemote}}
JOB REQUIRED EXPERIENCE: {{job.requiredExperienceYears}} years
JOB DESCRIPTION: {{job.description}}
JOB REQUIREMENTS: {{job.requirements}}

================ END JOB ====================

ABSOLUTE AI EVALUATION RULES:
1. Never treat job requirements as candidate qualifications.
2. Never treat preferred skills from the job as candidate skills.
3. Never treat required years of experience from the job as candidate experience.
4. Never state that the candidate has a skill unless it explicitly exists in CANDIDATE SKILLS or CANDIDATE EXPERIENCE.
5. Never state that the candidate has an achievement unless it exists in CANDIDATE EXPERIENCE HIGHLIGHTS.
6. Never invent candidate experience or years. If candidate has {{candidate.totalExperienceYears}} years, candidate experience IS {{candidate.totalExperienceYears}} years.
7. If candidate has {{candidate.totalExperienceYears}} years and job asks for {{job.requiredExperienceYears}} years, state: Candidate experience: {{candidate.totalExperienceYears}} years vs Required: {{job.requiredExperienceYears}} years.
8. If candidate skills lack a job requirement, list it under missingSkills/gaps. Never attribute missing skills to candidate strengths.

ANALYZE ALIGNMENT RIGOROUSLY & RETURN STRUCTURED JSON.`,
      updatedAt: '2026-08-11T00:00:00Z',
    });

    // 2. Resume Tailoring Template
    this.templates.set('resume_tailoring', {
      id: 'pt-tailoring',
      name: 'resume_tailoring',
      version: 'v1.1.0',
      description: 'Reorganizes skills, rewrites summary, and optimizes experience bullet points without fabricating facts.',
      templateText: `You are an expert ATS resume tailoring agent.
CRITICAL RULE: DO NOT FABRICATE EXPERIENCE, DATES, OR CLAIMS NOT PRESENT IN THE MASTER RESUME.
Only reorganize, highlight relevant skills, rewrite the summary, and optimize keywords.

TARGET JOB:
Company: {{job.company}}
Title: {{job.title}}
Requirements: {{job.requirements}}
Description: {{job.description}}

CANDIDATE MASTER RESUME:
{{candidate.json}}

TASK:
1. Custom Summary: Write a compelling 3-sentence summary tailored to {{job.company}}'s {{job.title}} position.
2. Prioritized Skills: Reorder and surface candidate's real matching skills first.
3. Reorganized Experience: Select candidate's real experience entries and rephrase bullet points to highlight matching tech stack.
4. Keywords Optimized: List ATS keywords emphasized.`,
      updatedAt: '2026-08-07T00:00:00Z',
    });

    // 3. Cover Letter Template
    this.templates.set('cover_letter', {
      id: 'pt-cover-letter',
      name: 'cover_letter',
      version: 'v1.0.0',
      description: 'Drafts a concise, professional cover letter tailored to the target company and role.',
      templateText: `Generate a professional, compelling cover letter under one page for a software engineering position.

CANDIDATE:
Name: {{candidate.fullName}}
Location: {{candidate.location}}

JOB DETAILS:
Company: {{job.company}}
Title: {{job.title}}
Location: {{job.location}}
Description: {{job.description}}

REQUIREMENTS:
- Mention target company ({{job.company}}) and position ({{job.title}}).
- Highlight relevant background and technical stack alignment.
- Express genuine enthusiasm for the team's mission.
- Return salutation, 3 content paragraphs (Introduction, Technical Contributions, Closing CTA), and closing.`,
      updatedAt: '2026-08-07T00:00:00Z',
    });

    // 4. Keyword Optimization Template
    this.templates.set('keyword_optimization', {
      id: 'pt-keyword-opt',
      name: 'keyword_optimization',
      version: 'v1.0.0',
      description: 'Performs ATS keyword gap analysis between resume and job description.',
      templateText: `You are an ATS Keyword Optimization Engine.
Analyze the candidate's resume against the target job description for critical keywords, hard skills, soft skills, and domain concepts.

JOB DESCRIPTION:
Company: {{job.company}}
Title: {{job.title}}
Description: {{job.description}}
Requirements: {{job.requirements}}

CANDIDATE RESUME:
Summary: {{candidate.summary}}
Skills: {{candidate.skills}}
Experience: {{candidate.experience}}

TASK:
1. Calculate a keyword match score between 0 and 100%.
2. Identify keywords present in both job and candidate resume.
3. Identify missing critical keywords from the job description.
4. Provide 3-5 actionable optimization tips to naturally incorporate missing keywords.
5. Assign a relevance score (0.0 - 1.0) for top 10 keywords.`,
      updatedAt: '2026-08-07T00:00:00Z',
    });

    // 5. Interview Prediction Template
    this.templates.set('interview_prediction', {
      id: 'pt-interview-pred',
      name: 'interview_prediction',
      version: 'v1.0.0',
      description: 'Predicts probable technical and behavioral interview questions and provides STAR response frameworks.',
      templateText: `You are a Principal Tech Lead and Hiring Committee Chair.
Based on the candidate's background and the target job description, predict probable interview questions and provide strategic preparation guidance.

TARGET JOB:
Company: {{job.company}}
Title: {{job.title}}
Description: {{job.description}}
Requirements: {{job.requirements}}

CANDIDATE BACKGROUND:
Name: {{candidate.fullName}}
Summary: {{candidate.summary}}
Skills: {{candidate.skills}}
Experience: {{candidate.experience}}

TASK:
1. Predict 3 probable technical interview questions (topic, difficulty, sample answer outline, talking points).
2. Predict 2 behavioral interview questions with structured STAR technique responses (Situation, Task, Action, Result) based on real candidate experience.
3. List 3 key focus areas for interview preparation.`,
      updatedAt: '2026-08-07T00:00:00Z',
    });

    // 6. Company Research Template
    this.templates.set('company_research', {
      id: 'pt-company-res',
      name: 'company_research',
      version: 'v1.0.0',
      description: 'Generates intelligence on company tech stack, engineering culture, visa sponsorship track record, and interview tips.',
      templateText: `You are an Executive Technology Researcher.
Provide strategic intelligence on the target company for a software candidate.

COMPANY NAME: {{company}}
JOB TITLE: {{jobTitle}}
JOB DESCRIPTION: {{jobDescription}}

TASK:
1. Identify industry and likely headquarters location.
2. Outline core tech stack based on description and industry standards.
3. Summarize engineering culture highlights (e.g. CI/CD, autonomy, remote work, documentation).
4. Evaluate visa sponsorship track record and likelihood.
5. Provide 3 recent company/industry insights or talking points.
6. Give 3 actionable interview preparation tips specific to {{company}}.`,
      updatedAt: '2026-08-07T00:00:00Z',
    });
  }

  public getTemplate(name: string): PromptTemplate {
    const template = this.templates.get(name);
    if (!template) {
      throw new Error(`Prompt template '${name}' not found.`);
    }
    return template;
  }

  public render(name: string, variables: Record<string, any>): { prompt: string; version: string } {
    const template = this.getTemplate(name);
    let prompt = template.templateText;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{\\s*${key.replace('.', '\\.')}\\s*}}`, 'g');
      const replacement = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
      prompt = prompt.replace(placeholder, replacement);
    }

    return {
      prompt,
      version: template.version,
    };
  }

  public getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  public updateTemplate(name: string, newText: string, newVersion?: string): PromptTemplate {
    const template = this.getTemplate(name);
    template.templateText = newText;
    if (newVersion) {
      template.version = newVersion;
    } else {
      const [major, minor, patch] = template.version.replace('v', '').split('.').map(Number);
      template.version = `v${major}.${minor}.${patch + 1}`;
    }
    template.updatedAt = new Date().toISOString();
    this.templates.set(name, template);
    return template;
  }
}
