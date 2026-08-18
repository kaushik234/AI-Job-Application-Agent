'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Menu, Sun, Moon } from 'lucide-react';
import { queryClient } from '../lib/queryClient';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { AuthView } from '../components/views/AuthView';
import { Sidebar } from '@sentinel/ui';
import { DashboardOverviewView } from '../components/views/DashboardOverviewView';
import { JobsView } from '../components/views/JobsView';
import { ApplicationsView } from '../components/views/ApplicationsView';
import { ResumeManagerView } from '../components/views/ResumeManagerView';
import { CoverLetterManagerView } from '../components/views/CoverLetterManagerView';
import { AnalyticsView } from '../components/views/AnalyticsView';
import { SettingsView } from '../components/views/SettingsView';
import { ProfileView } from '../components/views/ProfileView';
import { BrowserAutomationSimulator } from '../components/BrowserAutomationSimulator';
import { EmailMonitorPanel } from '../components/EmailMonitorPanel';
import api from '../lib/api';

import {
  JobListing,
  MasterResume,
  TailoredResume,
  CoverLetter,
  ApplicationRecord,
  EmailRecord,
  AgentSettings,
  DashboardStats,
  CountryCode,
} from '@sentinel/types';

const MainAppContent: React.FC = () => {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const { isDark, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  const [resumeSubTab, setResumeSubTab] = useState<'master' | 'tailored' | 'history'>('master');
  const [selectedTailoredJobId, setSelectedTailoredJobId] = useState<string | null>(null);
  const [selectedCoverLetterJobId, setSelectedCoverLetterJobId] = useState<string | null>(null);

  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [masterResume, setMasterResume] = useState<MasterResume | null>(null);
  const [tailoredResumes, setTailoredResumes] = useState<TailoredResume[]>([]);
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [settings, setSettings] = useState<AgentSettings | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    applicationsToday: 0,
    dailyLimit: 10,
    totalApplications: 0,
    successRate: 0,
    pendingApprovalCount: 0,
    interviewsCount: 0,
    resumeVersionsCount: 0,
    countryBreakdown: { AU: 0, CA: 0, DE: 0 },
    statusBreakdown: {},
  });

  const [isSearching, setIsSearching] = useState(false);
  const [isRunningPipeline, setIsRunningPipeline] = useState(false);
  const [isCheckingEmails, setIsCheckingEmails] = useState(false);

  const isLiveScrapeActiveRef = React.useRef(false);

  const fetchAllData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [jobsRes, appsRes, statsRes, masterRes, settingsRes, coverRes, tailoredRes, emailRes] = await Promise.all([
        api.get('/jobs').catch(() => ({ data: [] })),
        api.get('/applications').catch(() => ({ data: [] })),
        api.get('/applications/stats').catch(() => ({ data: {} })),
        api.get('/resume/master').catch(() => ({ data: null })),
        api.get('/settings').catch(() => ({ data: null })),
        api.get('/cover-letter').catch(() => ({ data: [] })),
        api.get('/resume/tailored').catch(() => ({ data: [] })),
        api.get('/email/messages').catch(() => ({ data: [] })),
      ]);

      const extractPayload = (res: any) => {
        if (!res || !res.data) return null;
        if (res.data.data !== undefined) return res.data.data;
        return res.data;
      };

      const appsData = extractPayload(appsRes);
      if (Array.isArray(appsData)) setApplications(appsData);

      const statsData = extractPayload(statsRes);
      if (statsData && typeof statsData === 'object' && statsData.countryBreakdown) {
        setStats(statsData);
      }

      const masterData = extractPayload(masterRes);
      if (masterData) setMasterResume(masterData);

      const settingsData = extractPayload(settingsRes);
      if (settingsData) setSettings(settingsData);

      const coverData = extractPayload(coverRes);
      if (Array.isArray(coverData)) setCoverLetters(coverData);

      const tailoredData = extractPayload(tailoredRes);
      if (Array.isArray(tailoredData)) setTailoredResumes(tailoredData);

      const emailData = extractPayload(emailRes);
      if (Array.isArray(emailData)) setEmails(emailData);
    } catch (err) {
      console.error('Failed to sync backend state:', err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
      const interval = setInterval(fetchAllData, 12000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchAllData]);

  const handleSearchJobs = async (filters: { query?: string; countries?: CountryCode[]; visaOnly?: boolean; remoteOnly?: boolean }) => {
    setIsSearching(true);
    isLiveScrapeActiveRef.current = true;
    console.log('[TARGET_JOBS] Discovery started');
    try {
      const payload = {
        q: filters.query,
        query: filters.query,
        countries: filters.countries,
        visaOnly: filters.visaOnly === true,
        remoteOnly: filters.remoteOnly === true,
      };

      const res = await api.post('/jobs/discover', payload, { timeout: 60000 });
      console.log('[TARGET_JOBS] Discovery completed');

      const freshJobs = Array.isArray(res.data?.jobs)
        ? res.data.jobs
        : Array.isArray(res.data?.report?.jobs)
        ? res.data.report.jobs
        : [];

      console.log(`[TARGET_JOBS] Received ${freshJobs.length} verified jobs`);
      console.log(`[TARGET_JOBS] Rendering ${freshJobs.length} fresh jobs`);

      setJobs(freshJobs);
    } catch (err) {
      console.error('[TARGET_JOBS] Discovery failed:', err);
      console.log('[TARGET_JOBS] Received 0 verified jobs');
      console.log('[TARGET_JOBS] Rendering 0 fresh jobs');
      setJobs([]);
    } finally {
      setIsSearching(false);
      isLiveScrapeActiveRef.current = false;
    }
  };



  const handleRunPipeline = async () => {
    setIsRunningPipeline(true);
    try {
      await api.post('/automation/run', { confirmMode: 'AUTOMATIC' });
      await fetchAllData();
    } catch (err) {
      console.error('Pipeline trigger failed:', err);
    } finally {
      setIsRunningPipeline(false);
    }
  };

  const handleCheckEmails = async () => {
    setIsCheckingEmails(true);
    try {
      const res = await api.post('/email/scan');
      if (res.data) setEmails(res.data);
      await fetchAllData();
    } catch (err) {
      console.error('Email scan failed:', err);
    } finally {
      setIsCheckingEmails(false);
    }
  };

  const handleTriggerApply = async (jobId: string) => {
    const res = await api.post('/automation/run', { jobId, confirmMode: 'AUTOMATIC' });
    await fetchAllData();
    return res.data;
  };

  const handleConfirmCaptcha = async (jobId: string) => {
    await api.post('/automation/run', { jobId, confirmMode: 'MANUAL_APPROVAL' });
    await fetchAllData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold tracking-wider text-slate-400">Loading SENTINEL AI Workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        pendingApprovalsCount={stats.pendingApprovalCount}
        user={user}
        onLogout={logout}
        isDark={isDark}
        onToggleTheme={() => setTheme(isDark ? 'light' : 'dark')}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base font-extrabold tracking-tight text-white capitalize">
              {activeTab.replace(/([A-Z])/g, ' $1')}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-amber-400 transition-colors"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
            </button>

            <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-slate-800">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white uppercase">
                {user?.firstName ? user.firstName[0] : 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-300">
                {user?.firstName} {user?.lastName}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {activeTab === 'overview' && (
            <DashboardOverviewView
              stats={stats}
              applications={applications}
              masterResume={masterResume}
              tailoredResumes={tailoredResumes}
              coverLetters={coverLetters}
              jobs={jobs}
              onTriggerSearch={() => handleSearchJobs({})}
              onRunAutomation={handleRunPipeline}
              onCheckEmails={handleCheckEmails}
              isSearching={isSearching}
              isRunningPipeline={isRunningPipeline}
              isCheckingEmails={isCheckingEmails}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'jobs' && (
            <JobsView
              jobs={jobs}
              onRefresh={fetchAllData}
              onSearch={handleSearchJobs}
              isSearching={isSearching}
              setActiveTab={setActiveTab}
              onNavigateToTailored={(jobId) => {
                setResumeSubTab('tailored');
                setSelectedTailoredJobId(jobId);
                fetchAllData();
                setActiveTab('resumes');
              }}
              onNavigateToCoverLetter={(jobId) => {
                setSelectedCoverLetterJobId(jobId);
                fetchAllData();
                setActiveTab('coverLetters');
              }}
            />
          )}

          {activeTab === 'applications' && (
            <ApplicationsView
              applications={applications}
              onRefresh={fetchAllData}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'resumes' && (
            <ResumeManagerView
              masterResume={masterResume}
              tailoredResumes={tailoredResumes}
              onRefresh={fetchAllData}
              initialTab={resumeSubTab}
              selectedJobId={selectedTailoredJobId}
            />
          )}

          {activeTab === 'coverLetters' && (
            <CoverLetterManagerView
              coverLetters={coverLetters}
              jobs={jobs}
              onRefresh={fetchAllData}
              selectedJobId={selectedCoverLetterJobId}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsView
              stats={stats}
              applications={applications}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onRefresh={fetchAllData}
            />
          )}

          {activeTab === 'profile' && <ProfileView />}

          {activeTab === 'simulator' && (
            <BrowserAutomationSimulator
              applications={applications}
              onTriggerApply={handleTriggerApply}
              onConfirmCaptcha={handleConfirmCaptcha}
            />
          )}

          {activeTab === 'email' && (
            <EmailMonitorPanel
              emails={emails}
              onCheckEmails={handleCheckEmails}
              isChecking={isCheckingEmails}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default function HomePage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <MainAppContent />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
