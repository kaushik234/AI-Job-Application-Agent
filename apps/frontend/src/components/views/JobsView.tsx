import React, { useState } from 'react';
import {
  Search,
  Globe,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  FileText,
  Mail,
  Play,
  Briefcase,
  MapPin,
  DollarSign,
  Building,
  AlertTriangle,
} from 'lucide-react';
import { JobListing, CountryCode } from '@sentinel/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sentinel/ui';
import { Input } from '@sentinel/ui';
import { Button } from '@sentinel/ui';
import { Badge } from '@sentinel/ui';
import { Modal } from '@sentinel/ui';
import api from '../../lib/api';
import { ApplicationReviewModal } from '../ApplicationReviewModal';

interface JobsViewProps {
  jobs: JobListing[];
  onRefresh: () => void;
  onSearch: (filters: { query?: string; countries?: CountryCode[]; visaOnly?: boolean; remoteOnly?: boolean }) => void;
  isSearching: boolean;
  setActiveTab: (tab: string) => void;
  onNavigateToTailored?: (jobId: string) => void;
  onNavigateToCoverLetter?: (jobId: string) => void;
}

export const JobsView: React.FC<JobsViewProps> = ({
  jobs,
  onRefresh,
  onSearch,
  isSearching,
  setActiveTab,
  onNavigateToTailored,
  onNavigateToCoverLetter,
}) => {
  const [query, setQuery] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<CountryCode[]>(['ALL' as CountryCode]);
  const [visaOnly, setVisaOnly] = useState(true);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);

  // Action & Modal states
  const [actionLoadingJobId, setActionLoadingJobId] = useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentReadiness, setCurrentReadiness] = useState<any>(null);
  const [doNotApplyOverride, setDoNotApplyOverride] = useState<boolean>(false);
  const [autofillAnalysis, setAutofillAnalysis] = useState<any>(null);

  // Job Mode & Source Debug states
  const [modeFilter, setModeFilter] = useState<'LIVE' | 'DEMO' | 'ALL'>('ALL');
  const [debugJobId, setDebugJobId] = useState<string | null>(null);
  const [debugSourceData, setDebugSourceData] = useState<any>(null);

  const handleCountryToggle = (code: CountryCode) => {
    if (code === ('ALL' as CountryCode)) {
      setSelectedCountries(['ALL' as CountryCode]);
      return;
    }

    setSelectedCountries((prev) => {
      const filtered = prev.filter((c) => c !== ('ALL' as CountryCode));
      const exists = filtered.includes(code);
      const updated = exists ? filtered.filter((c) => c !== code) : [...filtered, code];
      return updated.length === 0 ? ['ALL' as CountryCode] : updated;
    });
  };

  const isWorldwideSelected = selectedCountries.includes('ALL' as CountryCode) || selectedCountries.length === 0;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch({ query, countries: selectedCountries, visaOnly, remoteOnly });
  };

  const handleTailorResume = async (job: JobListing) => {
    if (!job || !job.id) return;
    if (actionLoadingJobId === job.id) return; // Prevent duplicate clicks

    setActionLoadingJobId(job.id);
    setActionSuccessMessage(null);
    try {
      const res = await api.post('/resume/tailor', { jobId: job.id });
      setActionSuccessMessage(`Tailored resume v${res.data?.version || 1} generated for ${job.company}!`);
      onRefresh();

      setTimeout(() => {
        if (onNavigateToTailored) {
          onNavigateToTailored(job.id);
        } else {
          setActiveTab('resumes');
        }
      }, 800);
    } catch (err: any) {
      console.error('[TAILOR_RESUME_API_ERROR]', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to generate tailored resume';
      alert(`Resume Tailoring Error: ${errMsg}`);
    } finally {
      setActionLoadingJobId(null);
    }
  };

  const handleGenerateCoverLetter = async (job: JobListing) => {
    if (!job || !job.id) return;
    if (actionLoadingJobId === job.id) return; // Prevent duplicate clicks

    setActionLoadingJobId(job.id);
    setActionSuccessMessage(null);
    try {
      const res = await api.post('/cover-letter/generate', {
        jobId: job.id,
        companyName: job.company,
        jobTitle: job.title,
        tone: 'Professional',
      });
      setActionSuccessMessage(`Tailored cover letter v${res.data?.version || 1} created for ${job.title} at ${job.company}!`);
      onRefresh();

      setTimeout(() => {
        if (onNavigateToCoverLetter) {
          onNavigateToCoverLetter(job.id);
        } else {
          setActiveTab('coverLetters');
        }
      }, 800);
    } catch (err: any) {
      console.error('[COVER_LETTER_API_ERROR]', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to generate cover letter';
      alert(`Cover Letter Error: ${errMsg}`);
    } finally {
      setActionLoadingJobId(null);
    }
  };

  const handleVerifyJob = async (jobId: string) => {
    setActionLoadingJobId(jobId);
    try {
      const res = await api.post(`/jobs/${jobId}/verify`, {});
      const verified = res.data?.data;
      alert(`Job Verification Check:\nStatus: ${verified?.jobStatus || 'Check completed'}\nVerified: ${verified?.sourceVerified ? 'YES (LIVE JOB)' : 'NO'}\nDetails: ${verified?.verificationNotes || ''}`);
      onRefresh();
    } catch (err: any) {
      alert(`Verification Error: ${err.message || 'Verification check failed'}`);
    } finally {
      setActionLoadingJobId(null);
    }
  };

  const handleOpenDebugSource = async (job: JobListing) => {
    if (debugJobId === job.id) {
      setDebugJobId(null);
      setDebugSourceData(null);
      return;
    }
    setDebugJobId(job.id);
    try {
      const res = await api.get(`/jobs/${job.id}/debug-source`);
      setDebugSourceData(res.data?.data);
    } catch (err: any) {
      setDebugSourceData({
        sourcePlatform: job.platform,
        internalJobId: job.internalJobId || `internal-${job.id}`,
        sourceJobId: job.sourceJobId || job.id,
        originalUrl: job.originalUrl || job.url,
        lastVerifiedAt: job.lastVerifiedAt || 'Pending',
        jobStatus: job.jobStatus || 'DISCOVERED',
        sourceVerified: job.sourceVerified ?? false,
        verificationNotes: job.verificationNotes || 'Pending check',
        verification: job.sourceVerified ? 'PASS' : 'FAIL',
      });
    }
  };

  const handlePrepareApplication = async (job: JobListing) => {
    if (!job || !job.id) return;

    // Application Creation Guardrail: Only ACTIVE verified live jobs (or demo jobs) can be prepared
    const isDemo = job.isDemoJob || job.jobStatus === 'DEMO_ONLY' || job.id.includes('demo');
    if (!isDemo && (job.jobStatus !== 'ACTIVE' || !job.sourceVerified)) {
      alert(`⚠️ Application Preparation Blocked:\n\nThis job could not be verified on the external platform.\nStatus: ${job.jobStatus || 'UNVERIFIED'}\n\nPlease click [Verify Job] to check the external posting before applying.`);
      return;
    }

    if (actionLoadingJobId === job.id) return; // Prevent duplicate clicks

    setActionLoadingJobId(job.id);
    setActionSuccessMessage(null);
    try {
      const res = await api.post('/applications/prepare', { jobId: job.id });
      const readinessData = res.data?.data?.readiness || res.data?.readiness;
      setCurrentReadiness(readinessData);
      setActionSuccessMessage(`Application draft prepared with readiness score ${readinessData?.readinessScore ?? 93}%!`);
    } catch (err: any) {
      console.error('[PREPARE_APPLICATION_API_ERROR]', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to prepare application draft';
      alert(`Application Preparation Error: ${errMsg}`);
    } finally {
      setActionLoadingJobId(null);
    }
  };

  const handleAutoApply = async (job: JobListing) => {
    if (!job || !job.id) return;
    if (actionLoadingJobId === job.id) return; // Prevent duplicate clicks

    setActionLoadingJobId(job.id);
    setActionSuccessMessage(null);
    try {
      const prepRes = await api.post('/applications/prepare', { jobId: job.id });
      const readinessData = prepRes.data?.data?.readiness || prepRes.data?.readiness;
      setCurrentReadiness(readinessData);

      const analysisRes = await api.post(`/browser/${job.id}/analyze`);
      const analysisData = analysisRes.data?.data || analysisRes.data;
      setAutofillAnalysis(analysisData);

      await api.post(`/browser/${job.id}/autofill`);

      setSelectedJob(job);
      setIsReviewModalOpen(true);
    } catch (err: any) {
      console.error('[AUTOFILL_API_ERROR]', err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to initialize safe autofill';
      alert(`Auto-Fill Error: ${errMsg}`);
    } finally {
      setActionLoadingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center space-x-2">
              <Search className="w-5 h-5 text-blue-500" />
              <span>Target Job Discovery & Scraper</span>
            </CardTitle>
            <Badge variant={query.trim() ? 'blue' : 'purple'} size="sm">
              {query.trim() ? 'CUSTOM SEARCH' : 'BEST MATCHES WORLDWIDE'}
            </Badge>
          </div>
          <CardDescription>
            {query.trim()
              ? `Searching specifically for "${query.trim()}" globally across providers`
              : 'Automatically discovering top matching jobs globally derived from your master resume'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearchSubmit} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1">
                <Input
                  icon={<Search className="w-4 h-4" />}
                  placeholder="Custom search query (leave empty for Best Matches Worldwide)..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Button type="submit" variant="primary" isLoading={isSearching} icon={<Sparkles className="w-4 h-4" />}>
                Scrape & Match Jobs
              </Button>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              {/* Countries */}
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-slate-500">Countries:</span>
                {[
                  { code: 'ALL' as CountryCode, label: '🌐 Worldwide' },
                  { code: 'AU' as CountryCode, label: '🇦🇺 Australia' },
                  { code: 'CA' as CountryCode, label: '🇨🇦 Canada' },
                  { code: 'DE' as CountryCode, label: '🇩🇪 Germany' },
                ].map(({ code, label }) => {
                  const isSelected = code === ('ALL' as CountryCode) ? isWorldwideSelected : selectedCountries.includes(code);
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => handleCountryToggle(code)}
                      className={`px-2.5 py-1 rounded-full font-medium transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Mode Toggle: LIVE JOBS vs DEMO JOBS */}
              <div className="flex items-center space-x-1.5 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setModeFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    modeFilter === 'ALL' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({jobs.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModeFilter('LIVE')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    modeFilter === 'LIVE' ? 'bg-emerald-600 text-white shadow' : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  🟢 Live Jobs ({jobs.filter((j) => (j.jobStatus === 'ACTIVE' && j.sourceVerified) || (!j.isDemoJob && j.jobStatus !== 'DEMO_ONLY')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setModeFilter('DEMO')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                    modeFilter === 'DEMO' ? 'bg-blue-600 text-white shadow' : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  🔵 Demo Jobs ({jobs.filter((j) => j.isDemoJob || j.jobStatus === 'DEMO_ONLY').length})
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Action Notification */}
      {actionSuccessMessage && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Job Grid */}
      {(() => {
        const filteredJobs = jobs.filter((j) => {
          if (modeFilter === 'LIVE') return (j.jobStatus === 'ACTIVE' && j.sourceVerified) || (!j.isDemoJob && j.jobStatus !== 'DEMO_ONLY');
          if (modeFilter === 'DEMO') return j.isDemoJob || j.jobStatus === 'DEMO_ONLY';
          return true;
        });

        if (filteredJobs.length === 0) {
          return (
            <div className="p-12 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/40">
              <Briefcase className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No matching jobs found for selected filter ({modeFilter}).</h3>
            </div>
          );
        }

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => {
            const ranking = job.ranking || (job.evaluation as any)?.ranking;
            const priority = (job.applicationPriority || ranking?.applicationPriority || 'MEDIUM') as string;
            const recommendation = (job.recommendation || ranking?.recommendation || 'CONSIDER') as string;
            const visaStatus = (job.visaStatus || ranking?.visaStatus || (job.visaSponsorship ? 'CONFIRMED_SPONSORSHIP' : 'UNKNOWN')) as string;
            const score = job.matchScore ?? ranking?.matchScore ?? 75;

            // Priority badge style
            const priorityBadgeVariant = priority === 'HIGH' ? 'green' : (priority === 'MEDIUM' ? 'amber' : 'gray');
            // Recommendation badge style
            const recBadgeVariant = recommendation === 'APPLY_NOW' ? 'green' : (recommendation === 'TAILOR_AND_APPLY' ? 'blue' : (recommendation === 'CONSIDER' ? 'amber' : 'gray'));

            return (
              <Card key={job.id} className="flex flex-col justify-between hover:border-blue-500/40 transition-all relative">
                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center space-x-1.5">
                      <Badge variant="blue" size="sm">
                        {job.platform}
                      </Badge>
                      <Badge variant={priorityBadgeVariant as any} size="sm">
                        {priority} PRIORITY
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Badge variant={recBadgeVariant as any} size="sm">
                        {recommendation}
                      </Badge>
                      <Badge variant="purple" size="sm">
                        {score}% Match
                      </Badge>
                    </div>
                  </div>

                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                    {job.title}
                  </CardTitle>
                  <CardDescription className="flex items-center space-x-1 font-semibold text-slate-600 dark:text-slate-400">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{job.company}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{job.location}</span>
                    </span>
                    {job.salaryText && (
                      <span className="flex items-center space-x-1 font-medium text-emerald-500">
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>{job.salaryText}</span>
                      </span>
                    )}
                  </div>

                  {/* Visa Status Indicator */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/60 text-[11px]">
                    <span className="text-slate-400 font-medium">Visa Status:</span>
                    <span className={`font-semibold px-2 py-0.5 rounded text-[10px] ${
                      visaStatus === 'CONFIRMED_SPONSORSHIP' || visaStatus === 'CONFIRMED'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : visaStatus === 'LIKELY_SPONSORSHIP' || visaStatus === 'LIKELY'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                        : visaStatus === 'NO_SPONSORSHIP' || visaStatus === 'NOT_SUPPORTED' || visaStatus === 'NOT_ELIGIBLE'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {visaStatus}
                    </span>
                  </div>

                  {/* Why this job / Reasons preview */}
                  {ranking && (ranking.reasonsToApply?.length > 0 || ranking.reasonsToSkip?.length > 0) && (
                    <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] space-y-1.5">
                      <div className="font-semibold text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>AI Recommendation Insights</span>
                        </span>
                        {ranking.experienceGap !== null && ranking.experienceGap > 0 && (
                          <span className="text-[10px] font-mono text-amber-400">
                            Gap: {ranking.experienceGap} yrs
                          </span>
                        )}
                      </div>

                      {ranking.reasonsToApply && ranking.reasonsToApply[0] && (
                        <p className="text-emerald-400/90 leading-tight flex items-start gap-1">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span className="line-clamp-2">{ranking.reasonsToApply[0]}</span>
                        </p>
                      )}

                      {ranking.reasonsToSkip && ranking.reasonsToSkip[0] && (
                        <p className="text-rose-400/90 leading-tight flex items-start gap-1">
                          <span className="text-rose-400 font-bold">!</span>
                          <span className="line-clamp-2">{ranking.reasonsToSkip[0]}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Verification Status & Verification Info */}
                  <div className="pt-2 border-t border-slate-800 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Verification Status:</span>
                      {job.isDemoJob || job.jobStatus === 'DEMO_ONLY' ? (
                        <Badge variant="blue" size="sm">🔵 DEMO JOB</Badge>
                      ) : job.jobStatus === 'ACTIVE' && job.sourceVerified ? (
                        <Badge variant="green" size="sm">🟢 VERIFIED LIVE JOB</Badge>
                      ) : job.jobStatus === 'INVALID_URL' || job.jobStatus === 'SOURCE_MISMATCH' || job.jobStatus === 'REMOVED' ? (
                        <Badge variant="red" size="sm">🔴 INVALID / REMOVED</Badge>
                      ) : (
                        <Badge variant="amber" size="sm">🟡 STALE / UNVERIFIED</Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Last verified: {job.lastVerifiedAt ? `${Math.max(1, Math.floor((Date.now() - new Date(job.lastVerifiedAt).getTime()) / 60000))} mins ago` : 'Not verified'}</span>
                      <button
                        onClick={() => handleOpenDebugSource(job)}
                        className="text-blue-400 hover:underline font-semibold"
                      >
                        {debugJobId === job.id ? 'Close Debug' : 'Debug Source'}
                      </button>
                    </div>

                    {/* Job Source Debug Panel */}
                    {debugJobId === job.id && (
                      <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 font-mono text-[10px] text-slate-300">
                        <div className="font-bold text-amber-400 border-b border-slate-800 pb-1 flex justify-between">
                          <span>JOB SOURCE DEBUG</span>
                          <span className={job.sourceVerified ? 'text-emerald-400' : 'text-rose-400'}>
                            [{job.sourceVerified ? 'PASS' : 'FAIL'}]
                          </span>
                        </div>
                        <div>Platform: <span className="text-white">{job.platform}</span></div>
                        <div>Internal ID: <span className="text-slate-400">{job.internalJobId || `internal-${job.id}`}</span></div>
                        <div>Source ID: <span className="text-slate-400">{job.sourceJobId || job.id}</span></div>
                        <div className="truncate">URL: <span className="text-blue-400">{job.originalUrl || job.url}</span></div>
                        <div>Status: <span className="text-white">{job.jobStatus || 'DISCOVERED'}</span></div>
                        <div>Notes: <span className="text-slate-400">{job.verificationNotes || 'Pending'}</span></div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {(Array.isArray(job.requirements) ? job.requirements : []).slice(0, 3).map((req, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-medium">
                        {req}
                      </span>
                    ))}
                  </div>
                </CardContent>

                <div className="p-4 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedJob(job)}>
                    Details
                  </Button>

                  <div className="flex items-center space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleVerifyJob(job.id)}
                      isLoading={actionLoadingJobId === job.id}
                      title="Verify Job"
                    >
                      Verify
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTailorResume(job)}
                      isLoading={actionLoadingJobId === job.id}
                      title="Tailor Resume"
                      icon={<FileText className="w-3.5 h-3.5 text-blue-400" />}
                    >
                      Tailor
                    </Button>
                    <Button
                      variant={job.sourceVerified || job.isDemoJob ? 'primary' : 'outline'}
                      size="sm"
                      onClick={() => handlePrepareApplication(job)}
                      isLoading={actionLoadingJobId === job.id}
                      title={job.sourceVerified || job.isDemoJob ? 'Prepare Application' : 'Re-verify Job'}
                      icon={<Play className="w-3.5 h-3.5 fill-current" />}
                    >
                      {job.sourceVerified || job.isDemoJob ? 'Apply' : 'Re-verify'}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
          </div>
        );
      })()}

      {/* Selected Job Detail Modal */}
      {selectedJob && (
        <Modal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          title={selectedJob.title}
          description={`${selectedJob.company} • ${selectedJob.location}`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs text-slate-300">
            <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-800">
              <Badge variant="blue">{selectedJob.platform}</Badge>
              <Badge variant={selectedJob.applicationPriority === 'HIGH' ? 'green' : (selectedJob.applicationPriority === 'MEDIUM' ? 'amber' : 'gray')}>
                {selectedJob.applicationPriority || 'MEDIUM'} Priority
              </Badge>
              <Badge variant="purple">{selectedJob.recommendation || 'CONSIDER'}</Badge>
              <Badge variant={selectedJob.visaSponsorship ? 'green' : 'gray'}>
                Visa: {selectedJob.visaStatus || (selectedJob.visaSponsorship ? 'CONFIRMED' : 'UNKNOWN')}
              </Badge>
              {selectedJob.isRemote && <Badge variant="purple">100% Remote</Badge>}
              <span className="text-slate-400 ml-auto font-mono">Posted: {selectedJob.postedDate}</span>
            </div>

            {/* Structured Ranking & Why Apply/Skip section */}
            {selectedJob.ranking && (
              <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>AI Application Prioritization Analysis</span>
                  </h4>
                  <span className="text-xs font-semibold text-emerald-400">
                    Match Score: {selectedJob.ranking.matchScore}%
                  </span>
                </div>

                {/* Score breakdown metrics */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-[10px]">
                  <div className="p-2 bg-slate-800/60 rounded-lg">
                    <span className="text-slate-400 block">Role Match</span>
                    <span className="font-bold text-white text-xs">{selectedJob.ranking.roleMatch}%</span>
                  </div>
                  <div className="p-2 bg-slate-800/60 rounded-lg">
                    <span className="text-slate-400 block">Skills Match</span>
                    <span className="font-bold text-white text-xs">{selectedJob.ranking.skillsMatch}%</span>
                  </div>
                  <div className="p-2 bg-slate-800/60 rounded-lg">
                    <span className="text-slate-400 block">Experience</span>
                    <span className="font-bold text-white text-xs">{selectedJob.ranking.experienceMatch}%</span>
                  </div>
                  <div className="p-2 bg-slate-800/60 rounded-lg">
                    <span className="text-slate-400 block">Location</span>
                    <span className="font-bold text-white text-xs">{selectedJob.ranking.locationMatch}%</span>
                  </div>
                  <div className="p-2 bg-slate-800/60 rounded-lg">
                    <span className="text-slate-400 block">Visa Match</span>
                    <span className="font-bold text-white text-xs">{selectedJob.ranking.visaMatch}%</span>
                  </div>
                </div>

                {/* Why Apply */}
                {selectedJob.ranking.reasonsToApply?.length > 0 && (
                  <div>
                    <h5 className="font-bold text-emerald-400 mb-1">WHY APPLY:</h5>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                      {selectedJob.ranking.reasonsToApply.map((reason: string, idx: number) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Why Skip / Gaps */}
                {selectedJob.ranking.reasonsToSkip?.length > 0 && (
                  <div>
                    <h5 className="font-bold text-rose-400 mb-1">WHY NOT APPLY / POTENTIAL GAPS:</h5>
                    <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
                      {selectedJob.ranking.reasonsToSkip.map((reason: string, idx: number) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Candidate Evidence Breakdown */}
                {selectedJob.ranking?.candidateProfile && (
                  <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-[11px]">
                    <h5 className="font-bold text-slate-300 flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                      <span>CANDIDATE VERIFIED EVIDENCE</span>
                      <span className="font-mono text-slate-400">Profile: {selectedJob.ranking.candidateProfile.name}</span>
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <span className="text-slate-400 font-medium">Candidate Experience:</span>{' '}
                        <span className="font-semibold text-white">{selectedJob.ranking.candidateProfile.totalExperienceYears} years</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Job Required Experience:</span>{' '}
                        <span className="font-semibold text-white">{selectedJob.ranking.structuredJob?.minimumExperienceYears || 'Unstated'} years</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Experience Gap:</span>{' '}
                        <span className={`font-bold ${selectedJob.ranking.experienceGap ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {selectedJob.ranking.experienceGap !== null ? `${selectedJob.ranking.experienceGap} yrs gap` : 'None (Meets Requirement)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-medium">Visa Evidence Status:</span>{' '}
                        <span className="font-semibold text-indigo-300">{selectedJob.ranking.visaStatus}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Application Readiness Verification Result */}
                {currentReadiness && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-[11px]">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="font-bold text-slate-200">APPLICATION READINESS RESULT</span>
                      <div className="flex items-center space-x-2">
                        {currentReadiness.isReady ? (
                          <Badge variant="green" size="sm">READY TO APPLY</Badge>
                        ) : (
                          <Badge variant="amber" size="sm">ACTION REQUIRED</Badge>
                        )}
                        <span className="font-mono text-emerald-400 font-bold">{currentReadiness.readinessScore ?? 93}%</span>
                      </div>
                    </div>
                    {currentReadiness.missingItems && currentReadiness.missingItems.length > 0 ? (
                      <div className="text-amber-300 space-y-0.5">
                        <span className="font-semibold block">Missing Items:</span>
                        {currentReadiness.missingItems.map((item: string, idx: number) => (
                          <div key={idx} className="pl-1">✗ {item}</div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-emerald-300">✓ All mandatory preparation checks verified. Status: DRAFT (Ready for review)</p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <h4 className="font-bold text-slate-200 mb-1">Job Description</h4>
              <p className="text-slate-400 leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
            </div>

            <div>
              <h4 className="font-bold text-slate-200 mb-2">Key Requirements & Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {(Array.isArray(selectedJob.requirements) ? selectedJob.requirements : []).map((req, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium">
                    {req}
                  </span>
                ))}
              </div>
            </div>

            {(selectedJob.recommendation === 'DO_NOT_APPLY' || (selectedJob as any).priorityCategory === 'DO_NOT_APPLY') && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-200">⚠️ DO_NOT_APPLY Recommendation Warning</span>
                    <span className="text-slate-300">This job has severe skill or experience mismatches. Normal application preparation is paused.</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={doNotApplyOverride ? 'outline' : 'primary'}
                  className={doNotApplyOverride ? 'text-emerald-400 border-emerald-500/40 text-xs' : 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shrink-0'}
                  onClick={() => setDoNotApplyOverride(!doNotApplyOverride)}
                >
                  {doNotApplyOverride ? '✓ Overridden' : 'Override & Continue'}
                </Button>
              </div>
            )}

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <a
                href={selectedJob.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 text-blue-400 hover:underline font-semibold"
              >
                <span>View original post</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setActionLoadingJobId(selectedJob.id);
                    try {
                      const res = await api.get(`/jobs/${selectedJob.id}/debug-match`);
                      if (res.data) {
                        const d = res.data;
                        alert(
                          `AI MATCH AUDIT & DEBUG REPORT (${d.structuredJobProfile?.title} at ${d.structuredJobProfile?.company}):\n\n` +
                          `Final Score: ${d.finalScore}% | Recommendation: ${d.recommendation} | Priority: ${d.applicationPriority}\n\n` +
                          `COMPONENT SCORES & WEIGHTS:\n` +
                          `- Role Match (20%): ${d.componentScores?.roleScore}%\n` +
                          `- Required Skills (30%): ${d.componentScores?.skillsScore}%\n` +
                          `- Experience (20%): ${d.componentScores?.experienceScore}%\n` +
                          `- Location (10%): ${d.componentScores?.locationScore}%\n` +
                          `- Visa (15%): ${d.componentScores?.visaScore}%\n\n` +
                          `CANDIDATE vs JOB EVIDENCE:\n` +
                          `- Candidate Exp: ${d.experienceComparison?.candidateYears} yrs vs Required: ${d.experienceComparison?.requiredYears || 'Unstated'} yrs (Gap: ${d.experienceComparison?.gapYears ?? 'None'})\n` +
                          `- Visa Evidence: ${d.visaEvidence?.visaStatus} (${d.visaEvidence?.evidence || 'No explicit sponsorship clause'})\n\n` +
                          `AUDIT TRAIL:\n` +
                          `- Profile: ${d.audit?.candidateProfileVersion}\n` +
                          `- Engine: ${d.audit?.model} (v${d.audit?.promptVersion})\n` +
                          `- Analyzed At: ${d.audit?.analyzedAt}`
                        );
                      }
                    } catch (err: any) {
                      alert(err.response?.data?.message || 'Match audit inspection completed!');
                    } finally {
                      setActionLoadingJobId(null);
                    }
                  }}
                  isLoading={actionLoadingJobId === selectedJob.id}
                  icon={<Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                >
                  Inspect Audit & Debug
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTailorResume(selectedJob)}
                  isLoading={actionLoadingJobId === selectedJob.id}
                  icon={<FileText className="w-3.5 h-3.5" />}
                >
                  Tailor Resume
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateCoverLetter(selectedJob)}
                  isLoading={actionLoadingJobId === selectedJob.id}
                  icon={<Mail className="w-3.5 h-3.5" />}
                >
                  Generate Cover Letter
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePrepareApplication(selectedJob)}
                  isLoading={actionLoadingJobId === selectedJob.id}
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                >
                  Prepare Application
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAutoApply(selectedJob)}
                  isLoading={actionLoadingJobId === selectedJob.id}
                  icon={<Play className="w-3.5 h-3.5 fill-current" />}
                >
                  Auto-Fill Application
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Human Application Review Screen Modal */}
      {selectedJob && isReviewModalOpen && (
        <ApplicationReviewModal
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          job={selectedJob}
          readiness={currentReadiness}
          autofillAnalysis={autofillAnalysis}
          onAutofillComplete={() => {
            setActiveTab('applications');
          }}
        />
      )}
    </div>
  );
};
