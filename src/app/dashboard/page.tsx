"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthUser } from '../../hooks/useAuthUser';

export default function DashboardRedirect() {
  const router = useRouter();
  const { user, profile, loading } = useAuthUser();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/auth');
      return;
    }
    if (profile?.role === 'admin') {
      router.replace('/dashboard/admin');
    } else if (profile?.role === 'teacher') {
      router.replace('/dashboard/teacher');
    } else {
      router.replace('/dashboard/student');
    }
  }, [loading, user, profile, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-sm text-slate-500">Loading your dashboard…</p>
    </main>
  );
}
