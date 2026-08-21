import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireAdmin } from '@/lib/adminAuth';
import { AdminAuditLogEntry } from '@/lib/types';

export async function GET(request: Request) {
  const caller = await requireAdmin(request);
  if (!caller) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const snap = await adminDb.collection('adminAuditLog').orderBy('createdAt', 'desc').limit(100).get();
  const entries = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdminAuditLogEntry));

  return NextResponse.json({ entries });
}
