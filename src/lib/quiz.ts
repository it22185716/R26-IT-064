import questionBank from '../data/questionBank.json';

export const QUESTIONS_PER_SUBCATEGORY = 5;
export const QUIZ_DURATION_MINUTES = 60;

export type BankOption = { label: string; text: string; points: number };
export type BankQuestion = {
  id: string;
  category: string;
  subCategory: string;
  difficulty: string;
  question: string;
  options: BankOption[];
  correctLabel: string;
};

const bank = questionBank as BankQuestion[];

export function pickQuizQuestions(): BankQuestion[] {
  const subCategories = Array.from(new Set(bank.map((q) => q.subCategory)));
  const selected: BankQuestion[] = [];

  for (const subCategory of subCategories) {
    const pool = bank.filter((q) => q.subCategory === subCategory);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    selected.push(...shuffled.slice(0, QUESTIONS_PER_SUBCATEGORY));
  }

  return selected.sort(() => Math.random() - 0.5);
}
