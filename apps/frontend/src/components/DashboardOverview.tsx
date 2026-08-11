/**
 * @file src/components/DashboardOverview.tsx
 * @description Dashboard overview component displaying metrics, country breakdown, and active application pipeline states.
 * @architect Clean Architecture - Presentation Layer
 */

import React from 'react';
import { DashboardStats } from '@sentinel/types';
import { Target, TrendingUp, Clock, CalendarCheck, Globe, CheckCircle2, ArrowRight } from 'lucide-react';

interface DashboardOverviewProps {
  stats: DashboardStats;
  onNavigate: (tab: string) => void;
  onRunPipeline: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ stats, onNavigate, onRunPipeline }) => {
  const dailyProgressPercent = Math.min(100, Math.round((stats.applicationsToday / Math.max(1, stats.dailyLimit)) * 100));

  return (
    <div className="space-y-6">
      {/* Hero Bento Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                SYSTEM_STATUS: OPERATIONAL
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Automated Job Application Pipeline
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl font-sans">
              Monitoring and auto-applying to target Senior & Lead Software Engineer positions in <span className="text-blue-300 font-medium">Australia (AU)</span>, <span className="text-blue-300 font-medium">Canada (CA)</span>, and <span className="text-blue-300 font-medium">Germany (DE)</span> with zero experience fabrication.
            </p>
          </div>
          <button
            id="overview-btn-run-agent"
            onClick={onRunPipeline}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-slate-950 font-bold px-4 py-2.5 rounded-lg transition-all shadow-md shadow-blue-500/20 whitespace-nowrap text-xs shrink-0"
          >
            <span>Trigger Scheduled Pipeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Primary Metrics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Daily Submissions Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">DAILY_SUBMISSIONS</span>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-white">
              {stats.applicationsToday} <span className="text-xs font-normal text-slate-500 font-sans">/ {stats.dailyLimit} limit</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-2">
              <span className="text-[11px] text-slate-400">Daily Quota</span>
              <span className="text-xs font-mono font-bold text-blue-400">{dailyProgressPercent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div className="bg-blue-500 h-full transition-all duration-500 rounded-full" style={{ width: `${dailyProgressPercent}%` }} />
            </div>
          </div>
        </div>

        {/* Response Rate Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">RECRUITER_RESPONSE</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-emerald-400">{stats.successRate}%</div>
            <p className="text-[11px] text-slate-400 mt-1">Interview invitations & coding tasks</p>
          </div>
        </div>

        {/* Pending Approvals Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">HUMAN_APPROVAL_QUEUE</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-amber-400">{stats.pendingApprovalCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Pending submission confirmation</p>
          </div>
        </div>

        {/* Active Interviews Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">ACTIVE_INTERVIEWS</span>
            <CalendarCheck className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-3xl font-mono font-bold text-purple-400">{stats.interviewsCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Scheduled recruiter rounds</p>
          </div>
        </div>
      </div>

      {/* Secondary Bento Layout - Breakdown & Subsystem Access */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country Breakdown Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-blue-400" /> COUNTRY_BREAKDOWN
            </h3>
            <span className="text-[10px] font-mono text-slate-500">REALTIME</span>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🇦🇺</span>
                <span className="text-xs font-medium text-slate-200">Australia (AU)</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400">{(stats?.countryBreakdown?.AU) || 0} apps</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🇨🇦</span>
                <span className="text-xs font-medium text-slate-200">Canada (CA)</span>
              </div>
              <span className="text-xs font-mono font-bold text-purple-400">{(stats?.countryBreakdown?.CA) || 0} apps</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800/80 rounded-lg">
              <div className="flex items-center gap-2.5">
                <span className="text-base">🇩🇪</span>
                <span className="text-xs font-medium text-slate-200">Germany (DE)</span>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400">{(stats?.countryBreakdown?.DE) || 0} apps</span>
            </div>
          </div>
        </div>

        {/* Subsystems Navigation Bento Grid */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/30 flex items-center justify-between">
            <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> AGENT_SUBSYSTEMS
            </h3>
            <span className="text-[10px] font-mono text-slate-500">CLEAN_ARCH_LAYER</span>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <button
              onClick={() => onNavigate('jobs')}
              className="p-4 bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 rounded-xl text-left space-y-1.5 transition-all group"
            >
              <div className="text-xs font-mono font-bold text-blue-400 group-hover:text-blue-300 flex items-center justify-between">
                <span>01 // JOB DISCOVERY ENGINE</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Greenhouse, Lever, Ashby, Seek AU, Indeed CA/DE & Job Bank integration.
              </p>
            </button>

            <button
              onClick={() => onNavigate('resumes')}
              className="p-4 bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/40 rounded-xl text-left space-y-1.5 transition-all group"
            >
              <div className="text-xs font-mono font-bold text-purple-400 group-hover:text-purple-300 flex items-center justify-between">
                <span>02 // ATS RESUME TAILOR</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gemini 2.5 Flash ATS keyword alignment & PDF-LIB document generation.
              </p>
            </button>

            <button
              onClick={() => onNavigate('automation')}
              className="p-4 bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 rounded-xl text-left space-y-1.5 transition-all group"
            >
              <div className="text-xs font-mono font-bold text-amber-400 group-hover:text-amber-300 flex items-center justify-between">
                <span>03 // PLAYWRIGHT AUTOMATOR</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Form filling, file upload handling, CAPTCHA bypass & human approval mode.
              </p>
            </button>

            <button
              onClick={() => onNavigate('emails')}
              className="p-4 bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/40 rounded-xl text-left space-y-1.5 transition-all group"
            >
              <div className="text-xs font-mono font-bold text-emerald-400 group-hover:text-emerald-300 flex items-center justify-between">
                <span>04 // RECRUITER EMAIL CLASSIFIER</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Inbound Gmail monitoring, status updates, interview auto-detection.
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
