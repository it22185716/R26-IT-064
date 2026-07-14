export type UserRole = 'student' | 'teacher';

export type UserProfile = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: number;
};

export type QuizAttempt = {
  id: string;
  studentId: string;
  studentName: string;
  categoryScores: Record<string, number>;
  weakestCategory: string;
  totalScore: number;
  maxScore: number;
  completedAt: number;
};
