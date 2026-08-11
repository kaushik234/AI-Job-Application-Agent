import React from 'react';
import {
  LayoutDashboard,
  Briefcase,
  FileCheck,
  FileText,
  Mail,
  BarChart2,
  Settings,
  User,
  Bot,
  Inbox,
  LogOut,
  Sun,
  Moon,
  ShieldCheck,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Badge } from '@sentinel/ui';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  onClose: () => void;
  pendingApprovalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose,
  pendingApprovalsCount = 0,
}) => {
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();

  const navItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'jobs', label: 'Target Jobs', icon: Briefcase },
    {
      id: 'applications',
      label: 'Applications',
      icon: FileCheck,
      badge: pendingApprovalsCount > 0 ? `${pendingApprovalsCount} pending` : undefined,
    },
    { id: 'resumes', label: 'Resume Manager', icon: FileText },
    { id: 'coverLetters', label: 'Cover Letters', icon: Mail },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'simulator', label: 'Browser Simulator', icon: Bot },
    { id: 'email', label: 'Email Monitor', icon: Inbox },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'profile', label: 'Profile & Sessions', icon: User },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 text-slate-100 z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-wider text-white">SENTINEL AI</h2>
              <p className="text-[10px] text-slate-400">Autonomous Job Agent</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 mb-2 text-[10px] font-bold text-slate-500 tracking-wider uppercase">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge ? (
                  <Badge variant="amber" size="sm">
                    {item.badge}
                  </Badge>
                ) : (
                  isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer / User Profile & Controls */}
        <div className="p-3 border-t border-slate-800 space-y-3">
          {/* User Preview */}
          {user && (
            <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
                  {user.firstName ? user.firstName[0] : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <Badge variant="purple" size="sm">
                {user.role}
              </Badge>
            </div>
          )}

          {/* Quick Controls: Dark Mode Toggle & Logout */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
              title="Toggle theme"
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{isDark ? 'Light' : 'Dark'}</span>
            </button>

            <button
              onClick={() => logout()}
              className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-800/40 transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
