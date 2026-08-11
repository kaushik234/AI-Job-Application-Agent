import React, { useState, useEffect } from 'react';
import { BarChart2, Globe, TrendingUp, Send, CheckCircle, Award, Target, Download, FileText, RefreshCw, Sparkles } from 'lucide-react';
import { DashboardStats, ApplicationRecord, CountryCode } from '@sentinel/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge } from '@sentinel/ui';

interface AnalyticsViewProps {
  stats: DashboardStats;
  applications: ApplicationRecord[];
  onRefresh?: () => Promise<void>;
  onExportCsv?: () => Promise<void>;
  onExportPdf?: () => Promise<void>;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  stats,
  applications,
  onRefresh,
  onExportCsv,
  onExportPdf,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('30d');

  // Hardcoded mockup analytics fallback if no API handler overrides
  const successRate = stats?.successRate || 18.5;
  const interviewCount = stats?.interviewsCount || 4;
  const totalApps = stats?.totalApplications || applications.length || 34;

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (err) {
        console.error(err);
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const handleCsvClick = async () => {
    if (onExportCsv) {
      await onExportCsv();
    } else {
      window.open('http://localhost:3000/api/dashboard/export/csv', '_blank');
    }
  };

  const handlePdfClick = async () => {
    if (onExportPdf) {
      await onExportPdf();
    } else {
      window.open('http://localhost:3000/api/dashboard/export/pdf', '_blank');
    }
  };

  // 1. Chart Data: Applications per Day (mockup 10 days for rendering)
  const appTimeline = [
    { date: 'Aug 1', count: 3 },
    { date: 'Aug 2', count: 5 },
    { date: 'Aug 3', count: 4 },
    { date: 'Aug 4', count: 6 },
    { date: 'Aug 5', count: 2 },
    { date: 'Aug 6', count: 4 },
    { date: 'Aug 7', count: 7 },
    { date: 'Aug 8', count: 5 },
  ];
  const maxTimelineVal = Math.max(...appTimeline.map((item) => item.count));

  // 2. Chart Data: AI Match Score Distribution
  const scoreDistribution = [
    { range: '< 70%', count: 2, pct: 6 },
    { range: '70% - 80%', count: 5, pct: 15 },
    { range: '80% - 90%', count: 18, pct: 53 },
    { range: '90% - 100%', count: 9, pct: 26 },
  ];

  // 3. Chart Data: Resume Performance
  const resumePerf = [
    { version: 'v1.2-StaffBackend', count: 15, interviews: 3, offers: 1, rate: '26.6%' },
    { version: 'v2.0-FullStack', count: 12, interviews: 1, offers: 0, rate: '8.3%' },
    { version: 'v1.0-Master', count: 7, interviews: 0, offers: 0, rate: '0.0%' },
  ];

  // 4. Chart Data: Company distribution
  const companyDistribution = [
    { name: 'Atlassian', apps: 4, interviews: 1, status: 'Interview Scheduled' },
    { name: 'Canva', apps: 3, interviews: 1, status: 'Offer Received' },
    { name: 'Shopify', apps: 3, interviews: 0, status: 'Assessment' },
    { name: 'Zendesk', apps: 2, interviews: 0, status: 'Applied' },
  ];

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" />
            <span>Applications Advanced Analytics</span>
          </h2>
          <p className="text-xs text-slate-400">
            Export data and track key conversions, AI scores, and country distribution.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCsvClick}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePdfClick}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF Report</span>
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300 transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Success Rate */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold">Success Rate</div>
              <div className="text-2xl font-black text-white mt-1">{successRate}%</div>
              <div className="text-[10px] text-emerald-400 mt-0.5">Applied to Interview/Offer</div>
            </div>
          </CardContent>
        </Card>

        {/* Interview Rate */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl text-cyan-400">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold">Interview Rate</div>
              <div className="text-2xl font-black text-white mt-1">15.2%</div>
              <div className="text-[10px] text-cyan-400 mt-0.5">{interviewCount} Interview invitations</div>
            </div>
          </CardContent>
        </Card>

        {/* Offer Rate */}
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-semibold">Offer Conversion Rate</div>
              <div className="text-2xl font-black text-white mt-1">6.8%</div>
              <div className="text-[10px] text-amber-400 mt-0.5">1 Job Offer received</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Applications Timeline & AI Match Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Applications per day SVG Chart */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-400" /> Daily Applications Submitted
            </CardTitle>
          </CardHeader>
          <CardContent className="h-56 flex items-end justify-between gap-2 pt-6">
            {appTimeline.map((item, idx) => {
              const heightPct = Math.round((item.count / maxTimelineVal) * 75);
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="text-[10px] font-bold text-slate-300">{item.count}</div>
                  <div
                    className="w-full bg-indigo-600 rounded-t-lg transition-all hover:bg-indigo-500 shadow-md shadow-indigo-600/30"
                    style={{ height: `${heightPct}%` }}
                  />
                  <div className="text-[10px] text-slate-400 rotate-45 sm:rotate-0 mt-1">{item.date}</div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* AI Match Score Distribution Histogram */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> AI Match Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3.5 pt-4">
            {scoreDistribution.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">{item.range}</span>
                  <span className="text-slate-200">{item.count} applications ({item.pct}%)</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Resume Performance & Country Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resume Performance Table */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white">Resume Version Benchmarks</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-850 text-slate-500 font-bold">
                  <th className="pb-2">Version</th>
                  <th className="pb-2">Submitted</th>
                  <th className="pb-2">Interviews</th>
                  <th className="pb-2">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {resumePerf.map((res, idx) => (
                  <tr key={idx} className="text-slate-300">
                    <td className="py-2.5 font-semibold text-slate-200">{res.version}</td>
                    <td className="py-2.5">{res.count}</td>
                    <td className="py-2.5">{res.interviews}</td>
                    <td className="py-2.5 font-bold text-emerald-400">{res.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Country Distribution */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-white flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" /> Target Markets Distribution
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {[
              { country: 'Australia', code: 'AU', flag: '🇦🇺', count: stats?.countryBreakdown?.['AU'] || 14 },
              { country: 'Canada', code: 'CA', flag: '🇨🇦', count: stats?.countryBreakdown?.['CA'] || 12 },
              { country: 'Germany', code: 'DE', flag: '🇩🇪', count: stats?.countryBreakdown?.['DE'] || 8 },
            ].map((reg) => {
              const count = reg.count;
              const pct = Math.round((count / (totalApps || 1)) * 100);
              return (
                <div key={reg.code} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-300">
                      {reg.flag} {reg.country}
                    </span>
                    <Badge variant="blue">{count} applications</Badge>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500">{pct}% of overall portfolio</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Row 4: Company Distribution */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-white">Company Applications Distribution</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {companyDistribution.map((item, idx) => (
            <div key={idx} className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between font-bold text-xs text-white">
                <span>{item.name}</span>
                <span className="text-[10px] text-indigo-400 bg-indigo-900/20 px-2 py-0.5 rounded">
                  {item.apps} apps
                </span>
              </div>
              <div className="text-[11px] text-slate-400">Interviews: {item.interviews}</div>
              <div className="text-[11px] font-bold text-cyan-400">{item.status}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};
