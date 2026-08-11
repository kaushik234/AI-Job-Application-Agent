/**
 * @file src/components/ApplicationTracker.tsx
 * @description SQLite Application Tracker table component supporting status transitions, timestamps, and notes.
 * @architect Clean Architecture - Presentation Layer
 */

import React, { useState } from 'react';
import { ApplicationRecord, ApplicationStatus, CountryCode } from '@sentinel/types';
import { Table, Search, ExternalLink, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

interface ApplicationTrackerProps {
  applications: ApplicationRecord[];
  onUpdateStatus: (id: string, status: ApplicationStatus, notes?: string) => Promise<void>;
}

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ applications, onUpdateStatus }) => {
  const [filterCountry, setFilterCountry] = useState<CountryCode | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const statusOptions = Object.values(ApplicationStatus);

  const filteredApps = applications.filter((app) => {
    if (filterCountry !== 'ALL' && app.country !== filterCountry) return false;
    if (filterStatus !== 'ALL' && app.status !== filterStatus) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      return app.company.toLowerCase().includes(q) || app.jobTitle.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Filter applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none"
            />
          </div>

          <select
            value={filterCountry}
            onChange={(e) => setFilterCountry(e.target.value as CountryCode | 'ALL')}
            className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
          >
            <option value="ALL">All Countries</option>
            <option value="AU">🇦🇺 Australia</option>
            <option value="CA">🇨🇦 Canada</option>
            <option value="DE">🇩🇪 Germany</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
          >
            <option value="ALL">All Statuses</option>
            {statusOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="text-slate-400 font-medium">
          Showing <strong>{filteredApps.length}</strong> tracked applications
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-800/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <th className="p-3.5">Company & Role</th>
                <th className="p-3.5">Country</th>
                <th className="p-3.5">Match Score</th>
                <th className="p-3.5">Application Status</th>
                <th className="p-3.5">Timestamps</th>
                <th className="p-3.5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    No applications matched the current filters.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/40 transition-all">
                    <td className="p-3.5 space-y-0.5">
                      <div className="font-bold text-white text-sm">{app.company}</div>
                      <div className="text-indigo-300 font-medium">{app.jobTitle}</div>
                    </td>

                    <td className="p-3.5">
                      <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-slate-200 font-medium">
                        {app.country === 'AU' ? '🇦🇺 Australia' : app.country === 'CA' ? '🇨🇦 Canada' : '🇩🇪 Germany'}
                      </span>
                    </td>

                    <td className="p-3.5">
                      <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {app.matchScore}%
                      </span>
                    </td>

                    <td className="p-3.5">
                      <select
                        value={app.status}
                        onChange={(e) => onUpdateStatus(app.id, e.target.value as ApplicationStatus)}
                        className="bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:border-indigo-500"
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>

                    <td className="p-3.5 space-y-0.5 text-[11px] text-slate-400">
                      <div>Updated: {app.lastUpdatedAt.split('T')[0]}</div>
                      {app.appliedAt && <div className="text-indigo-400">Applied: {app.appliedAt.split('T')[0]}</div>}
                    </td>

                    <td className="p-3.5">
                      <a
                        href={app.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 inline-flex items-center gap-1 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Posting</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
