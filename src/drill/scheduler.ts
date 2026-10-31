import { data } from '../stats/store';

/** Higher weight = weaker / less practised. */
export function weakness(text: string): number {
  let w = 0;
  for (const c of text) {
    const s = data.chars[c];
    if (!s || s.attempts === 0) {
      w += 2;
      continue;
    }
    const errRate = (s.errors + 1) / (s.attempts + 2);
    const avgSec = s.totalMs / s.attempts / 1000;
    w += errRate * 4 + Math.min(avgSec, 4) * 0.5;
  }
  return w / [...text].length;
}

export function pickRandom<T>(items: T[], avoid?: T): T {
  if (items.length === 1) return items[0];
  let x: T;
  do x = items[Math.floor(Math.random() * items.length)];
  while (x === avoid);
  return x;
}

/** Weighted random pick (weights from weakness), avoiding an immediate repeat. */
export function pickWeighted<T>(items: T[], text: (t: T) => string, avoid?: T): T {
  const pool = items.length > 1 ? items.filter((i) => i !== avoid) : items;
  const weights = pool.map((i) => weakness(text(i)) ** 2 + 0.05);
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}
