// One-time migration: promote hayagiriadmin@gmail.com from teacher to admin.
// Run with: npm run promote-admin

const fs = require('fs');
const path = require('path');
const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const TARGET_EMAIL = 'hayagiriadmin@gmail.com';

// dotenv isn't a project dependency, so .env.local is parsed by hand instead
// of pulling in a new package for a one-off script.
function loadEnvLocal() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;

  const contents = fs.readFileSync(envPath, 'utf8');
  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

// Same credential pattern as src/lib/firebaseAdmin.ts — guards against
// "already initialized" so the script is safe to re-run.
function getAdminApp() {
  const existing = getApps()[0];
  if (existing) return existing;

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials — set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and ' +
        'FIREBASE_ADMIN_PRIVATE_KEY in .env.local (see .env.local.example).',
    );
  }

  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
}

async function main() {
  const db = getFirestore(getAdminApp());

  const snap = await db.collection('users').where('email', '==', TARGET_EMAIL).limit(1).get();

  if (snap.empty) {
    console.error(`No user found with that email (${TARGET_EMAIL}) — they must sign up first.`);
    process.exit(1);
  }

  const doc = snap.docs[0];
  const data = doc.data();
  const oldRole = data.role;

  if (oldRole === 'admin') {
    console.log('Already admin, nothing to do');
    process.exit(0);
  }

  await doc.ref.update({ role: 'admin' });

  console.log('Promoted user to admin:');
  console.log(`  uid:      ${doc.id}`);
  console.log(`  email:    ${TARGET_EMAIL}`);
  console.log(`  old role: ${oldRole}`);
  console.log(`  new role: admin`);
}

main().catch((err) => {
  console.error('Failed to promote user to admin:', err);
  process.exit(1);
});
