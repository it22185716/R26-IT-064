import { AssignedVideo } from './types';
import { db } from './firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';

export async function fetchAssignedVideos(studentId: string): Promise<AssignedVideo[]> {
  const q = query(collection(db, 'assignedVideos'), where('studentId', '==', studentId));
  const snap = await getDocs(q);
  const videos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssignedVideo));
  videos.sort((a, b) => b.createdAt - a.createdAt);
  return videos;
}

// Live listener — used where an assignment made elsewhere (e.g. a teacher
// assigning a video while the student's dashboard is already open) should
// show up without a manual refresh.
export function subscribeAssignedVideos(studentId: string, callback: (videos: AssignedVideo[]) => void) {
  const q = query(collection(db, 'assignedVideos'), where('studentId', '==', studentId));
  return onSnapshot(q, (snap) => {
    const videos = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AssignedVideo));
    videos.sort((a, b) => b.createdAt - a.createdAt);
    callback(videos);
  });
}

export async function assignVideo(params: {
  studentId: string;
  title: string;
  url: string;
  assignedByName: string;
  note?: string;
}): Promise<void> {
  await addDoc(collection(db, 'assignedVideos'), {
    studentId: params.studentId,
    title: params.title,
    url: params.url,
    assignedByName: params.assignedByName,
    ...(params.note ? { note: params.note } : {}),
    createdAt: Date.now(),
  });
}

export async function removeAssignedVideo(id: string): Promise<void> {
  await deleteDoc(doc(db, 'assignedVideos', id));
}
