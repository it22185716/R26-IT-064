import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile, UserRole } from './types';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

export async function createUserProfile(params: {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
}): Promise<UserProfile> {
  const profile: UserProfile = { ...params, createdAt: Date.now() };
  await setDoc(doc(db, 'users', params.uid), profile);
  return profile;
}

export async function ensureUserProfile(params: {
  uid: string;
  email: string;
  name: string;
  defaultRole: UserRole;
}): Promise<UserProfile> {
  const existing = await getUserProfile(params.uid);
  if (existing) return existing;
  return createUserProfile({
    uid: params.uid,
    email: params.email,
    name: params.name,
    role: params.defaultRole,
  });
}
