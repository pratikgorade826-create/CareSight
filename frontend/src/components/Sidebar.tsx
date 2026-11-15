import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Pill,
  Calendar,
  Sparkles,
  Clock,
  Users,
  FolderLock,
  BarChart3,
  AlertTriangle,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useAccessibility } from '../context/AccessibilityContext';
import { useAuth } from '../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { t } = useAccessibility();
  const { user } = useAuth();

  const navItems = [
    { to: '/', label: t('dashboard'), icon: LayoutDashboard },
    { to: '/medications', label: t('medications'), icon: Pill },
    { to: '/appointments', label: t('appointments'), icon: Calendar },
    { to: '/ai-companion', label: t('ai_companion'), icon: Sparkles },
    { to: '/timeline', label: t('timeline'), icon: Clock },
    { to: '/family-circle', label: t('family_circle'), icon: Users },
    { to: '/medical-vault', label: t('medical_vault'), icon: FolderLock },
    { to: '/analytics', label: t('analytics'), icon: BarChart3 },
    { to: '/emergency', label: t('emergency_sos'), icon: AlertTriangle },
    { to: '/settings', label: t('settings'), icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-shrink-0 flex flex-col justify-between p-4">
      <div className="space-y-1">
        <div className="px-3 py-2 mb-2">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation Menu
          </p>
        </div>
        <nav className="space-y-1.5" aria-label="Main Navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-sm transition ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Role Badge & Quick Summary */}
      <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">Signed in role</p>
        <p className="text-sm font-extrabold text-teal-700 dark:text-teal-300 capitalize mt-0.5">
          {user?.role === 'elderly' ? 'Senior Account' : `${user?.role} Member`}
        </p>
        {user?.role === 'elderly' && (
          <p className="text-[11px] text-slate-400 mt-1">Full Health Authority</p>
        )}
      </div>
    </aside>
  );
};
