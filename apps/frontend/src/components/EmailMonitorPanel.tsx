/**
 * @file src/components/EmailMonitorPanel.tsx
 * @description Gmail Recruiter Email Classifier component with automatic status updates, category filter tabs, and confidence scores.
 * @architect Clean Architecture - Presentation Layer
 */

import React, { useState } from 'react';
import { EmailRecord, EmailCategory } from '@sentinel/types';
import { Mail, RefreshCw, Sparkles, CheckCircle2, AlertTriangle, XCircle, Clock, Search, ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';

interface EmailMonitorPanelProps {
  emails: EmailRecord[];
  onCheckEmails: () => Promise<void>;
  isChecking: boolean;
}

export const EmailMonitorPanel: React.FC<EmailMonitorPanelProps> = ({ emails, onCheckEmails, isChecking }) => {
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  const getCategoryBadge = (category: EmailCategory) => {
    switch (category) {
      case EmailCategory.INTERVIEW:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case EmailCategory.ASSESSMENT:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case EmailCategory.OFFER:
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case EmailCategory.REJECTION:
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      case EmailCategory.SPAM:
        return 'bg-slate-800 text-slate-400 border-slate-700';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const filteredEmails = emails.filter((msg) => {
    const matchesCat = activeCategory === 'ALL' || msg.classifiedCategory === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      msg.sender.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (msg.matchedCompany && msg.matchedCompany.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const categoryCounts = {
    ALL: emails.length,
    [EmailCategory.INTERVIEW]: emails.filter((e) => e.classifiedCategory === EmailCategory.INTERVIEW).length,
    [EmailCategory.ASSESSMENT]: emails.filter((e) => e.classifiedCategory === EmailCategory.ASSESSMENT).length,
    [EmailCategory.OFFER]: emails.filter((e) => e.classifiedCategory === EmailCategory.OFFER).length,
    [EmailCategory.REJECTION]: emails.filter((e) => e.classifiedCategory === EmailCategory.REJECTION).length,
    [EmailCategory.SPAM]: emails.filter((e) => e.classifiedCategory === EmailCategory.SPAM).length,
  };

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Mail className="w-4 h-4 text-cyan-400" /> Gmail Inbound Recruiter Monitor
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Gemini AI classifies recruiter replies (Interview, Assessment, Offer, Rejection, Spam) and auto-updates tracker status.
          </p>
        </div>

        <button
          onClick={onCheckEmails}
          disabled={isChecking}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Scanning Gmail...' : 'Scan Inbound Messages'}</span>
        </button>
      </div>

      {/* Category Pills & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'ALL', label: 'All Messages' },
            { id: EmailCategory.INTERVIEW, label: 'Interview' },
            { id: EmailCategory.ASSESSMENT, label: 'Assessment' },
            { id: EmailCategory.OFFER, label: 'Offer' },
            { id: EmailCategory.REJECTION, label: 'Rejection' },
            { id: EmailCategory.SPAM, label: 'Spam' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-3 py-1.5 rounded-lg border font-semibold whitespace-nowrap transition-all ${
                activeCategory === tab.id
                  ? 'bg-indigo-600 border-indigo-500 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              {tab.label}{' '}
              <span className="ml-1 text-[10px] opacity-75">
                ({(categoryCounts as any)[tab.id] || 0})
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search sender, subject, company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-64 bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Email Feed */}
      <div className="space-y-3">
        {filteredEmails.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
            No recruiter messages found matching the selected filter. Click <strong>"Scan Inbound Messages"</strong> to poll Gmail.
          </div>
        ) : (
          filteredEmails.map((msg) => {
            const isExpanded = expandedEmailId === msg.id;

            return (
              <div key={msg.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-xs text-slate-400 font-medium">{msg.sender}</span>
                    <h4 className="font-bold text-white text-sm mt-0.5">{msg.subject}</h4>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${getCategoryBadge(msg.classifiedCategory)}`}>
                      {msg.classifiedCategory}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Confidence: {Math.round((msg.confidenceScore || 0.9) * 100)}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-sans">{msg.snippet}</p>

                {isExpanded && msg.fullBody && (
                  <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 font-mono space-y-1 mt-2">
                    <div className="text-[10px] text-slate-500 border-b border-slate-900 pb-1">Full Email Content</div>
                    <pre className="whitespace-pre-wrap font-sans text-xs pt-1">{msg.fullBody}</pre>
                  </div>
                )}

                <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                  <span>Received: {msg.receivedAt ? msg.receivedAt.split('T')[0] : 'Today'}</span>

                  <div className="flex items-center gap-3">
                    {msg.matchedCompany && (
                      <span className="text-indigo-400 font-semibold">
                        Matched Application: {msg.matchedCompany}
                      </span>
                    )}

                    <button
                      onClick={() => setExpandedEmailId(isExpanded ? null : msg.id)}
                      className="text-slate-400 hover:text-white flex items-center gap-1 font-medium"
                    >
                      <span>{isExpanded ? 'Hide Details' : 'View Full Body'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
