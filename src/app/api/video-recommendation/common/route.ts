import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Reads the same catalog the ML weak-area service uses (ml-services/video-recommendation/videos.csv)
// directly off disk, rather than going through the Flask model — "common" videos aren't
// personalized to any one weak area, so there's no need for the classifier or for that
// service to be running.
type CommonVideo = {
  weakArea: string;
  title: string;
  url: string;
  duration: string;
  difficulty: string;
  score: number;
};

let cache: CommonVideo[] | null = null;

function loadCatalog(): CommonVideo[] {
  if (cache) return cache;
  const csvPath = path.join(process.cwd(), 'ml-services', 'video-recommendation', 'videos.csv');
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const rows = raw
    .trim()
    .split('\n')
    .slice(1)
    .map((line) => {
      const [weakArea, title, url, duration, difficulty, , , recommendationScore] = line.split(',');
      return { weakArea, title, url, duration, difficulty, score: parseFloat(recommendationScore) || 0 };
    });
  cache = rows;
  return rows;
}

export async function GET() {
  try {
    const rows = loadCatalog();
    const bestPerArea = new Map<string, CommonVideo>();
    for (const row of rows) {
      const existing = bestPerArea.get(row.weakArea);
      if (!existing || row.score > existing.score) bestPerArea.set(row.weakArea, row);
    }
    const videos = Array.from(bestPerArea.values()).sort((a, b) => b.score - a.score);
    return NextResponse.json({ success: true, videos });
  } catch {
    return NextResponse.json({ success: false, videos: [] }, { status: 500 });
  }
}
