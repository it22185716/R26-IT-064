import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { recordAuditLog } from '@/lib/auditLog';
import { UserProfile, UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ['student', 'teacher', 'admin'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(request: Request) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const snap = await adminDb.collection('users').get();
  const users = snap.docs
    .map((d) => ({ uid: d.id, ...d.data() } as UserProfile))
    .sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ users });
}

// Accounts are only ever created by an admin from here — public self-registration
// has been removed from /auth entirely. This must go through the Admin SDK
// (adminAuth.createUser) rather than the client createUserWithEmailAndPassword,
// because the latter would sign the calling admin out and into the new account.
export async function POST(request: Request) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const body = (await request.json()) as { name?: string; email?: string; password?: string; role?: UserRole };
  const { name, email, password, role } = body;

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  let createdUid: string;
  try {
    const createdUser = await adminAuth.createUser({ email, password, displayName: name });
    createdUid = createdUser.uid;
  } catch (err: any) {
    if (err?.code === 'auth/email-already-exists') {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: err?.message || 'Failed to create account' }, { status: 500 });
  }

  const profile: UserProfile = { uid: createdUid, email, name, role, createdAt: Date.now() };

  try {
    await adminDb.collection('users').doc(createdUid).set(profile);
  } catch (err: any) {
    // Don't leave an orphaned Auth account with no Firestore profile.
    try {
      await adminAuth.deleteUser(createdUid);
    } catch {
      // Best-effort cleanup — nothing more to do if this also fails.
    }
    return NextResponse.json({ error: err?.message || 'Failed to save the new user profile' }, { status: 500 });
  }

  await recordAuditLog({
    action: 'user_created',
    actorUid: caller.uid,
    actorName: caller.name,
    targetUid: createdUid,
    targetEmail: email,
    details: { role },
  });

  return NextResponse.json(profile, { status: 201 });
}
