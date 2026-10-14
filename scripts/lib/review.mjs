// The only code path that sets review.status to "reviewed". Used by scripts/review.mjs.

export const REVIEWER = 'maintainer';

export function applyReview(entries, clause, notes, date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Invalid date ${date}`);
  if (!entries.some((e) => e.clause === clause)) {
    throw new Error(`No entry for clause ${clause}. Known: ${entries.map((e) => e.clause).join(', ')}`);
  }
  return entries.map((e) =>
    e.clause === clause
      ? { ...e, review: { status: 'reviewed', reviewer: REVIEWER, date, notes: notes ?? null } }
      : e,
  );
}

export function localDate(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
