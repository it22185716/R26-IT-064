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
      try {
        setProfile(u ? await getUserProfile(u.uid) : null);
      } catch (err) {
        // A failed profile read (rules denial, transient network error, a
        // race on a brand-new signup before the profile doc is readable)
        // must not leave `loading` stuck true forever — every gated page
        // would hang on its loading state. Fall back to no profile instead.
        console.error('useAuthUser: failed to load profile', err);
        setProfile(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, profile, loading };
}
