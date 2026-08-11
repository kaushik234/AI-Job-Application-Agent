/**
 * @file src/components/ArchitectureViewer.tsx
 * @description Clean Architecture Inspector explaining SOLID principles, project structure, why every file exists, and Docker setup.
 * @architect Clean Architecture - Architectural Documentation Layer
 */

import React from 'react';
import { Code2, FolderTree, Shield, Cpu, Container, CheckCircle2, Layers } from 'lucide-react';

export const ArchitectureViewer: React.FC = () => {
  const fileTreeExplanation = [
    { path: 'src/config/index.ts', purpose: 'Centralized environment variable manager loading validated secrets, ports, and directory constants.' },
    { path: 'src/types/index.ts', purpose: 'Strict TypeScript interfaces and contracts for Jobs, Resumes, Cover Letters, Applications, and Logs.' },
    { path: 'src/utils/logger.ts', purpose: 'Structured logger with streaming callbacks for browser actions, AI prompts, and execution logs.' },
    { path: 'src/utils/encryption.ts', purpose: 'AES-256-CBC encryption utility for securing sensitive API keys and personal data.' },
    { path: 'src/database/index.ts', purpose: 'ACID-compliant SQLite/JSON database manager holding persistent tables for jobs and applications.' },
    { path: 'src/repositories/JobRepository.ts', purpose: 'Data Access Object for querying, filtering, and persisting scraped jobs across AU, CA, DE.' },
    { path: 'src/repositories/ApplicationRepository.ts', purpose: 'Data Access Object managing application lifecycle states and dashboard metrics.' },
    { path: 'src/repositories/ResumeRepository.ts', purpose: 'Repository managing master profile and generated ATS tailored resume versions.' },
    { path: 'src/repositories/SettingsRepository.ts', purpose: 'Repository handling agent operational limits, country filters, and salary thresholds.' },
    { path: 'src/services/GeminiAIService.ts', purpose: 'Server-side Gemini AI integration engine using @google/genai for match scoring and resume tailoring.' },
    { path: 'src/jobs/JobScraperEngine.ts', purpose: 'Multi-platform scraper fetching listings from Greenhouse, Lever, Ashby, Seek, Indeed & Job Bank.' },
    { path: 'src/resume/ResumePDFGenerator.ts', purpose: 'PDF-LIB rendering engine generating ATS-compliant 1-page PDF resumes.' },
    { path: 'src/coverLetter/CoverLetterPDFExporter.ts', purpose: 'PDF exporter rendering single-page personalized cover letters.' },
    { path: 'src/browser/BrowserAutomationRunner.ts', purpose: 'Playwright automation runner with form auto-fill and CAPTCHA user confirmation handling.' },
    { path: 'src/services/SchedulerService.ts', purpose: 'Scheduled morning agent pipeline orchestrating search, evaluation, tailoring, and queueing.' },
    { path: 'src/services/EmailMonitorService.ts', purpose: 'Gmail recruiter email classifier updating tracker status based on recruiter replies.' },
    { path: 'src/controllers/*', purpose: 'Express REST Controllers routing API requests cleanly to respective services.' },
    { path: 'server.ts', purpose: 'Express + Vite server binding to port 3000 and serving the unified SPA dashboard.' },
  ];

  return (
    <div className="space-y-6">
      {/* SOLID & Architecture Principles Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Clean Architecture & SOLID Design Principles</h2>
            <p className="text-xs text-slate-400">Strict separation of concerns across Domain, Data, Services, and Presentation layers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-1">
            <h4 className="font-bold text-indigo-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" /> Single Responsibility
            </h4>
            <p className="text-slate-300">Each service (Gemini, Scraper, PDF Generator, Browser Automator) owns a single domain task.</p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-1">
            <h4 className="font-bold text-cyan-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" /> Open/Closed Principle
            </h4>
            <p className="text-slate-300">New job platforms or country scrapers can be plugged in without altering core pipeline logic.</p>
          </div>

          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 space-y-1">
            <h4 className="font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Dependency Inversion
            </h4>
            <p className="text-slate-300">Controllers depend on repository contracts rather than direct database driver logic.</p>
          </div>
        </div>
      </div>

      {/* File Purpose Index */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FolderTree className="w-4 h-4 text-indigo-400" /> Project File Tree & Responsibility Explanation
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {fileTreeExplanation.map((item, i) => (
            <div key={i} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl space-y-1">
              <div className="font-mono text-indigo-300 font-bold">{item.path}</div>
              <div className="text-slate-300">{item.purpose}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Docker & Container Specification */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 text-xs">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Container className="w-4 h-4 text-cyan-400" /> Docker & Container Runtime Configuration
        </h3>
        <p className="text-slate-300 leading-relaxed">
          The application runs as a Docker container binding exclusively to <strong>Port 3000</strong> behind the Cloud Run reverse proxy layer.
        </p>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
          <div># Docker build & run commands</div>
          <div>docker build -t ai-job-agent .</div>
          <div>docker run -p 3000:3000 -e GEMINI_API_KEY="your-key" ai-job-agent</div>
        </div>
      </div>
    </div>
  );
};
