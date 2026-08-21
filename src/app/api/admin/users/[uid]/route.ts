import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { recordAuditLog } from '@/lib/auditLog';
import { UserProfile, UserRole } from '@/lib/types';

const VALID_ROLES: UserRole[] = ['student', 'teacher', 'admin'];

export async function PATCH(request: Request, { params }: { params: { uid: string } }) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { uid } = params;
  const { role } = (await request.json()) as { role?: UserRole };

  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  if (uid === caller.uid) {
    return NextResponse.json({ error: "You can't change your own role" }, { status: 400 });
  }

  const userRef = adminDb.collection('users').doc(uid);
  const beforeSnap = await userRef.get();
  const before = beforeSnap.data() as UserProfile | undefined;

  await userRef.update({ role });

  const updated = await userRef.get();

  await recordAuditLog({
    action: 'user_role_changed',
    actorUid: caller.uid,
    actorName: caller.name,
    targetUid: uid,
    targetEmail: before?.email || '',
    details: { oldRole: before?.role, newRole: role },
  });

  return NextResponse.json({ uid: updated.id, ...updated.data() });
}

export async function DELETE(request: Request, { params }: { params: { uid: string } }) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { uid } = params;

  if (uid === caller.uid) {
    return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });
  }

  const userRef = adminDb.collection('users').doc(uid);
  const beforeSnap = await userRef.get();
  const before = beforeSnap.data() as UserProfile | undefined;

  await userRef.delete();

  try {
    await adminAuth.deleteUser(uid);
  } catch {
    // The Firestore profile is already gone at this point — a missing or
    // already-deleted Auth record shouldn't fail the request.
  }

  await recordAuditLog({
    action: 'user_deleted',
    actorUid: caller.uid,
    actorName: caller.name,
    targetUid: uid,
    targetEmail: before?.email || '',
    details: { role: before?.role },
  });

  return NextResponse.json({ success: true });
}
