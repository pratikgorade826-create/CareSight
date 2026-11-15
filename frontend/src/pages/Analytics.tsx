import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Heart,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AdherenceAnalytics } from '../types';

export const Analytics: React.FC = () => {
  const { user, activeElderlyId } = useAuth();
  const [analytics, setAnalytics] = useState<AdherenceAnalytics | null>(null);
  const [weeklySummary, setWeeklySummary] = useState<any | null>(null);
  const [days, setDays] = useState(14);
  const [isLoading, setIsLoading] = useState(true);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const elderlyId = activeElderlyId || undefined;
      const [adhRes, weekRes] = await Promise.all([
        api.getAdherenceAnalytics(elderlyId, days),
        api.getWeeklySummary(elderlyId),
      ]);
      setAnalytics(adhRes);
      setWeeklySummary(weekRes);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [activeElderlyId, days]);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              Family Care Analytics
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Aggregated directly from MongoDB pipelines. Track medication compliance, missed doses, and caregiver logs.
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">Timeframe:</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-2">Running MongoDB aggregation pipelines...</p>
        </div>
      ) : !analytics ? (
        <p className="text-center text-slate-500 py-12">No compliance records available.</p>
      ) : (
        <>
          {/* Top 4 KPI Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Overall Adherence */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Overall Adherence
              </span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-teal-600">
                  {analytics.overall_adherence_rate}%
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-200">
                  {weeklySummary?.adherence_status || 'Good'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {analytics.total_taken} of {analytics.total_scheduled} prescribed doses
              </p>
            </div>

            {/* Confirmed Taken Doses */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Doses Taken
              </span>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {analytics.total_taken}
                </span>
              </div>
              <p className="text-xs text-slate-500">Confirmed intake records</p>
            </div>

            {/* Skipped / Unconfirmed */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Skipped / Unconfirmed
              </span>
              <div className="flex items-center gap-2">
                <XCircle className="w-6 h-6 text-amber-500" />
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {analytics.total_skipped + analytics.total_unconfirmed}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {analytics.total_skipped} skipped, {analytics.total_unconfirmed} pending
              </p>
            </div>

            {/* Caregiver Hours */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                Caregiver Hours
              </span>
              <div className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-purple-600" />
                <span className="text-3xl font-black text-slate-900 dark:text-white">
                  {weeklySummary?.caregiver_hours || 0} hrs
                </span>
              </div>
              <p className="text-xs text-slate-500">Assistance & shift check-ins</p>
            </div>

          </div>

          {/* Recharts: Daily Adherence Trend & Stacked Dose Counts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Daily Adherence Rate Line Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600" />
                Daily Adherence Percentage (%)
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.daily_trends}>
                    <defs>
                      <linearGradient id="rateGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => val.slice(5)}
                      fontSize={11}
                      stroke="#94a3b8"
                    />
                    <YAxis domain={[0, 100]} fontSize={11} stroke="#94a3b8" />
                    <Tooltip
                      formatter={(val: any) => [`${val}%`, 'Adherence']}
                      contentStyle={{ borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="adherence_rate"
                      stroke="#0d9488"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#rateGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Doses Intake vs Skipped Bar Chart */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-teal-600" />
                Daily Dose Intake vs. Skipped
              </h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.daily_trends}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => val.slice(5)}
                      fontSize={11}
                      stroke="#94a3b8"
                    />
                    <YAxis fontSize={11} stroke="#94a3b8" />
                    <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="taken" fill="#0d9488" name="Taken Doses" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="skipped" fill="#f59e0b" name="Skipped Doses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* Weekly Summary Highlights */}
          {weeklySummary && (
            <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-3xl p-6 space-y-2">
              <h3 className="font-extrabold text-base text-teal-900 dark:text-teal-200">
                Weekly Health Compliance Brief
              </h3>
              <p className="text-xs text-teal-800 dark:text-teal-300 leading-relaxed font-medium">
                During the period ({weeklySummary.week_start} to {weeklySummary.week_end}), the patient completed{' '}
                <strong>{weeklySummary.doses_taken}</strong> scheduled medication doses with an adherence rate of{' '}
                <strong>{weeklySummary.adherence_rate}%</strong> ({weeklySummary.adherence_status}).{' '}
                {weeklySummary.appointments_attended} clinical appointments attended and{' '}
                {weeklySummary.caregiver_hours} hours of dedicated caregiver support logged.
              </p>
            </div>
          )}
        </>
      )}

    </div>
  );
};
