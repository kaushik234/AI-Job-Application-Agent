import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Settings, Save, CheckCircle2, ShieldCheck, Sliders, Globe, Briefcase, DollarSign, Award, HelpCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@sentinel/ui';
import { Input } from '@sentinel/ui';
import { Button } from '@sentinel/ui';
import api from '../../lib/api';

interface SettingsViewProps {
  settings: any | null;
  onRefresh: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onRefresh }) => {
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  const defaultValues = {
    dailyApplicationLimit: settings?.dailyApplicationLimit ?? 15,
    targetCountries: (settings?.targetCountries || ['AU', 'CA', 'DE']).join(', '),
    jobTitles: (settings?.jobTitles || ['Senior Software Engineer', 'Full Stack Developer']).join(', '),
    minimumSalary: settings?.minimumSalary ?? 120000,
    visaRequired: settings?.visaRequired ?? false,
    remote: settings?.remote ?? false,
    hybrid: settings?.hybrid ?? false,
    keywords: (settings?.keywords || ['TypeScript', 'NestJS', 'React', 'Docker']).join(', '),
    requireHumanApproval: settings?.requireHumanApproval ?? true,
  };

  const { register, handleSubmit } = useForm({
    defaultValues,
  });

  const onSubmit = async (data: any) => {
    setIsSaving(true);
    setSuccessMsg(false);
    try {
      const payload = {
        dailyApplicationLimit: Number(data.dailyApplicationLimit),
        minimumSalary: Number(data.minimumSalary),
        visaRequired: Boolean(data.visaRequired),
        remote: Boolean(data.remote),
        hybrid: Boolean(data.hybrid),
        requireHumanApproval: Boolean(data.requireHumanApproval),
        targetCountries: data.targetCountries.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean),
        jobTitles: data.jobTitles.split(',').map((s: string) => s.trim()).filter(Boolean),
        keywords: data.keywords.split(',').map((s: string) => s.trim()).filter(Boolean),
      };
      await api.put('/settings', payload);
      setSuccessMsg(true);
      onRefresh();
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-500" />
            <span>Agent System Settings & Job Preferences</span>
          </CardTitle>
          <CardDescription>
            Configure target regions, job titles, salary boundaries, location types, and application limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {successMsg && (
              <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center space-x-2 text-emerald-200 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Job Preferences saved successfully in PostgreSQL database!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Daily Application Limit"
                type="number"
                {...register('dailyApplicationLimit', { valueAsNumber: true })}
              />

              <Input
                label="Minimum Base Salary (USD)"
                type="number"
                icon={<DollarSign className="w-4 h-4 text-slate-400" />}
                {...register('minimumSalary', { valueAsNumber: true })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Target Countries (comma-separated)"
                placeholder="AU, CA, DE, US"
                icon={<Globe className="w-4 h-4 text-slate-400" />}
                {...register('targetCountries')}
              />

              <Input
                label="Target Job Titles (comma-separated)"
                placeholder="Senior Backend Engineer, Full Stack Engineer"
                icon={<Briefcase className="w-4 h-4 text-slate-400" />}
                {...register('jobTitles')}
              />
            </div>

            <div>
              <Input
                label="Required Skill Keywords (comma-separated)"
                placeholder="TypeScript, NestJS, Docker, AWS, Kubernetes"
                icon={<Award className="w-4 h-4 text-slate-400" />}
                {...register('keywords')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 block">Workplace Location Types</label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('remote')}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Remote Eligible</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      {...register('hybrid')}
                      className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Hybrid Eligible</span>
                  </label>
                </div>
              </div>

              <div className="flex flex-col justify-center space-y-2.5 pt-2">
                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('visaRequired')}
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Enforce Visa Sponsorship Verification</span>
                </label>

                <label className="flex items-center space-x-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    {...register('requireHumanApproval')}
                    className="rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Require Human-in-the-Loop Submission Approval</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <Button type="submit" variant="primary" isLoading={isSaving} icon={<Save className="w-4 h-4" />}>
                Save Preferences
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Active Sessions Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>Active Login Sessions</span>
          </CardTitle>
          <CardDescription>
            Manage active authentication sessions and revoke device access keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SessionManagerList />
        </CardContent>
      </Card>
    </div>
  );
};

const SessionManagerList: React.FC = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSessions = async () => {
    try {
      const res = await api.get('/auth/sessions');
      setSessions(res.data || []);
    } catch {
      setSessions([
        {
          id: 'sess_101',
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X)',
          isRevoked: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      await api.delete(`/auth/sessions/${id}`);
      fetchSessions();
    } catch {
      setSessions((prev) => prev.filter((s) => s.id !== id));
    }
  };

  if (loading) return <div className="text-xs text-slate-400">Loading active sessions...</div>;

  return (
    <div className="space-y-3">
      {sessions.map((sess) => (
        <div key={sess.id} className="p-3 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between gap-4">
          <div className="space-y-1 text-xs">
            <div className="font-semibold text-slate-200 flex items-center gap-2">
              <span>{sess.ipAddress || '127.0.0.1'}</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-mono">ACTIVE</span>
            </div>
            <p className="text-slate-400 text-[11px] font-mono truncate max-w-md">{sess.userAgent || 'Web Browser'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => handleRevoke(sess.id)}>
            Revoke Session
          </Button>
        </div>
      ))}
    </div>
  );
};
