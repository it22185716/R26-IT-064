'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import AdminShell from '../../../../components/dashboard/AdminShell';
import GlassCard from '../../../../components/dashboard/GlassCard';
import { fetchAuditLog } from '../../../../lib/adminApi';
import { formatRelativeTime } from '../../../../lib/format';
import { AdminAuditLogEntry } from '../../../../lib/types';

function describeEntry(entry: AdminAuditLogEntry): string {
  switch (entry.action) {
    case 'user_created': {
      const role = (entry.details.role as string) || 'user';
      return `${entry.actorName} created a ${role} account for ${entry.targetEmail}`;
    }
    case 'user_role_changed': {
      const oldRole = (entry.details.oldRole as string) || 'unknown';
      const newRole = (entry.details.newRole as string) || 'unknown';
      return `${entry.actorName} changed ${entry.targetEmail}'s role from ${oldRole} to ${newRole}`;
    }
    case 'user_deleted':
      return `${entry.actorName} deleted the account for ${entry.targetEmail}`;
    default:
      return `${entry.actorName} performed ${entry.action} on ${entry.targetEmail}`;
  }
}

export default function AdminAuditLogPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();
  const [entries, setEntries] = useState<AdminAuditLogEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  async function loadEntries() {
    setLoadError(null);
    setEntries(null);
    try {
      const data = await fetchAuditLog();
      setEntries(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load the audit log');
    }
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    loadEntries();
  }, [profile]);

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <AdminShell userName={profile?.name || user.email || ''} title="Audit Log">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <p className="text-sm text-slate-500">Management</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Audit Log</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
          Every user created, role changed, or account deleted by an admin, most recent first.
        </p>

        <GlassCard hover={false} className="mt-8 p-6">
          {loadError ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <span>{loadError}</span>
              <button type="button" onClick={loadEntries} className="font-medium underline hover:text-rose-900">
                Retry
              </button>
            </div>
          ) : !entries ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-slate-500">No admin activity yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <li key={entry.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                  <p className="text-sm text-slate-700">{describeEntry(entry)}</p>
                  <p
                    className="shrink-0 text-xs text-slate-400"
                    title={new Date(entry.createdAt).toLocaleString()}
                  >
                    {formatRelativeTime(entry.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </main>
    </AdminShell>
  );
}
