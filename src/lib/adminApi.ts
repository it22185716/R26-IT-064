import { auth } from './firebase';
import { AdminAuditLogEntry, UserProfile, UserRole } from './types';

export type AdminStats = {
  studentCount: number;
  teacherCount: number;
  adminCount: number;
  quizAttemptCount: number;
  mealPlanCount: number;
  readingAttemptCount: number;
  assignedVideoCount: number;
  signupsByDay: { date: string; count: number }[];
};

export type ServiceHealthEntry = {
  name: string;
  url: string;
  status: 'up' | 'down';
  responseTimeMs: number | null;
  details: Record<string, unknown> | null;
};

export type ServiceHealthResponse = {
  services: ServiceHealthEntry[];
  checkedAt: number;
};

async function authHeaders(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data?.error || fallback;
  } catch {
    return fallback;
  }
}

export async function fetchUsers(): Promise<UserProfile[]> {
  const res = await fetch('/api/admin/users', { headers: await authHeaders() });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to load users'));
  const data = await res.json();
  return data.users as UserProfile[];
}

export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  const res = await fetch(`/api/admin/users/${uid}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to update role'));
}

export async function deleteUser(uid: string): Promise<void> {
  const res = await fetch(`/api/admin/users/${uid}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to delete user'));
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await fetch('/api/admin/stats', { headers: await authHeaders() });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to load stats'));
  return (await res.json()) as AdminStats;
}

export async function createUser(params: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<UserProfile> {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to create user'));
  return (await res.json()) as UserProfile;
}

export async function fetchServiceHealth(): Promise<ServiceHealthResponse> {
  const res = await fetch('/api/admin/service-health', { headers: await authHeaders() });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to load service health'));
  return (await res.json()) as ServiceHealthResponse;
}

export async function fetchAuditLog(): Promise<AdminAuditLogEntry[]> {
  const res = await fetch('/api/admin/audit-log', { headers: await authHeaders() });
  if (!res.ok) throw new Error(await readErrorMessage(res, 'Failed to load the audit log'));
  const data = await res.json();
  return data.entries as AdminAuditLogEntry[];
}
