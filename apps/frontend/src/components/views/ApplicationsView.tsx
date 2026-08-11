import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Edit,
  Eye,
  Bot,
  Trash2,
} from 'lucide-react';
import { ApplicationRecord, ApplicationStatus, CountryCode } from '@sentinel/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sentinel/ui';
import { Input } from '@sentinel/ui';
import { Button } from '@sentinel/ui';
import { Badge } from '@sentinel/ui';
import { Modal } from '@sentinel/ui';
import api from '../../lib/api';

interface ApplicationsViewProps {
  applications: ApplicationRecord[];
  onRefresh: () => void;
  setActiveTab: (tab: string) => void;
}

export const ApplicationsView: React.FC<ApplicationsViewProps> = ({
  applications,
  onRefresh,
  setActiveTab,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<string>('');
  const [appNotes, setAppNotes] = useState<string>('');

  const statusOptions = [
    'Discovered',
    'Matched',
    'Tailored',
    'Pending Approval',
    'Applying',
    'Applied',
    'Assessment',
    'Interview',
    'Offer',
    'Rejected',
  ];

  const filteredApps = applications.filter((app) => {
    const matchesStatus = filterStatus === 'ALL' || app.status === filterStatus;
    const matchesSearch =
      app.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleUpdateStatus = async (appId: string) => {
    if (!newStatus) return;
    setIsUpdatingStatus(true);
    try {
      await api.put(`/applications/${appId}/status`, {
        status: newStatus,
        notes: appNotes,
      });
      onRefresh();
      setSelectedApp(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update application status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getStatusBadgeVariant = (status: ApplicationStatus | string) => {
    switch (status) {
      case 'Applied':
        return 'green';
      case 'Interview':
      case 'Offer':
        return 'purple';
      case 'Pending Approval':
        return 'amber';
      case 'Applying':
        return 'blue';
      case 'Rejected':
        return 'red';
      default:
        return 'gray';
    }
  };

  const countryFlags: Record<CountryCode, string> = {
    AU: '🇦🇺 Australia',
    CA: '🇨🇦 Canada',
    DE: '🇩🇪 Germany',
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <FileCheck className="w-5 h-5 text-blue-500" />
            <span>Applications Tracker & Audit Pipeline</span>
          </CardTitle>
          <CardDescription>
            Track real-time status of submitted applications, interview invites, and pending approvals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 justify-between">
            <div className="flex-1">
              <Input
                icon={<Search className="w-4 h-4" />}
                placeholder="Search by company name or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Filter:</span>
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                  filterStatus === 'ALL'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({applications.length})
              </button>
              {['Pending Approval', 'Applied', 'Interview', 'Offer'].map((st) => {
                const count = applications.filter((a) => a.status === st).length;
                return (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                      filterStatus === st
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st} ({count})
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Applications Table / Cards */}
      <div className="space-y-3">
        {filteredApps.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-slate-400 text-xs">
              No matching applications found.
            </CardContent>
          </Card>
        ) : (
          filteredApps.map((app) => (
            <Card key={app.id} className="hover:border-blue-500/30 transition-all">
              <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2 flex-wrap gap-1">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {app.jobTitle}
                    </span>
                    <Badge variant={getStatusBadgeVariant(app.status)}>
                      {app.status === 'SUBMITTED' || app.appliedAt ? (app.status || 'SUBMITTED') : 'AWAITING REVIEW'}
                    </Badge>
                    {app.submissionCategory === 'DEMO' && (
                      <Badge variant="blue" size="sm">DEMO</Badge>
                    )}
                    {app.submissionCategory === 'USER_SUBMITTED' && (
                      <Badge variant="green" size="sm">USER SUBMITTED</Badge>
                    )}
                    {app.submissionCategory === 'SEEDED_TEST_DATA' && (
                      <Badge variant="gray" size="sm">SEEDED TEST DATA</Badge>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {app.company} • {countryFlags[app.country] || app.country} • Platform: <span className="font-mono">{app.platform || 'General'}</span>
                  </p>

                  {/* Two-Stage Submission Verification Evidence Panel */}
                  <div className="mt-2.5 p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        Sentinel Status: <strong className="text-slate-200">{app.appliedAt ? '✓ User Submitted' : 'Ready for Submission'}</strong>
                      </span>
                      {app.externalVerification?.isVerified ? (
                        <Badge variant="green" size="sm">🟢 External Submission Confirmed</Badge>
                      ) : (
                        <Badge variant="amber" size="sm">🟡 Submission Unverified</Badge>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400">
                      {app.externalVerification?.verificationNotes ||
                        (app.appliedAt
                          ? '🟡 Submission Recorded. Sentinel recorded your action, but external platform has not provided verifiable confirmation.'
                          : 'Application prepared. Pending manual candidate submission on external portal.')}
                    </p>

                    {app.externalVerification?.confirmationNumber && (
                      <div className="text-[10px] text-emerald-400 font-mono">
                        Ref #: {app.externalVerification.confirmationNumber} • Evidence: {app.externalVerification.evidenceType}
                      </div>
                    )}
                  </div>

                  {app.notes && (
                    <p className="text-[11px] text-slate-400 italic bg-slate-950/40 px-2.5 py-1 rounded-md mt-2">
                      Note: {app.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-extrabold text-blue-500">{app.matchScore}% Match</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {app.appliedAt ? new Date(app.appliedAt).toLocaleDateString() : 'Pending'}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await api.post(`/applications/${app.id}/verify-external`, {
                          confirmationUrl: app.url,
                        });
                        onRefresh();
                        alert(`External verification check completed for ${app.company}!`);
                      } catch (err: any) {
                        alert(`Verification check: ${err.message || 'Complete'}`);
                      }
                    }}
                  >
                    Verify External
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedApp(app);
                      setNewStatus(app.status);
                      setAppNotes(app.notes || '');
                    }}
                    icon={<Edit className="w-3.5 h-3.5" />}
                  >
                    Update
                  </Button>

                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Update Application Modal */}
      {selectedApp && (
        <Modal
          isOpen={!!selectedApp}
          onClose={() => setSelectedApp(null)}
          title={`Update Application: ${selectedApp.company}`}
          description={selectedApp.jobTitle}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-300 block mb-1">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {statusOptions.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-300 block mb-1">Notes / Feedback</label>
              <textarea
                rows={3}
                value={appNotes}
                onChange={(e) => setAppNotes(e.target.value)}
                placeholder="Add recruiter feedback or interview schedule notes..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedApp(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleUpdateStatus(selectedApp.id)}
                isLoading={isUpdatingStatus}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
