import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

// API Route Handlers run server-side with no signed-in user, so the client
// SDK's Firestore Security Rules (which gate on request.auth) always deny
// them. The Admin SDK authenticates as a service account instead, which
// bypasses Security Rules entirely — this must only ever be imported from
// server-side code (route handlers), never from anything bundled to the browser.
function getAdminApp(): App {
  // getApps() persists across Next.js dev-mode hot reloads within the same
  // process, so re-running this module must reuse the existing app instead
  // of calling initializeApp() again (which throws "already exists").
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  // .env files can't hold literal newlines in a single-line value, so the
  // private key is stored with escaped "\n" sequences and unescaped here.
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials — set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and ' +
        'FIREBASE_ADMIN_PRIVATE_KEY in .env.local (see .env.local.example).',
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

let cachedDb: Firestore | undefined;

function getAdminDb(): Firestore {
  if (!cachedDb) cachedDb = getFirestore(getAdminApp());
  return cachedDb;
}

// A Proxy rather than a plain `getFirestore(getAdminApp())` at module scope —
// `next build` imports route handler modules to collect their metadata, which
// would otherwise construct the Admin app (and throw on missing credentials)
// at build time instead of at request time. Every property access below is
// forwarded to the real Firestore instance, created lazily on first use.
export const adminDb: Firestore = new Proxy({} as Firestore, {
  get(_target, prop, _receiver) {
    const db = getAdminDb();
    const value = Reflect.get(db, prop, db);
    return typeof value === 'function' ? value.bind(db) : value;
  },
});

let cachedAuth: Auth | undefined;

function getAdminAuth(): Auth {
  if (!cachedAuth) cachedAuth = getAuth(getAdminApp());
  return cachedAuth;
}

// Same lazy-Proxy rationale as adminDb above — defers constructing the Admin
// app (and throwing on missing credentials) until first use, not build time.
export const adminAuth: Auth = new Proxy({} as Auth, {
  get(_target, prop, _receiver) {
    const authInstance = getAdminAuth();
    const value = Reflect.get(authInstance, prop, authInstance);
    return typeof value === 'function' ? value.bind(authInstance) : value;
  },
});
