import { adminAuth, adminDb } from './firebaseAdmin';

// API Route Handlers for admin actions (role changes, deletes) must not
// trust a client-supplied uid — unlike student-facing routes, a spoofed uid
// here would let anyone grant themselves admin. This verifies a real,
// current Firebase ID token and confirms the token's own uid has the admin
// role in Firestore before the caller is trusted.
export async function requireAdmin(request: Request): Promise<{ uid: string; name: string } | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const idToken = authHeader.slice('Bearer '.length);
  if (!idToken) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const userSnap = await adminDb.collection('users').doc(decoded.uid).get();
    if (!userSnap.exists) return null;

    const data = userSnap.data();
    if (data?.role !== 'admin') return null;

    // Already fetched above for the role check — reused here so callers that
    // need the acting admin's name (e.g. audit log entries) don't have to
    // issue a second read for it.
    return { uid: decoded.uid, name: data?.name || '' };
  } catch {
    // Expired/malformed/revoked tokens all land here — callers respond
    // 401/403 uniformly rather than needing to distinguish failure modes.
    return null;
  }
}
