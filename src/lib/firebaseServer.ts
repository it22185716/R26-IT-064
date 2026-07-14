import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore/lite';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const SERVER_APP_NAME = 'server';

const serverApp =
  getApps().find((a) => a.name === SERVER_APP_NAME) ?? initializeApp(firebaseConfig, SERVER_APP_NAME);

// Route Handlers only ever need one-shot reads/writes, never realtime
// listeners, so the Lite SDK (plain REST, no gRPC/long-polling) is the
// right fit — and it sidesteps the gRPC transport breaking under
// Next.js's webpack bundling ("message.copy is not a function").
export const db = getFirestore(serverApp);
