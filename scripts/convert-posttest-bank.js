// One-off (re-runnable) converter: CSV -> src/data/postTestQuestionBank.json
//
// Source: src/data/studentPosttestQuestionBankV3.csv, columns:
//   question_id, topic, question_text, option_a, option_b, option_c, option_d,
//   option_e, correct_answer, difficulty_level
//
// Output shape matches BankQuestion from src/lib/quiz.ts:
//   { id, category, subCategory, difficulty, question, options: [{label, text, points}], correctLabel }
//
// Re-run with: node scripts/convert-posttest-bank.js
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, '..', 'src', 'data', 'studentPosttestQuestionBankV3.csv');
const OUT_PATH = path.join(__dirname, '..', 'src', 'data', 'postTestQuestionBank.json');

// The CSV's topic strings already match the app's 8 canonical subCategory
// strings exactly (verified by inspection), so no alias/normalization map
// is needed here.
const SUBCATEGORY_TO_CATEGORY = {
  Addition: 'Arithmetic',
  Subtraction: 'Arithmetic',
  Multiplication: 'Arithmetic',
  Division: 'Arithmetic',
  'Comparing Fractions': 'Fractions',
  'Ordering Fractions': 'Fractions',
  'Simplifying Fractions': 'Fractions',
  'Fraction to Decimal': 'Fractions',
};

const DIFFICULTY_LABELS = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

const FULL_POINTS = 4;

// Minimal RFC4180-style CSV parser: handles quoted fields, embedded commas,
// escaped ("") quotes, and embedded newlines inside quoted fields.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ',') {
      row.push(field);
      field = '';
      i += 1;
      continue;
    }
    if (c === '\r') {
      i += 1;
      continue;
    }
    if (c === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i += 1;
      continue;
    }
    field += c;
    i += 1;
  }
  // Trailing field/row (file may or may not end with a newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// The source data has stray double-quote artifacts around some option
// values (e.g. a raw cell of `"1/11"` round-trips through CSV export as
// `"""1/11"""`, which our parser correctly unescapes to the literal string
// `"1/11"` — quote characters included). Strip a single matching outer
// quote pair left over from that so the UI doesn't show fractions wrapped
// in stray quote marks.
function cleanText(value) {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function main() {
  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCsv(raw).filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ''));

  const header = rows[0].map((h) => h.trim());
  const idx = {
    question_id: header.indexOf('question_id'),
    topic: header.indexOf('topic'),
    question_text: header.indexOf('question_text'),
    option_a: header.indexOf('option_a'),
    option_b: header.indexOf('option_b'),
    option_c: header.indexOf('option_c'),
    option_d: header.indexOf('option_d'),
    option_e: header.indexOf('option_e'),
    correct_answer: header.indexOf('correct_answer'),
    difficulty_level: header.indexOf('difficulty_level'),
  };
  for (const [key, i] of Object.entries(idx)) {
    if (i === -1) throw new Error(`CSV missing expected column: ${key}`);
  }

  const optionCols = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];
  const labels = ['A', 'B', 'C', 'D', 'E'];

  const bank = [];
  const perCategoryCount = {};
  const seenIds = new Set();
  let skipped = 0;

  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r];
    if (cols.length === 1 && cols[0].trim() === '') continue; // blank line

    const rawId = (cols[idx.question_id] || '').trim();
    const subCategory = (cols[idx.topic] || '').trim();
    const question = cleanText(cols[idx.question_text] || '');
    const correctLabelRaw = (cols[idx.correct_answer] || '').trim().toUpperCase();
    const difficultyRaw = (cols[idx.difficulty_level] || '').trim().toLowerCase();

    const options = optionCols
      .map((col, i) => ({ label: labels[i], text: cleanText(cols[idx[col]] || '') }))
      .filter((o) => o.text !== '');

    const category = SUBCATEGORY_TO_CATEGORY[subCategory];
    const validCorrectLabel = options.some((o) => o.label === correctLabelRaw);

    if (!rawId || !subCategory || !category || !question || options.length < 2 || !validCorrectLabel) {
      skipped += 1;
      continue;
    }

    const id = `PT_${rawId}`;
    if (seenIds.has(id)) {
      skipped += 1;
      continue;
    }
    seenIds.add(id);

    bank.push({
      id,
      category,
      subCategory,
      difficulty: DIFFICULTY_LABELS[difficultyRaw] || cleanText(cols[idx.difficulty_level] || ''),
      question,
      options: options.map((o) => ({
        label: o.label,
        text: o.text,
        points: o.label === correctLabelRaw ? FULL_POINTS : 0,
      })),
      correctLabel: correctLabelRaw,
    });

    perCategoryCount[subCategory] = (perCategoryCount[subCategory] || 0) + 1;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(bank, null, 2) + '\n');

  console.log(`Wrote ${bank.length} questions to ${path.relative(process.cwd(), OUT_PATH)}`);
  if (skipped > 0) console.log(`Skipped ${skipped} malformed/duplicate row(s).`);
  console.log('Per-category counts:');
  for (const [cat, count] of Object.entries(perCategoryCount).sort()) {
    console.log(`  ${cat}: ${count}`);
  }
}

main();
