'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../../../hooks/useAuthUser';
import AdminShell from '../../../../components/dashboard/AdminShell';
import GlassCard from '../../../../components/dashboard/GlassCard';
import { fetchUsers, updateUserRole, deleteUser, createUser } from '../../../../lib/adminApi';
import { UserProfile, UserRole } from '../../../../lib/types';

type RoleFilter = 'all' | UserRole;

const ROLE_FILTERS: { value: RoleFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'student', label: 'Student' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'admin', label: 'Admin' },
];

const CREATE_ROLES: UserRole[] = ['student', 'teacher', 'admin'];
const PASSWORD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';

function generatePassword(): string {
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('');
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();

  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createPasswordVisible, setCreatePasswordVisible] = useState(false);
  const [createRole, setCreateRole] = useState<UserRole>('student');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [createdConfirmation, setCreatedConfirmation] = useState<{ name: string; password: string } | null>(null);

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

  async function loadUsers() {
    setLoadError(null);
    setUsers(null);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load users');
    }
  }

  useEffect(() => {
    if (!profile || profile.role !== 'admin') return;
    loadUsers();
  }, [profile]);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (term && !(u.name || '').toLowerCase().includes(term) && !(u.email || '').toLowerCase().includes(term)) {
        return false;
      }
      return true;
    });
  }, [users, search, roleFilter]);

  async function handleRoleChange(target: UserProfile, newRole: UserRole) {
    if (newRole === target.role) return;

    const previousRole = target.role;
    setRowErrors((e) => ({ ...e, [target.uid]: '' }));
    setUpdatingUid(target.uid);
    setUsers((list) => list && list.map((u) => (u.uid === target.uid ? { ...u, role: newRole } : u)));

    try {
      await updateUserRole(target.uid, newRole);
    } catch (err) {
      setUsers((list) => list && list.map((u) => (u.uid === target.uid ? { ...u, role: previousRole } : u)));
      setRowErrors((e) => ({
        ...e,
        [target.uid]: err instanceof Error ? err.message : 'Failed to update role',
      }));
    } finally {
      setUpdatingUid(null);
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteUser(deleteTarget.uid);
      setUsers((list) => list && list.filter((u) => u.uid !== deleteTarget.uid));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  }

  function openCreateModal() {
    setCreateName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreatePasswordVisible(false);
    setCreateRole('student');
    setCreateError(null);
    setShowCreateModal(true);
  }

  function closeCreateModal() {
    if (createSubmitting) return;
    setShowCreateModal(false);
  }

  function handleGeneratePassword() {
    setCreatePassword(generatePassword());
    setCreatePasswordVisible(true);
  }

  async function handleCopyPassword() {
    if (!createPassword) return;
    try {
      await navigator.clipboard.writeText(createPassword);
      setPasswordCopied(true);
      setTimeout(() => setPasswordCopied(false), 1500);
    } catch {
      // Clipboard API unavailable or denied — nothing more we can do here.
    }
  }

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    try {
      const created = await createUser({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      });
      setUsers((list) => (list ? [created, ...list] : [created]));
      setShowCreateModal(false);
      setCreatedConfirmation({ name: created.name || created.email, password: createPassword });
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setCreateSubmitting(false);
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </main>
    );
  }

  return (
    <AdminShell userName={profile?.name || user.email || ''} title="Users">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Management</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Users</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">All registered accounts.</p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-700 hover:shadow-md active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create user
          </button>
        </div>

        {createdConfirmation && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>
              Account created. Share this password with{' '}
              <span className="font-semibold">{createdConfirmation.name}</span>:{' '}
              <code className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono">{createdConfirmation.password}</code>
            </span>
            <button
              type="button"
              onClick={() => setCreatedConfirmation(null)}
              aria-label="Dismiss"
              className="shrink-0 text-emerald-700 hover:text-emerald-900"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <GlassCard hover={false} className="mt-8 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
            />
            <div className="flex flex-wrap gap-2">
              {ROLE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setRoleFilter(f.value)}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150 ${
                    roleFilter === f.value
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6">
            {loadError ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <span>{loadError}</span>
                <button type="button" onClick={loadUsers} className="font-medium underline hover:text-rose-900">
                  Retry
                </button>
              </div>
            ) : !users ? (
              <p className="text-sm text-slate-400">Loading…</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-sm text-slate-500">No users match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 border-b border-slate-100">
                      <th className="py-2 font-medium">Name</th>
                      <th className="py-2 font-medium">Email</th>
                      <th className="py-2 font-medium">Role</th>
                      <th className="py-2 font-medium">Joined</th>
                      <th className="py-2 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const isSelf = u.uid === user.uid;
                      return (
                        <tr key={u.uid}>
                          <td className="py-3 font-medium text-slate-700">{u.name || '—'}</td>
                          <td className="py-3 text-slate-600">{u.email}</td>
                          <td className="py-3">
                            <select
                              value={u.role}
                              disabled={isSelf || updatingUid === u.uid}
                              onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                              title={isSelf ? "You can't change your own role" : undefined}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium capitalize outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <option value="student">Student</option>
                              <option value="teacher">Teacher</option>
                              <option value="admin">Admin</option>
                            </select>
                            {rowErrors[u.uid] && (
                              <p className="mt-1 text-xs text-rose-600">{rowErrors[u.uid]}</p>
                            )}
                          </td>
                          <td className="py-3 text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setDeleteError(null);
                                setDeleteTarget(u);
                              }}
                              disabled={isSelf}
                              aria-label="Delete user"
                              title={isSelf ? "You can't delete your own account" : 'Delete user'}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors duration-150 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </GlassCard>
      </main>

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete this account?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This permanently deletes <span className="font-medium text-slate-800">{deleteTarget.name || deleteTarget.email}</span>&apos;s
              account and cannot be undone.
            </p>
            {deleteError && <p className="mt-3 text-sm text-rose-600">{deleteError}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError(null);
                }}
                disabled={deleting}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Create user</h3>
            <p className="mt-1 text-sm text-slate-500">Sets up an account and profile immediately — no signup required.</p>

            {createError && (
              <div className="mt-4 flex items-start gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-100 px-3 py-2.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                {createError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  type="text"
                  required
                  placeholder="Jane Silva"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  required
                  placeholder="you@example.com"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  className="mt-1.5 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
                />
              </label>

              <div>
                <span className="text-sm font-medium text-slate-700">Password</span>
                <div className="mt-1.5 flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={createPasswordVisible ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="At least 6 characters"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      className="block w-full rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-10 py-2.5 text-sm outline-none transition-all focus:border-sky-500 focus:ring-2 focus:ring-sky-100 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setCreatePasswordVisible((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {createPasswordVisible ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePassword}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    Generate
                  </button>
                </div>
                {createPassword && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="mt-1.5 text-xs font-medium text-sky-600 hover:text-sky-800"
                  >
                    {passwordCopied ? 'Copied!' : 'Copy password'}
                  </button>
                )}
              </div>

              <div>
                <span className="text-sm font-medium text-slate-700">Role</span>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {CREATE_ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCreateRole(r)}
                      className={`rounded-lg border px-3 py-2.5 text-sm font-medium capitalize transition-colors ${
                        createRole === r
                          ? 'border-sky-600 bg-sky-50 text-sky-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={createSubmitting}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-sky-700 hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
                >
                  {createSubmitting && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {createSubmitting ? 'Creating…' : 'Create account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
