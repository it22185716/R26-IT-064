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

export type MealPlan = {
  id: string;
  studentId: string;
  profile: MealPlanProfile;
  nutritionalStatus: string;
  mealGoal: string;
  confidence: number | null;
  mealOptions: MealOptions;
  createdAt: number;
};
