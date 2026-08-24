import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | undefined;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);

// Chrome's QUIC transport can fail outright on some networks (VPNs,
// corporate proxies, flaky Wi-Fi) — ERR_QUIC_PROTOCOL_ERROR / QUIC_TOO_MANY_RTOS
// on the Firestore Listen channel. Auto-detecting long polling falls back to
// plain XHR polling in those environments instead of insisting on QUIC.
let db;
try {
  db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
} catch {
  // Settings can only be set once per app — if this module re-runs (e.g. Fast
  // Refresh) after Firestore already started, just reuse the existing instance.
  db = getFirestore(app);
}

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
