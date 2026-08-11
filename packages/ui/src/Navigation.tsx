import React from 'react';
import { LayoutDashboard, Search, FileText, MonitorPlay, Table, Mail, Settings, Terminal, Code2 } from 'lucide-react';

export interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalsCount: number;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, pendingApprovalsCount }) => {
  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Search Jobs', icon: Search },
    { id: 'resumes', label: 'Resume & Cover Letter', icon: FileText },
    { id: 'automation', label: 'Browser Automation', icon: MonitorPlay, badge: pendingApprovalsCount },
    { id: 'tracker', label: 'Application Tracker', icon: Table },
    { id: 'emails', label: 'Email Monitor', icon: Mail },
    { id: 'architecture', label: 'Architecture & Clean Code', icon: Code2 },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'logs', label: 'Logs', icon: Terminal },
  ];

  return (
    <nav className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-[65px] z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-1 overflow-x-auto py-2 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-slate-950 font-bold shadow-sm shadow-blue-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 ? (
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${isActive ? 'bg-slate-950 text-blue-400' : 'bg-amber-500 text-slate-950'}`}>
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
