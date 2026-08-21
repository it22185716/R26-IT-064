import { adminDb } from './firebaseAdmin';
import { AdminAuditLogEntry } from './types';

// Server-side only (imports adminDb) — called from admin API routes after a
// mutation already succeeded. A logging failure must never undo or block
// the action that triggered it (e.g. a user delete must still go through
// even if the log entry fails to save), so this swallows its own errors.
export async function recordAuditLog(entry: Omit<AdminAuditLogEntry, 'id' | 'createdAt'>): Promise<void> {
  try {
    await adminDb.collection('adminAuditLog').add({ ...entry, createdAt: Date.now() });
  } catch (err) {
    console.error('recordAuditLog: failed to write audit log entry', err);
  }
}
