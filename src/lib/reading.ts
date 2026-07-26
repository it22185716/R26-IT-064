import { ReadingAttempt, ReadingDifficulty, ReadingPassage } from './types';
import { db } from './firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export type ReadingAssessResult = {
  accuracy: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  wrongWords: string[];
  missingWords: string[];
  extraWords: string[];
  nextDifficulty: ReadingDifficulty;
  message: string;
};

export async function fetchPassage(difficulty: ReadingDifficulty, studentId: string): Promise<ReadingPassage> {
  const params = new URLSearchParams({ difficulty, studentId });
  const res = await fetch(`/api/reading/passage?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch a reading passage.');
  }
  return data.passage as ReadingPassage;
}

export async function submitReadingAttempt(formData: FormData): Promise<ReadingAssessResult> {
  const res = await fetch('/api/reading/assess', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit the reading attempt.');
  }
  return data as ReadingAssessResult;
}

export async function fetchReadingHistory(studentId: string): Promise<ReadingAttempt[]> {
  const q = query(collection(db, 'readingAttempts'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const attempts = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReadingAttempt));
  attempts.sort((a, b) => b.completedAt - a.completedAt);
  return attempts;
}
