/**
 * @file src/components/QueueDashboard.tsx
 * @description BullMQ Queue Monitoring Dashboard featuring queue counters, Redis status, pause/resume controls, DLQ retry, and enqueue actions.
 * @architect Clean Architecture - Presentation Layer
 */

import React, { useState } from 'react';
import { Layers, Activity, Pause, Play, RefreshCw, AlertOctagon, CheckCircle2, RotateCcw, Trash2, Send, Cpu } from 'lucide-react';

export interface QueueMetricItem {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
}

export interface DashboardMetricsData {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  deadLetterCount: number;
  queues: QueueMetricItem[];
  redisStatus: 'CONNECTED' | 'DISCONNECTED' | 'FALLBACK';
  updatedAt: string;
}

interface QueueDashboardProps {
  metrics: DashboardMetricsData;
  onEnqueueJob: (queueName: string, type: string, payload: any) => Promise<void>;
  onPauseQueue: (queueName: string) => Promise<void>;
  onResumeQueue: (queueName: string) => Promise<void>;
  onRetryDlq: (jobId: string) => Promise<void>;
  onClearDlq: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const QueueDashboard: React.FC<QueueDashboardProps> = ({
  metrics,
  onEnqueueJob,
  onPauseQueue,
  onResumeQueue,
  onRetryDlq,
  onClearDlq,
  onRefresh,
}) => {
  const [selectedQueue, setSelectedQueue] = useState<string>('job_search');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [testPayload, setTestPayload] = useState('{"query": "Staff Engineer", "location": "Sydney"}');

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEnqueueClick = async () => {
    try {
      let parsed = {};
      try { parsed = JSON.parse(testPayload); } catch (e) { parsed = { data: testPayload }; }
      await onEnqueueJob(selectedQueue, `TEST_${selectedQueue.toUpperCase()}`, parsed);
      await onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Summary Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600/10 border border-indigo-500/30 rounded-xl text-indigo-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              BullMQ Engine Dashboard
              <span
                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                  metrics.redisStatus === 'CONNECTED'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                Redis: {metrics.redisStatus}
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Real-time monitoring across 7 background queues & Dead Letter Queue (DLQ)
            </p>
          </div>
        </div>

        <button
          onClick={handleRefreshClick}
          disabled={isRefreshing}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs px-4 py-2.5 rounded-xl border border-slate-700 transition-all flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Aggregate Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-slate-400">Total Enqueued Jobs</div>
          <div className="text-2xl font-black text-white mt-1">{metrics.totalJobs}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-cyan-400">Active Workers</div>
          <div className="text-2xl font-black text-cyan-300 mt-1">{metrics.activeJobs}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-emerald-400">Completed Jobs</div>
          <div className="text-2xl font-black text-emerald-300 mt-1">{metrics.completedJobs}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="text-xs font-semibold text-rose-400">Dead Letter Queue</div>
          <div className="text-2xl font-black text-rose-300 mt-1">{metrics.deadLetterCount}</div>
        </div>
      </div>

      {/* Queues Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.queues.map((q) => {
          const isDlq = q.queueName === 'dead_letter_queue';

          return (
            <div
              key={q.queueName}
              className={`bg-slate-900 border rounded-xl p-4 space-y-3 transition-all ${
                isDlq
                  ? 'border-rose-900/60 bg-rose-950/10'
                  : q.paused
                  ? 'border-amber-800/60 bg-amber-950/10'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-xs capitalize">
                  {q.queueName.replace(/_/g, ' ')}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    q.paused ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {q.paused ? 'PAUSED' : 'RUNNING'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 font-medium">Waiting</div>
                  <div className="font-bold text-slate-200 mt-0.5">{q.waiting}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 font-medium">Active</div>
                  <div className="font-bold text-cyan-400 mt-0.5">{q.active}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 font-medium">Completed</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{q.completed}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800/80">
                  <div className="text-[10px] text-slate-500 font-medium">Failed</div>
                  <div className="font-bold text-rose-400 mt-0.5">{q.failed}</div>
                </div>
              </div>

              {!isDlq && (
                <div className="pt-1 flex gap-2">
                  {q.paused ? (
                    <button
                      onClick={() => onResumeQueue(q.queueName)}
                      className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3 h-3 fill-current" /> Resume
                    </button>
                  ) : (
                    <button
                      onClick={() => onPauseQueue(q.queueName)}
                      className="w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold py-1.5 rounded transition-all flex items-center justify-center gap-1.5"
                    >
                      <Pause className="w-3 h-3" /> Pause
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Control Panel: Enqueue Task */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" /> Enqueue Background Task
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Target Queue</label>
            <select
              value={selectedQueue}
              onChange={(e) => setSelectedQueue(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500"
            >
              <option value="job_search">Job Search</option>
              <option value="ai_matching">AI Matching</option>
              <option value="resume_generation">Resume Generation</option>
              <option value="cover_letter">Cover Letter</option>
              <option value="browser_automation">Browser Automation</option>
              <option value="email_processing">Email Processing</option>
              <option value="notifications">Notifications</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="text-xs text-slate-400 block mb-1">JSON Payload</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:border-indigo-500"
              />
              <button
                onClick={handleEnqueueClick}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" /> Enqueue Task
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
