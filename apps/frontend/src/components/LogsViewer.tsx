/**
 * @file src/components/LogsViewer.tsx
 * @description Real-time activity, AI prompt, browser, and system execution log viewer.
 * @architect Clean Architecture - Presentation Layer
 */

import React, { useState } from 'react';
import { LogEntry } from '@sentinel/types';
import { Terminal, RefreshCw, AlertCircle, CheckCircle, Info, Filter } from 'lucide-react';

interface LogsViewerProps {
  logs: LogEntry[];
  onRefresh: () => void;
}

export const LogsViewer: React.FC<LogsViewerProps> = ({ logs, onRefresh }) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const filteredLogs = categoryFilter === 'ALL' ? logs : logs.filter((l) => l.category === categoryFilter);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'SUCCESS':
        return 'text-emerald-400';
      case 'ERROR':
        return 'text-rose-400';
      case 'WARN':
        return 'text-amber-400';
      default:
        return 'text-cyan-400';
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3 text-xs">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <h3 className="font-bold text-white text-sm">System Execution Logs Stream</h3>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg p-1.5 text-white"
          >
            <option value="ALL">All Log Categories</option>
            <option value="SEARCH">SEARCH</option>
            <option value="AI_PROMPT">AI_PROMPT</option>
            <option value="RESUME_GEN">RESUME_GEN</option>
            <option value="BROWSER">BROWSER</option>
            <option value="EMAIL">EMAIL</option>
            <option value="SCHEDULER">SCHEDULER</option>
            <option value="ERROR">ERROR</option>
          </select>

          <button
            onClick={onRefresh}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-all"
            title="Refresh Logs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2 max-h-[500px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-600 text-center py-8">No log entries found for selected filter.</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-2 border-b border-slate-900/80 pb-2">
              <span className="text-slate-500 text-[10px] shrink-0">{log.timestamp.split('T')[1].substring(0, 8)}</span>
              <span className={`font-bold shrink-0 text-[10px] ${getLevelColor(log.level)}`}>[{log.category}]</span>
              <span className="text-slate-300 leading-tight">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
