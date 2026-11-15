import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  Bell,
  AlertTriangle,
  Globe,
  User as UserIcon,
  LogOut,
  Volume2,
  VolumeX,
  Type,
  SunMoon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useAccessibility, Language, FontSize } from '../context/AccessibilityContext';
import { api } from '../services/api';
import { NotificationItem } from '../types';

export const Navbar: React.FC<{ onOpenSOS: () => void }> = ({ onOpenSOS }) => {
  const { user, linkedElderly, activeElderlyId, setActiveElderlyId, logout } = useAuth();
  const { language, setLanguage, fontSize, setFontSize, highContrast, toggleHighContrast, isSpeaking, stopSpeaking, t } = useAccessibility();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const data = await api.getNotifications();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      } catch (e) {
        // quiet fallback
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000); // 30 sec polling
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 lg:px-8 py-3 transition-colors dark:bg-slate-900 dark:border-slate-800">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20 group-hover:bg-teal-700 transition">
              <Heart className="w-6 h-6 fill-white" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                Care<span className="text-teal-600">Sight</span>
              </span>
              <p className="hidden md:block text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('tagline')}
              </p>
            </div>
          </Link>
        </div>

        {/* Linked Senior Switcher (For Family & Caregiver) */}
        {user?.role !== 'elderly' && linkedElderly.length > 0 && (
          <div className="hidden md:flex items-center gap-2 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-lg px-3 py-1.5">
            <span className="text-xs font-semibold text-teal-800 dark:text-teal-200">Caring for:</span>
            <select
              value={activeElderlyId || ''}
              onChange={(e) => setActiveElderlyId(e.target.value)}
              className="bg-transparent text-sm font-bold text-teal-900 dark:text-teal-100 outline-none cursor-pointer"
            >
              {linkedElderly.map((le) => (
                <option key={le.elderly_id} value={le.elderly_id} className="text-slate-900">
                  {le.elderly_name} ({le.relationship_label})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Controls & Emergency SOS */}
        <div className="flex items-center gap-2 lg:gap-3">
          
          {/* Emergency SOS Button - Prominent & accessible */}
          <button
            onClick={onOpenSOS}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm sm:text-base px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-lg shadow-red-600/30 active:scale-95 transition focus:ring-4 focus:ring-red-300 animate-pulse"
            aria-label="Trigger Emergency SOS"
          >
            <AlertTriangle className="w-5 h-5 fill-white" />
            <span>SOS</span>
          </button>

          {/* Language Selector */}
          <div className="relative">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold rounded-lg pl-7 pr-3 py-2 border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 transition"
              aria-label="Select Language"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
              <option value="mr">मराठी (Marathi)</option>
            </select>
            <Globe className="w-4 h-4 text-slate-500 absolute left-2 top-2.5 pointer-events-none" />
          </div>

          {/* High Contrast Quick Toggle */}
          <button
            onClick={toggleHighContrast}
            title={t('high_contrast')}
            className={`p-2 rounded-lg border transition ${
              highContrast
                ? 'bg-yellow-400 text-black border-black font-bold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            <SunMoon className="w-5 h-5" />
          </button>

          {/* Voice Stop button if currently speaking */}
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              title="Stop Audio"
              className="p-2 rounded-lg bg-teal-100 text-teal-800 border border-teal-300 animate-bounce"
            >
              <VolumeX className="w-5 h-5" />
            </button>
          )}

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowNotifMenu(!showNotifMenu)}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition relative"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifMenu && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl py-3 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 pb-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Notifications</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs font-semibold text-teal-600 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-sm">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${
                          !n.is_read ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white">
                            {n.title}
                          </p>
                          {n.priority === 'emergency' && (
                            <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded font-extrabold">
                              SOS
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                          {n.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition"
            >
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold flex items-center justify-center text-sm">
                {user?.first_name?.charAt(0) || 'U'}
              </div>
              <span className="hidden sm:inline text-xs font-semibold text-slate-800 dark:text-slate-200 capitalize">
                {user?.first_name}
              </span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role} Account</p>
                </div>
                <Link
                  to="/settings"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <UserIcon className="w-4 h-4" />
                  {t('settings')}
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
