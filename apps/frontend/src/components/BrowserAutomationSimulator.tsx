/**
 * @file src/components/BrowserAutomationSimulator.tsx
 * @description Playwright browser execution monitor supporting Greenhouse, Lever, Ashby, Workable, video recording, form field inspector, CAPTCHA pause handler, and Human Approval submission trigger.
 * @architect Clean Architecture - Presentation Layer
 */

import React, { useState } from 'react';
import { ApplicationRecord, AutomationStepEvent } from '@sentinel/types';
import { Monitor, CheckCircle, AlertTriangle, ShieldAlert, Play, RefreshCw, Terminal, Lock, Check, Video } from 'lucide-react';

interface BrowserAutomationSimulatorProps {
  applications: ApplicationRecord[];
  onTriggerApply: (jobId: string) => Promise<{ captchaPaused?: boolean; approvalPaused?: boolean; events: AutomationStepEvent[]; videoPath?: string }>;
  onConfirmCaptcha: (jobId: string) => Promise<void>;
  onApproveSubmission?: (jobId: string) => Promise<void>;
}

export const BrowserAutomationSimulator: React.FC<BrowserAutomationSimulatorProps> = ({
  applications,
  onTriggerApply,
  onConfirmCaptcha,
  onApproveSubmission,
}) => {
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(applications[0] || null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [liveEvents, setLiveEvents] = useState<AutomationStepEvent[]>([]);
  const [isCaptchaPaused, setIsCaptchaPaused] = useState(false);
  const [isApprovalPaused, setIsApprovalPaused] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);

  const handleLaunchAutomation = async (jobId: string) => {
    setIsExecuting(true);
    setIsCaptchaPaused(false);
    setIsApprovalPaused(false);
    setRecordedVideo(null);
    setLiveEvents([]);

    try {
      const res = await onTriggerApply(jobId);
      setLiveEvents(res.events || []);
      if (res.captchaPaused) {
        setIsCaptchaPaused(true);
      }
      if (res.approvalPaused) {
        setIsApprovalPaused(true);
      }
      if (res.videoPath) {
        setRecordedVideo(res.videoPath);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleResumePostCaptcha = async () => {
    if (!selectedApp) return;
    setIsExecuting(true);
    try {
      await onConfirmCaptcha(selectedApp.jobId);
      setIsCaptchaPaused(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleApproveSubmission = async () => {
    if (!selectedApp || !onApproveSubmission) return;
    setIsExecuting(true);
    try {
      await onApproveSubmission(selectedApp.jobId);
      setIsApprovalPaused(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Application Queue List */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Monitor className="w-4 h-4 text-indigo-400" /> Playwright Target Queue
        </h3>

        <div className="space-y-2">
          {applications.map((app) => {
            const isSelected = selectedApp?.id === app.id;
            const platformName = app.platform || (app.url?.includes('greenhouse') ? 'Greenhouse' : app.url?.includes('lever') ? 'Lever' : app.url?.includes('ashby') ? 'Ashby' : app.url?.includes('workable') ? 'Workable' : 'Generic');

            return (
              <div
                key={app.id}
                onClick={() => setSelectedApp(app)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500 text-white'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{app.company}</span>
                  <span className="text-[10px] bg-indigo-900/60 border border-indigo-700/50 px-2 py-0.5 rounded text-indigo-300">
                    {platformName}
                  </span>
                </div>
                <div className="text-slate-400 mt-0.5">{app.jobTitle}</div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/60 text-[11px]">
                  <span
                    className={`font-semibold ${
                      app.status === 'CAPTCHA Paused'
                        ? 'text-amber-400'
                        : app.status === 'Pending Approval'
                        ? 'text-cyan-400'
                        : app.status === 'Applied'
                        ? 'text-emerald-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {app.status}
                  </span>
                  <span className="text-indigo-400 font-bold">{app.matchScore}% Match</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Browser Execution Stage & Terminal */}
      <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        {selectedApp ? (
          <>
            {/* Header control */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base">{selectedApp.company} — Playwright Automation Engine</h3>
                <p className="text-xs text-slate-400">Target: {selectedApp.jobTitle} (ATS: {selectedApp.platform || 'Auto-Detected'})</p>
              </div>

              <button
                onClick={() => handleLaunchAutomation(selectedApp.jobId)}
                disabled={isExecuting}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {isExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{isExecuting ? 'Running Playwright...' : 'Execute Browser Auto-Fill'}</span>
              </button>
            </div>

            {/* CAPTCHA PAUSED WARNING BANNER */}
            {(isCaptchaPaused || selectedApp.status === 'CAPTCHA Paused') && (
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-amber-300 text-sm">Anti-Bot CAPTCHA Challenge Detected</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Rule Compliant Policy: The agent has halted execution and will <strong>NEVER</strong> attempt to bypass CAPTCHA security challenges. Please solve the challenge in the window, then confirm below.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResumePostCaptcha}
                  disabled={isExecuting}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Confirm CAPTCHA Solved & Finalize Submission</span>
                </button>
              </div>
            )}

            {/* HUMAN APPROVAL PAUSED BANNER */}
            {(isApprovalPaused || selectedApp.status === 'Pending Approval') && !isCaptchaPaused && (
              <div className="bg-cyan-500/10 border border-cyan-500/40 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-cyan-300 text-sm">Human Approval Mode Active</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Form populated and verified. The agent is holding submission pending candidate manual review.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleApproveSubmission}
                  disabled={isExecuting}
                  className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Authorize Final Submission</span>
                </button>
              </div>
            )}

            {recordedVideo && (
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300">
                <span className="flex items-center gap-2 text-indigo-400 font-semibold">
                  <Video className="w-4 h-4" /> Playwright Session Video Log Captured
                </span>
                <span className="font-mono text-[11px] text-slate-400">{recordedVideo}</span>
              </div>
            )}

            {/* Playwright Terminal Log Viewer */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 min-h-[300px]">
              <div className="flex items-center justify-between text-slate-500 text-[11px] pb-2 border-b border-slate-900">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" /> Playwright Driver Logs (Greenhouse / Lever / Ashby / Workable)
                </span>
                <span>Port: 3000 (Backend Ingress)</span>
              </div>

              {liveEvents.length === 0 ? (
                <div className="text-slate-600 py-12 text-center">
                  Click <strong>"Execute Browser Auto-Fill"</strong> to trigger live Playwright execution.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {liveEvents.map((evt, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-indigo-400 font-bold">
                          Step {evt.stepNumber}/{evt.totalSteps}: {evt.actionName}
                        </span>
                        <span
                          className={`font-semibold ${
                            evt.status === 'SUCCESS'
                              ? 'text-emerald-400'
                              : evt.status === 'CAPTCHA_PAUSED'
                              ? 'text-amber-400'
                              : evt.status === 'APPROVAL_PAUSED'
                              ? 'text-cyan-400'
                              : 'text-rose-400'
                          }`}
                        >
                          [{evt.status}]
                        </span>
                      </div>
                      {evt.logs.map((log, lIdx) => (
                        <div key={lIdx} className="text-slate-300 pl-3 border-l border-slate-800 text-[11px]">
                          {log}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center text-slate-500 py-12 text-xs">Select an application from the queue to start browser automation.</div>
        )}
      </div>
    </div>
  );
};
