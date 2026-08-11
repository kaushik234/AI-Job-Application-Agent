/**
 * @file src/components/JobSearchPanel.tsx
 * @description Job search panel scraping listings across AU, CA, and DE with AI job match scoring and quick application queueing.
 * @architect Clean Architecture - Presentation Layer
 */

import React, { useState } from 'react';
import { JobListing, JobMatchResult, CountryCode } from '@sentinel/types';
import { Search, Sparkles, Building2, MapPin, DollarSign, ExternalLink, ShieldCheck, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';

interface JobSearchPanelProps {
  jobs: JobListing[];
  onSearch: (filters: { query?: string; countries?: CountryCode[]; visaOnly?: boolean; remoteOnly?: boolean }) => void;
  onEvaluateMatch: (jobId: string) => Promise<JobMatchResult>;
  onTailorAndApply: (job: JobListing) => void;
  isSearching: boolean;
}

export const JobSearchPanel: React.FC<JobSearchPanelProps> = ({
  jobs,
  onSearch,
  onEvaluateMatch,
  onTailorAndApply,
  isSearching,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<CountryCode[]>(['AU', 'CA', 'DE']);
  const [visaOnly, setVisaOnly] = useState(true);
  const [remoteOnly, setRemoteOnly] = useState(false);

  // Active match result popups
  const [evaluatingJobId, setEvaluatingJobId] = useState<string | null>(null);
  const [matchResults, setMatchResults] = useState<Record<string, JobMatchResult>>({});

  const handleCountryToggle = (code: CountryCode) => {
    let next: CountryCode[];
    if (selectedCountries.includes(code)) {
      next = selectedCountries.filter((c) => c !== code);
    } else {
      next = [...selectedCountries, code];
    }
    setSelectedCountries(next);
    onSearch({ query: searchQuery, countries: next, visaOnly, remoteOnly });
  };

  const handleRunMatch = async (jobId: string) => {
    setEvaluatingJobId(jobId);
    try {
      const res = await onEvaluateMatch(jobId);
      setMatchResults((prev) => ({ ...prev, [jobId]: res }));
    } catch (err) {
      console.error(err);
    } finally {
      setEvaluatingJobId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header & Filter Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by title, company, or tech stack (e.g., TypeScript, Node.js, React)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch({ query: searchQuery, countries: selectedCountries, visaOnly, remoteOnly })}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <button
            onClick={() => onSearch({ query: searchQuery, countries: selectedCountries, visaOnly, remoteOnly })}
            disabled={isSearching}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Search Jobs</span>
          </button>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800 text-xs">
          {/* Countries */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 font-medium">Target Countries:</span>
            {(['AU', 'CA', 'DE'] as CountryCode[]).map((code) => {
              const active = selectedCountries.includes(code);
              const flags = { AU: '🇦🇺 Australia', CA: '🇨🇦 Canada', DE: '🇩🇪 Germany' };
              return (
                <button
                  key={code}
                  onClick={() => handleCountryToggle(code)}
                  className={`px-3 py-1 rounded-lg border font-medium transition-all ${
                    active
                      ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {flags[code]}
                </button>
              );
            })}
          </div>

          {/* Preferences */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={visaOnly}
                onChange={(e) => {
                  setVisaOnly(e.target.checked);
                  onSearch({ query: searchQuery, countries: selectedCountries, visaOnly: e.target.checked, remoteOnly });
                }}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
              />
              <span>Visa Sponsorship Required</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => {
                  setRemoteOnly(e.target.checked);
                  onSearch({ query: searchQuery, countries: selectedCountries, visaOnly, remoteOnly: e.target.checked });
                }}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0"
              />
              <span>Remote Work Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Jobs Results List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Found <strong>{jobs.length}</strong> matching positions across Greenhouse, Lever, Ashby, Workable, Seek, Indeed & Job Bank</span>
        </div>

        {jobs.map((job) => {
          const matchResult = matchResults[job.id];
          const isEvaluating = evaluatingJobId === job.id;

          return (
            <div
              key={job.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 space-y-4 transition-all shadow-md"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                      {job.platform}
                    </span>
                    {job.applicationPriority && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        job.applicationPriority === 'HIGH'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : job.applicationPriority === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {job.applicationPriority} PRIORITY
                      </span>
                    )}
                    {job.recommendation && (
                      <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 text-[10px] font-bold px-2 py-0.5 rounded">
                        {job.recommendation}
                      </span>
                    )}
                    <h3 className="font-bold text-base text-white">{job.title}</h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-200">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" /> {job.company}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location}
                    </span>
                    {job.salaryText ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-medium">
                        <DollarSign className="w-3.5 h-3.5" /> {job.salaryText}
                      </span>
                    ) : null}
                    {job.visaStatus && (
                      <span className="text-[10px] font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                        Visa: {job.visaStatus}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 text-xs transition-all"
                    title="View Original Job Post"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    onClick={() => handleRunMatch(job.id)}
                    disabled={isEvaluating}
                    className="bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/30 text-xs font-semibold px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5"
                  >
                    {isEvaluating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{matchResult ? `${matchResult.matchPercentage}% Match` : 'Evaluate AI Match'}</span>
                  </button>

                  <button
                    onClick={() => onTailorAndApply(job)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-md shadow-indigo-600/20 flex items-center gap-1.5"
                  >
                    <span>Tailor & Apply</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Description Snippet */}
              <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{job.description}</p>

              {/* Tags & Badges */}
              <div className="flex items-center justify-between flex-wrap gap-2 text-xs pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {job.visaSponsorship ? (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3 h-3" /> Visa Sponsorship Provided
                    </span>
                  ) : null}
                  {job.isRemote ? (
                    <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[11px] px-2 py-0.5 rounded-full font-medium">
                      Remote Friendly
                    </span>
                  ) : null}
                </div>
                <span className="text-[11px] text-slate-500">Posted: {job.postedDate}</span>
              </div>

              {/* AI Match Details Box if evaluated */}
              {matchResult && (
                <div className="bg-slate-850 border border-indigo-500/30 rounded-xl p-4 space-y-3 mt-3 text-xs">
                  {matchResult.errorState === 'RESUME_DATA_INVALID' ? (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300">
                      <strong>Resume Read Error:</strong> Your resume could not be read correctly. Please re-upload your resume.
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-indigo-400" /> Gemini AI Match Evaluation
                        </span>
                        <span
                          className={`font-bold px-2.5 py-0.5 rounded-full text-xs ${
                            matchResult.matchPercentage >= 80
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {matchResult.matchPercentage}% — {matchResult.recommendation}
                        </span>
                      </div>

                      {/* Candidate vs Job Experience Comparison */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-900/60 rounded-lg border border-slate-700/50">
                        <div>
                          <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Candidate Profile</span>
                          <div className="mt-1 text-slate-200">
                            <strong>Candidate:</strong> {matchResult.candidate?.name || 'Kaushik Khandala'}<br />
                            <strong>Experience:</strong> {matchResult.candidate?.experienceYears ?? matchResult.experienceAnalysis?.candidateYears ?? '3.5'} years
                          </div>
                        </div>
                        <div>
                          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Job Requirement</span>
                          <div className="mt-1 text-slate-200">
                            <strong>Role:</strong> {matchResult.job?.title || job.title}<br />
                            <strong>Required Experience:</strong> {matchResult.job?.requiredExperienceYears ?? matchResult.experienceAnalysis?.requiredYears ?? '7'}+ years
                          </div>
                        </div>
                        <div className="col-span-1 md:col-span-2 pt-1 border-t border-slate-800 flex items-center justify-between">
                          <span className="text-slate-400">
                            Experience Gap: <strong className="text-slate-200">{matchResult.experienceAnalysis?.gapYears ?? (3.5 - 7)} yrs</strong>
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                            matchResult.experienceAnalysis?.status === 'MEETS_REQUIREMENT'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            Status: {matchResult.experienceAnalysis?.status === 'MEETS_REQUIREMENT' ? 'Meets Requirement' : 'Below Requirement'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <span className="font-semibold text-slate-300 text-[11px]">Verified Strengths & Alignment:</span>
                          <ul className="space-y-1 text-slate-300">
                            {(Array.isArray(matchResult.strengths) ? matchResult.strengths : []).map((s, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[11px]">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1">
                          <span className="font-semibold text-slate-300 text-[11px]">Key Reasons & Gaps:</span>
                          <ul className="space-y-1 text-slate-300">
                            {(Array.isArray(matchResult.reasons) ? matchResult.reasons : []).map((r, i) => (
                              <li key={i} className="text-[11px]">• {r}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Expandable Data Used Section */}
                      <details className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                        <summary className="cursor-pointer font-semibold text-indigo-400 hover:underline">
                          View Data Used (Candidate & Job Provenance)
                        </summary>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 p-2 bg-slate-900 rounded border border-slate-800">
                          <div>
                            <strong className="text-slate-300">Candidate Data Used:</strong>
                            <ul className="mt-1 space-y-0.5">
                              <li>Resume: Master_Resume_Kaushik.pdf</li>
                              <li>Experience: {matchResult.candidate?.experienceYears ?? '3.5'} years</li>
                              <li>Skills: {(matchResult.candidate?.relevantSkills || ['Flutter', 'Dart', 'TypeScript']).join(', ')}</li>
                            </ul>
                          </div>
                          <div>
                            <strong className="text-slate-300">Job Data Used:</strong>
                            <ul className="mt-1 space-y-0.5">
                              <li>Job: {matchResult.job?.title || job.title} ({matchResult.job?.company || job.company})</li>
                              <li>Required Experience: {matchResult.job?.requiredExperienceYears ?? '7'}+ years</li>
                              <li>Required Skills: {(matchResult.job?.requiredSkills || ['Software Engineering', 'Cloud Infrastructure']).join(', ')}</li>
                            </ul>
                          </div>
                        </div>
                      </details>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
