import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { ReadingDifficulty, ReadingPassage } from '@/lib/types';

const READING_SERVICE_URL = process.env.READING_SERVICE_URL || 'http://127.0.0.1:5003';

type ReadingLevel = 'HIGH' | 'MEDIUM' | 'LOW';

// Exact transitions from the research notebook — do not change.
const NEXT_DIFFICULTY: Record<ReadingLevel, Record<ReadingDifficulty, ReadingDifficulty>> = {
  HIGH: { Easy: 'Medium', Medium: 'Hard', Hard: 'Hard' },
  MEDIUM: { Easy: 'Easy', Medium: 'Medium', Hard: 'Hard' },
  LOW: { Easy: 'Easy', Medium: 'Easy', Hard: 'Medium' },
};

const LEVEL_MESSAGE: Record<ReadingLevel, string> = {
  HIGH: 'Great reading! Moving you up to a harder passage.',
  MEDIUM: "Good effort — you'll stay at this difficulty for now.",
  LOW: "Let's practice at an easier level to build confidence.",
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const audio = formData.get('audio');
  const passageId = formData.get('passageId');
  const studentId = formData.get('studentId');
  const currentDifficulty = formData.get('currentDifficulty') as ReadingDifficulty | null;

  if (!(audio instanceof Blob)) {
    return NextResponse.json({ error: 'Missing audio recording' }, { status: 400 });
  }
  if (typeof passageId !== 'string' || !passageId) {
    return NextResponse.json({ error: 'Missing passageId' }, { status: 400 });
  }
  if (typeof studentId !== 'string' || !studentId) {
    return NextResponse.json({ error: 'Missing studentId' }, { status: 400 });
  }
  if (!currentDifficulty) {
    return NextResponse.json({ error: 'Missing currentDifficulty' }, { status: 400 });
  }

  const passageSnap = await adminDb.collection('readingPassages').where('passageId', '==', passageId).get();
  if (passageSnap.empty) {
    return NextResponse.json({ error: `Unknown passageId '${passageId}'` }, { status: 404 });
  }
  const passage = { id: passageSnap.docs[0].id, ...passageSnap.docs[0].data() } as ReadingPassage;

  const forwardData = new FormData();
  forwardData.append('audio', audio, 'recording.webm');
  forwardData.append('correctText', passage.text);
  forwardData.append('currentDifficulty', currentDifficulty);

  let mlResponse: Response;
  try {
    mlResponse = await fetch(`${READING_SERVICE_URL}/api/assess-reading`, {
      method: 'POST',
      body: forwardData,
    });
  } catch {
    return NextResponse.json({ error: 'Reading assessment service is unreachable' }, { status: 502 });
  }

  const result = await mlResponse.json();
  if (!mlResponse.ok || !result.success) {
    return NextResponse.json({ error: result.error || 'Reading assessment failed' }, { status: 502 });
  }

  const level = result.level as ReadingLevel;
  const nextDifficulty = NEXT_DIFFICULTY[level][passage.difficulty];

  await adminDb.collection('readingAttempts').add({
    studentId,
    passageId,
    difficulty: passage.difficulty,
    accuracy: result.accuracy,
    level,
    wrongWords: result.wrongWords,
    missingWords: result.missingWords,
    extraWords: result.extraWords,
    completedAt: Date.now(),
  });

  return NextResponse.json({
    accuracy: result.accuracy,
    level,
    wrongWords: result.wrongWords,
    missingWords: result.missingWords,
    extraWords: result.extraWords,
    nextDifficulty,
    message: LEVEL_MESSAGE[level],
  });
}
