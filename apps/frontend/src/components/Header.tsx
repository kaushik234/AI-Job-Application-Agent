/**
 * @file src/components/Header.tsx
 * @description Header bar with status badges, pipeline triggers, and agent controls.
 * @architect Clean Architecture - Presentation Layer
 */

import React from 'react';
import { Bot, Play, Mail, RefreshCw, Sparkles, ShieldCheck, FileCode } from 'lucide-react';

interface HeaderProps {
  onRunPipeline: () => void;
  onCheckEmails: () => void;
  isRunningPipeline: boolean;
  isCheckingEmails: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onRunPipeline,
  onCheckEmails,
  isRunningPipeline,
  isCheckingEmails,
  activeTab,
  setActiveTab,
}) => {
  return (
    <header className="bg-slate-900/80 backdrop-blur border-b border-slate-800 text-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand Title & Technical Status Pills */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-slate-950 text-lg shadow-md shadow-blue-500/20 shrink-0">
            A
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="font-semibold text-base tracking-tight text-white flex items-center gap-2">
                SENTINEL <span className="text-blue-400 font-mono text-xs font-semibold">v1.0.4</span>
              </h1>
              <span className="px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-mono uppercase tracking-widest font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> Agent Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              AU 🇦🇺 • CA 🇨🇦 • DE 🇩🇪 | Greenhouse • Lever • Ashby • Seek • Indeed
            </p>
          </div>
        </div>

        {/* Tech Environment Badges */}
        <div className="hidden lg:flex gap-4 text-[11px] text-slate-400 font-mono bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <span>ENV: <span className="text-blue-400 font-bold">PRODUCTION</span></span>
          <span className="text-slate-700">|</span>
          <span>DB: <span className="text-emerald-400 font-bold">SQLITE_SYNC</span></span>
          <span className="text-slate-700">|</span>
          <span>NODE: <span className="text-purple-400 font-bold">v20.10.0</span></span>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="header-btn-run-pipeline"
            onClick={onRunPipeline}
            disabled={isRunningPipeline}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-md shadow-blue-500/20"
          >
            {isRunningPipeline ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunningPipeline ? 'Running Agent...' : 'Run Agent'}</span>
          </button>

          <button
            id="header-btn-check-email"
            onClick={onCheckEmails}
            disabled={isCheckingEmails}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2 rounded-lg transition-all"
          >
            <Mail className={`w-3.5 h-3.5 ${isCheckingEmails ? 'animate-bounce text-blue-400' : 'text-slate-400'}`} />
            <span>{isCheckingEmails ? 'Scanning...' : 'Check Emails'}</span>
          </button>

          <button
            id="header-btn-architecture"
            onClick={() => setActiveTab('architecture')}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all ${
              activeTab === 'architecture'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-slate-800/80 text-slate-300 border border-slate-700/60 hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-3.5 h-3.5 text-purple-400" />
            <span>Architecture</span>
          </button>
        </div>
      </div>
    </header>
  );
};
