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
  predictionMethod?: 'model' | 'rule';
  confidence?: number;
  totalScore: number;
  maxScore: number;
  completedAt: number;
};

export type MealOption = {
  food_id: string;
  name: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  cuisine: string;
};

export type MealOptions = {
  breakfast: MealOption[];
  lunch: MealOption[];
  dinner: MealOption[];
  snack: MealOption[];
};

export type MealPlanProfile = {
  age: number;
  height_cm: number;
  weight_kg: number;
  gender: string;
  bmi: number;
  allergies: string[];
};

export type DayPlan = {
  day: number;
  breakfast: MealOption;
  lunch: MealOption;
  dinner: MealOption;
  snack: MealOption;
};

export type MealPlanProgress = {
  previousPlanId: string | null;
  daysSinceLastPlan: number | null;
  heightChangeCm: number | null;
  weightChangeKg: number | null;
  bmiChange: number | null;
};

export type MealPlan = {
  id: string;
  studentId: string;
  profile: MealPlanProfile;
  nutritionalStatus: string;
  mealGoal: string;
  confidence: number | null;
  mealOptions: MealOptions;
  createdAt: number;
  expiresAt: number;
  weeklyCalendar: DayPlan[];
  progressSinceLastPlan: MealPlanProgress | null;
};

export type ReadingDifficulty = 'Easy' | 'Medium' | 'Hard';

export type ReadingPassage = {
  id: string;
  passageId: string;
  text: string;
  difficulty: ReadingDifficulty;
};

export type ReadingAttempt = {
  id: string;
  studentId: string;
  passageId: string;
  difficulty: ReadingDifficulty;
  accuracy: number;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  wrongWords: string[];
  missingWords: string[];
  extraWords: string[];
  completedAt: number;
};

export type AssignedVideo = {
  id: string;
  studentId: string;
  title: string;
  url: string;
  note?: string;
  assignedByName: string;
  createdAt: number;
};
