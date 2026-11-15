import React, { useState, useEffect } from 'react';
import {
  Clock,
  Pill,
  Calendar,
  Activity,
  Heart,
  AlertTriangle,
  FolderLock,
  Filter,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TimelineItem } from '../types';

export const HealthTimeline: React.FC = () => {
  const { user, activeElderlyId } = useAuth();
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [summary, setSummary] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const loadTimeline = async (categoryFilter?: string) => {
    setIsLoading(true);
    try {
      const res = await api.getTimeline(activeElderlyId || undefined, categoryFilter || undefined);
      setTimelineItems(res.items || []);
      setSummary(res.ai_timeline_summary || '');
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTimeline(selectedCategory);
  }, [activeElderlyId, selectedCategory]);

  const categories = [
    { id: '', label: 'All Activities' },
    { id: 'medication', label: 'Medications', icon: Pill },
    { id: 'appointment', label: 'Appointments', icon: Calendar },
    { id: 'observation', label: 'Vitals & Observations', icon: Activity },
    { id: 'caregiver', label: 'Caregiver Logs', icon: Heart },
    { id: 'document', label: 'Documents', icon: FolderLock },
    { id: 'emergency', label: 'Emergency Events', icon: AlertTriangle },
  ];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'medication':
        return <Pill className="w-5 h-5 text-teal-600" />;
      case 'appointment':
        return <Calendar className="w-5 h-5 text-blue-600" />;
      case 'observation':
        return <Activity className="w-5 h-5 text-emerald-600" />;
      case 'caregiver':
        return <Heart className="w-5 h-5 text-purple-600" />;
      case 'document':
        return <FolderLock className="w-5 h-5 text-amber-600" />;
      case 'emergency':
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-slate-500" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Health Timeline
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Chronological log of verified medication confirmations, vitals, doctor visits, and caregiver assistance.
            </p>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition ${
                selectedCategory === c.id
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* AI Timeline Summary Banner */}
      {summary && (
        <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-xs text-teal-900 dark:text-teal-200 uppercase tracking-wider">
              Health Activity Overview
            </p>
            <p className="text-xs text-teal-800 dark:text-teal-300 mt-0.5 font-medium">
              {summary}
            </p>
          </div>
        </div>
      )}

      {/* Timeline Stream */}
      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Loading chronological health records...</p>
        </div>
      ) : timelineItems.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Clock className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Events Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            As medications are confirmed, appointments scheduled, and vitals logged, they will appear here in chronological order.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-teal-200 dark:border-slate-800 space-y-6">
          {timelineItems.map((item, index) => {
            const dateObj = new Date(item.timestamp);
            const formattedDate = dateObj.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const formattedTime = dateObj.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div key={item.id || index} className="relative group">
                {/* Timeline Dot Icon */}
                <div className="absolute -left-[35px] sm:-left-[43px] top-1.5 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-teal-500 flex items-center justify-center shadow-md">
                  {getCategoryIcon(item.category)}
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm group-hover:border-teal-300 transition space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="text-xs font-bold text-teal-700 dark:text-teal-400">
                      {formattedDate} at {formattedTime}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      Logged by {item.actor_name || 'CareSight Platform'}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                    {item.description}
                  </p>

                  {item.status && (
                    <div className="pt-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        Status: {item.status}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
