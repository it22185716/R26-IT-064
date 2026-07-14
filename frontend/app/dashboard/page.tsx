"use client";

import React, { useEffect, useState } from 'react';
import { auth } from '../../src/lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace('/auth');
      } else {
        setUser(u);
      }
    });
    return () => unsub();
  }, [router]);

  async function handleSignOut() {
    await signOut(auth);
    router.replace('/auth');
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="mt-4 text-slate-600">Welcome {user?.email ?? ''}</p>
        <div className="mt-6">
          <button onClick={handleSignOut} className="px-4 py-2 rounded bg-red-600 text-white">
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
