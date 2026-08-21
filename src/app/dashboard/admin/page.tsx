'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../hooks/useAuthUser';
import AdminShell from '../../../components/dashboard/AdminShell';
import GlassCard from '../../../components/dashboard/GlassCard';
import StatCard from '../../../components/StatCard';
import { fetchAdminStats, fetchServiceHealth, AdminStats, ServiceHealthResponse } from '../../../lib/adminApi';
import { formatRelativeTime } from '../../../lib/format';

const HEALTH_POLL_MS = 30000;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatShortDate(dateKey: string): string {
  // dateKey is 'YYYY-MM-DD'; parsed as local time (not UTC) so it lines up
  // with the same local-time boundaries the stats route bucketed by.
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthResponse | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }
    if (profile && profile.role !== 'admin') {
      router.replace(profile.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student');
    }
  }, [loading, user, profile, router]);

  async function loadStats() {
    setStatsError(null);
    try {
      const data = await fetchAdminStats();
      setStats(data);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : 'Failed to load stats');
    }
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    loadStats();
  }, [profile]);

  async function loadServiceHealth() {
    setHealthError(null);
    try {
      const data = await fetchServiceHealth();
      setServiceHealth(data);
    } catch (err) {
      setHealthError(err instanceof Error ? err.message : 'Failed to load service health');
    }
  }

  function startHealthPolling() {
    if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
    healthIntervalRef.current = setInterval(() => {
      // Skip the fetch (but keep the timer running) while the tab is in the
      // background — no point polling status the admin isn't looking at.
      if (document.visibilityState === 'hidden') return;
      loadServiceHealth();
    }, HEALTH_POLL_MS);
  }

  function handleRefreshHealthNow() {
    loadServiceHealth();
    startHealthPolling();
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    loadServiceHealth();
    startHealthPolling();
    return () => {
      if (healthIntervalRef.current) clearInterval(healthIntervalRef.current);
    };
  }, [profile]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  const maxSignups = Math.max(1, ...(stats?.signupsByDay.map((d) => d.count) || [0]));
  const totalUsers = stats ? stats.studentCount + stats.teacherCount + stats.adminCount : 0;

  return (
    <AdminShell userName={profile?.name || user.email || ''} title="Overview">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="space-y-8">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 px-6 py-8 sm:px-10 sm:py-10">
            <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className="absolute -top-16 -left-10 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl animate-blob" />
              <div className="absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-gold-400/20 blur-3xl animate-blob [animation-delay:3s]" />
              <div className="absolute top-1/2 right-1/4 h-48 w-48 rounded-full bg-sky-400/10 blur-3xl animate-blob [animation-delay:5s]" />
            </div>

            <div className="relative">
              <p className="text-sm font-medium text-indigo-200">{getGreeting()}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-white">{profile?.name || 'Admin'}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                Welcome to the admin dashboard.
              </p>
            </div>
          </div>

          {statsError && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>{statsError}</span>
              <button type="button" onClick={loadStats} className="font-medium underline hover:text-rose-900">
                Retry
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              label="Total students"
              value={stats ? String(stats.studentCount) : '—'}
              gradient="from-sky-500 to-blue-600"
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-4.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4"
                />
              }
            />
            <StatCard
              label="Total teachers"
              value={stats ? String(stats.teacherCount) : '—'}
              gradient="from-blue-500 to-indigo-600"
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                />
              }
            />
            <StatCard
              label="Quiz attempts"
              value={stats ? String(stats.quizAttemptCount) : '—'}
              gradient="from-violet-500 to-purple-600"
              icon={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />}
            />
            <StatCard
              label="Meal plans created"
              value={stats ? String(stats.mealPlanCount) : '—'}
              gradient="from-emerald-500 to-teal-600"
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 21V12.75M8.25 12.75a2.25 2.25 0 01-2.25-2.25V3.75m2.25 9a2.25 2.25 0 002.25-2.25V3.75M8.25 3.75v3M15.75 3.75c0 3-2.25 4.5-2.25 7.5 0 1.036.84 1.875 1.875 1.875h.375V21"
                />
              }
            />
            <StatCard
              label="Reading attempts"
              value={stats ? String(stats.readingAttemptCount) : '—'}
              gradient="from-amber-500 to-orange-600"
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              }
            />
            <StatCard
              label="Videos assigned"
              value={stats ? String(stats.assignedVideoCount) : '—'}
              gradient="from-rose-500 to-pink-600"
              icon={
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              }
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <GlassCard hover={false} className="p-6 lg:col-span-2">
              <h3 className="font-semibold text-slate-900">Signups (last 14 days)</h3>
              {!stats ? (
                <p className="mt-4 text-sm text-slate-400">Loading…</p>
              ) : (
                <>
                  <div className="mt-6 flex h-32 items-end gap-1.5">
                    {stats.signupsByDay.map((d) => {
                      const heightPct = d.count === 0 ? 4 : Math.max(10, Math.round((d.count / maxSignups) * 100));
                      return (
                        <div
                          key={d.date}
                          title={`${d.date}: ${d.count} signup${d.count === 1 ? '' : 's'}`}
                          className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-500 to-violet-400"
                          style={{ height: `${heightPct}%` }}
                        />
                      );
                    })}
                  </div>
                  <div className="mt-2 flex justify-between text-[11px] text-slate-400">
                    <span>{formatShortDate(stats.signupsByDay[0].date)}</span>
                    <span>{formatShortDate(stats.signupsByDay[stats.signupsByDay.length - 1].date)}</span>
                  </div>
                </>
              )}
            </GlassCard>

            <GlassCard hover={false} className="p-6">
              <h3 className="font-semibold text-slate-900">Users by role</h3>
              {!stats ? (
                <p className="mt-4 text-sm text-slate-400">Loading…</p>
              ) : (
                <>
                  <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                    {totalUsers > 0 && (
                      <>
                        <div
                          className="bg-sky-500"
                          style={{ width: `${(stats.studentCount / totalUsers) * 100}%` }}
                        />
                        <div
                          className="bg-indigo-500"
                          style={{ width: `${(stats.teacherCount / totalUsers) * 100}%` }}
                        />
                        <div
                          className="bg-slate-900"
                          style={{ width: `${(stats.adminCount / totalUsers) * 100}%` }}
                        />
                      </>
                    )}
                  </div>
                  <ul className="mt-4 space-y-3 text-sm">
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                        Students
                      </span>
                      <span className="text-slate-500">{stats.studentCount}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
                        Teachers
                      </span>
                      <span className="text-slate-500">{stats.teacherCount}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                        Admins
                      </span>
                      <span className="text-slate-500">{stats.adminCount}</span>
                    </li>
                  </ul>
                </>
              )}
            </GlassCard>
          </div>

          <GlassCard hover={false} className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-900">ML service health</h3>
              <button
                type="button"
                onClick={handleRefreshHealthNow}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-sky-600 transition-colors hover:text-sky-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Refresh now
              </button>
            </div>

            {healthError && <p className="mt-3 text-sm text-rose-600">{healthError}</p>}

            {!serviceHealth ? (
              <p className="mt-4 text-sm text-slate-400">Checking service health…</p>
            ) : (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {serviceHealth.services.map((svc) => (
                  <div
                    key={svc.name}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        {svc.status === 'up' && (
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                            svc.status === 'up' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                      </span>
                      <span className="text-sm font-medium text-slate-700">{svc.name}</span>
                    </div>
                    <div className="text-right text-xs">
                      <p className={svc.status === 'up' ? 'font-medium text-slate-600' : 'font-medium text-rose-600'}>
                        {svc.status === 'up' ? `${svc.responseTimeMs}ms` : 'Down'}
                      </p>
                      <p className="text-slate-400">{formatRelativeTime(serviceHealth.checkedAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </main>
    </AdminShell>
  );
}
