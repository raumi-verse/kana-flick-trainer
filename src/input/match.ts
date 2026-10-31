import { sameModGroup } from '../data/kana';

/** NFKC, drop whitespace, katakana -> hiragana (ー is kept). */
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
}

export type MatchStatus = 'empty' | 'prefix' | 'pending' | 'wrong' | 'done';

export interface MatchResult {
  status: MatchStatus;
  /** Index of the first wrong char (status 'wrong'), else -1. */
  wrongAt: number;
  /** Number of typed chars that are already correct. */
  correct: number;
}

/**
 * Compare live (possibly still-composing) input against the target.
 * 'pending' = the last typed char is a base/variant of the target char that the
 * 小゛゜ key can still turn into the right one (e.g. か while aiming for が).
 */
export function match(target: string, typedRaw: string): MatchResult {
  const t = [...normalize(target)];
  const u = [...normalize(typedRaw)];
  if (u.length === 0) return { status: 'empty', wrongAt: -1, correct: 0 };

  for (let i = 0; i < u.length; i++) {
    if (i >= t.length) return { status: 'wrong', wrongAt: i, correct: i };
    if (u[i] === t[i]) continue;
    const isLast = i === u.length - 1;
    if (isLast && sameModGroup(u[i], t[i])) {
      return { status: 'pending', wrongAt: -1, correct: i };
    }
    return { status: 'wrong', wrongAt: i, correct: i };
  }
  if (u.length === t.length) return { status: 'done', wrongAt: -1, correct: u.length };
  return { status: 'prefix', wrongAt: -1, correct: u.length };
}
