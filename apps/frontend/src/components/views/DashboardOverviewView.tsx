import React from 'react';
import {
  Send,
  CheckCircle,
  Clock,
  Briefcase,
  Globe,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  AlertCircle,
  ShieldCheck,
  FileCheck,
  Download,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Layers,
  FileText,
  User,
} from 'lucide-react';
import { DashboardStats, ApplicationRecord, CountryCode } from '@sentinel/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sentinel/ui';
import { Badge } from '@sentinel/ui';
import { Button } from '@sentinel/ui';

interface DashboardOverviewViewProps {
  stats: DashboardStats;
  applications: ApplicationRecord[];
  masterResume: any | null;
  tailoredResumes: any[];
  coverLetters: any[];
  jobs: any[];
  onTriggerSearch: () => void;
  onRunAutomation: () => void;
  onCheckEmails: () => void;
  isSearching: boolean;
  isRunningPipeline: boolean;
  isCheckingEmails: boolean;
  setActiveTab: (tab: string) => void;
}

export const DashboardOverviewView: React.FC<DashboardOverviewViewProps> = ({
  stats,
  applications,
  masterResume,
  tailoredResumes,
  coverLetters,
  jobs,
  onTriggerSearch,
  onRunAutomation,
  onCheckEmails,
  isSearching,
  isRunningPipeline,
  isCheckingEmails,
  setActiveTab,
}) => {
  const avgMatchScore = applications.length > 0 
    ? Math.round(applications.reduce((acc, app) => acc + (app.matchScore || 85), 0) / applications.length)
    : 92;

  const statCards = [
    {
      title: 'Applications Today',
      value: `${stats.applicationsToday} / ${stats.dailyLimit}`,
      subtitle: `${Math.max(0, stats.dailyLimit - stats.applicationsToday)} remaining today`,
      icon: Send,
      color: 'blue',
      progress: Math.min(100, Math.round((stats.applicationsToday / (stats.dailyLimit || 1)) * 100)),
    },
    {
      title: 'Avg Match Score',
      value: `${avgMatchScore}%`,
      subtitle: 'Average compatibility across roles',
      icon: TrendingUp,
      color: 'emerald',
      progress: avgMatchScore,
    },
    {
      title: 'Pending Approvals',
      value: stats.pendingApprovalCount,
      subtitle: 'Applications waiting for review',
      icon: Clock,
      color: 'amber',
    },
    {
      title: 'Total Submitted',
      value: stats.totalApplications,
      subtitle: `${stats.resumeVersionsCount} tailored resume versions`,
      icon: CheckCircle,
      color: 'purple',
    },
  ];

  const countryFlags: Record<CountryCode, { name: string; flag: string }> = {
    AU: { name: 'Australia', flag: '🇦🇺' },
    CA: { name: 'Canada', flag: '🇨🇦' },
    DE: { name: 'Germany', flag: '🇩🇪' },
  };

  const handleDownloadMaster = () => {
    window.open('/api/resume/download/master', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Agent Control Banner */}
      <div className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-xl overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant="blue" icon={<ShieldCheck className="w-3.5 h-3.5" />}>
                AGENT ACTIVE
              </Badge>
              <Badge variant="green" icon={<Sparkles className="w-3.5 h-3.5" />}>
                Gemini 2.5 Flash Engine
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Autonomous Application Control Center
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              SENTINEL AI is monitoring and auto-matching job boards in Australia, Canada, and Germany for visa-sponsored Software Engineer roles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              onClick={onRunAutomation}
              isLoading={isRunningPipeline}
              icon={<Play className="w-4 h-4 fill-current" />}
            >
              Run Auto-Pilot
            </Button>
            <Button
              variant="outline"
              onClick={onTriggerSearch}
              isLoading={isSearching}
              icon={<Search className="w-4 h-4" />}
            >
              Scrape Jobs
            </Button>
            <Button
              variant="secondary"
              onClick={onCheckEmails}
              isLoading={isCheckingEmails}
              icon={<RefreshCw className="w-4 h-4" />}
            >
              Sync Inbox
            </Button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Card key={idx} className="relative overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                    {card.title}
                  </span>
                  <div className={`p-2 rounded-xl bg-${card.color}-500/10 text-${card.color}-500`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                    {card.value}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{card.subtitle}</p>
                </div>

                {card.progress !== undefined && (
                  <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-blue-600 rounded-full transition-all duration-500`}
                      style={{ width: `${card.progress}%` }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Master Resume & Extracted Profile Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <span>Active Master Resume</span>
            </CardTitle>
            <CardDescription>Primary resume parsed and saved to PostgreSQL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {masterResume ? (
              <div className="space-y-3">
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    <span className="font-bold text-slate-200 truncate max-w-[130px]">Master Resume.pdf</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleDownloadMaster} icon={<Download className="w-3.5 h-3.5" />}>
                    Download
                  </Button>
                </div>

                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg text-xs space-y-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">AI Extracted Summary</span>
                  <p className="text-slate-400 leading-relaxed italic">
                    "{masterResume.summary || 'Summary unavailable'}"
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No master resume uploaded yet. Go to Resumes tab to upload.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-500" />
              <span>AI Extracted Candidate Profile</span>
            </CardTitle>
            <CardDescription>Extracted fields parsed by Gemini 2.5 Flash from Master Resume</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            {masterResume ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <User className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">{masterResume.fullName}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">{masterResume.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Phone className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">{masterResume.phone}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300">
                    <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">{masterResume.location}</span>
                  </div>
                  {masterResume.linkedIn && (
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Linkedin className="w-4 h-4 text-blue-500 shrink-0" />
                      <a href={masterResume.linkedIn} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">{masterResume.linkedIn}</a>
                    </div>
                  )}
                  {masterResume.github && (
                    <div className="flex items-center space-x-2 text-slate-300">
                      <Github className="w-4 h-4 text-blue-500 shrink-0" />
                      <a href={masterResume.github} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate">{masterResume.github}</a>
                    </div>
                  )}
                </div>

                {masterResume.skills && (
                  <div className="pt-3 border-t border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Skills Matrix</span>
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set([
                        ...(masterResume.skills.languages || []),
                        ...(masterResume.skills.frameworks || []),
                        ...(masterResume.skills.cloudAndDevOps || []),
                        ...(masterResume.skills.databases || []),
                        ...(masterResume.skills.tools || [])
                      ])).slice(0, 15).map((skill: any, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px] font-semibold">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                No active profile details found. Complete a master resume upload to auto-populate.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country Breakdown */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-sm">
              <Globe className="w-4 h-4 text-blue-500" />
              <span>Target Region Distribution</span>
            </CardTitle>
            <CardDescription>Applications across target markets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(['AU', 'CA', 'DE'] as CountryCode[]).map((code) => {
              const countryBreakdown = stats?.countryBreakdown || { AU: 0, CA: 0, DE: 0 };
              const count = countryBreakdown[code] || 0;
              const total = stats?.totalApplications || 1;
              const percentage = Math.round((count / total) * 100);
              const info = countryFlags[code];

              return (
                <div key={code} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="flex items-center space-x-2 text-slate-700 dark:text-slate-200">
                      <span>{info.flag}</span>
                      <span>{info.name}</span>
                    </span>
                    <span className="text-slate-900 dark:text-slate-100 font-bold">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Application Activity */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm">Recent Jobs & Matches</CardTitle>
              <CardDescription>Recent jobs and computed ATS scores</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No recent matches. Click "Scrape Jobs" to find matches.
              </div>
            ) : (
              <div className="space-y-3">
                {applications.slice(0, 4).map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-slate-200 truncate">{app.jobTitle}</p>
                      <p className="text-[10px] text-slate-500 truncate">{app.company} • {app.country}</p>
                    </div>

                    <span className="text-[10px] font-extrabold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full shrink-0">
                      {app.matchScore || 85}% match
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Overview */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>Resume & Cover Letter History</span>
            </CardTitle>
            <CardDescription>Historical version assets generated by Gemini</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs font-semibold text-slate-300">
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-500" />
                <span>Tailored Resume Versions</span>
              </div>
              <Badge variant="blue">{tailoredResumes.length}</Badge>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-purple-500" />
                <span>Generated Cover Letters</span>
              </div>
              <Badge variant="blue">{coverLetters.length}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
