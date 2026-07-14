"use client";

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getUserProfile } from '../lib/userProfile';
import { UserProfile } from '../lib/types';

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setProfile(u ? await getUserProfile(u.uid) : null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, profile, loading };
}
