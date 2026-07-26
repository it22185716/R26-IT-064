import { NextResponse } from 'next/server';
import { collection, getDocs, query, where } from 'firebase/firestore/lite';
import { db } from '@/lib/firebaseServer';
import { ReadingPassage } from '@/lib/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const difficulty = searchParams.get('difficulty');
  const studentId = searchParams.get('studentId');

  if (!difficulty) {
    return NextResponse.json({ error: 'Missing difficulty' }, { status: 400 });
  }
  if (!studentId) {
    return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
  }

  const passagesSnap = await getDocs(
    query(collection(db, 'readingPassages'), where('difficulty', '==', difficulty)),
  );
  const passages = passagesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ReadingPassage));

  const attemptsSnap = await getDocs(
    query(collection(db, 'readingAttempts'), where('studentId', '==', studentId)),
  );
  const attemptedPassageIds = new Set(attemptsSnap.docs.map((d) => d.data().passageId as string));

  const unattempted = passages.filter((p) => !attemptedPassageIds.has(p.passageId));
  const pool = unattempted.length > 0 ? unattempted : passages;

  if (pool.length === 0) {
    return NextResponse.json({ error: `No passages found for difficulty '${difficulty}'` }, { status: 404 });
  }

  const passage = pool[Math.floor(Math.random() * pool.length)];
  return NextResponse.json({ passage });
}
