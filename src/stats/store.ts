export interface CharStat {
  attempts: number;
  errors: number;
  totalMs: number;
}

export interface SessionRecord {
  date: number;
  mode: string;
  items: number;
  chars: number;
  cpm: number;
  accuracy: number; // 0..1, items finished without a mistake
}

export interface Settings {
  hint: 'always' | 'onMiss' | 'never';
  debug: boolean;
  sets: string[];
}

interface Data {
  chars: Record<string, CharStat>;
  sessions: SessionRecord[];
  settings: Settings;
}

export type Profile = 'me' | 'guest';

// The main profile keeps the original key so existing stats carry over.
const STORE_KEYS: Record<Profile, string> = { me: 'kana-flick-trainer:v1', guest: 'kana-flick-trainer:guest' };
const PROFILE_KEY = 'kana-flick-trainer:profile';

const defaults = (): Data => ({
  chars: {},
  sessions: [],
  settings: { hint: 'onMiss', debug: false, sets: ['あ', 'か', 'さ'] },
});

function load(key: string): Data {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaults();
    const d = JSON.parse(raw) as Partial<Data>;
    const def = defaults();
    return {
      chars: d.chars ?? def.chars,
      sessions: d.sessions ?? def.sessions,
      settings: { ...def.settings, ...d.settings },
    };
  } catch {
    return defaults();
  }
}

function storedProfile(): Profile {
  try {
    return localStorage.getItem(PROFILE_KEY) === 'guest' ? 'guest' : 'me';
  } catch {
    return 'me';
  }
}

export let profile: Profile = storedProfile();
/** Live binding: reassigned when the profile is switched. */
export let data: Data = load(STORE_KEYS[profile]);

export function save(): void {
  try {
    localStorage.setItem(STORE_KEYS[profile], JSON.stringify(data));
  } catch {
    // Storage full or blocked: keep going in memory.
  }
}

/** Switch profile. Entering guest always starts from a clean slate, so each visitor gets fresh stats. */
export function switchProfile(p: Profile): void {
  if (p === profile) return;
  save();
  profile = p;
  try {
    localStorage.setItem(PROFILE_KEY, p);
  } catch {
    // ignore
  }
  if (p === 'guest') {
    data = defaults();
    data.settings.hint = 'always';
    save();
  } else {
    data = load(STORE_KEYS.me);
  }
}

export function charStat(c: string): CharStat {
  return (data.chars[c] ??= { attempts: 0, errors: 0, totalMs: 0 });
}

/** Record a completed item: time is spread evenly over its chars. */
export function recordItem(text: string, ms: number, errorChars: Set<string>): void {
  const chars = [...text];
  for (const c of chars) {
    const s = charStat(c);
    s.attempts++;
    s.totalMs += ms / chars.length;
  }
  for (const c of errorChars) charStat(c).errors++;
  save();
}

export function recordSession(r: SessionRecord): void {
  data.sessions.push(r);
  if (data.sessions.length > 200) data.sessions.splice(0, data.sessions.length - 200);
  save();
}

/** score: 0 (weak) .. 1 (mastered); confidence: 0..1 by number of attempts. */
export function mastery(c: string): { score: number; confidence: number } | null {
  const s = data.chars[c];
  if (!s || s.attempts === 0) return null;
  const acc = 1 - s.errors / s.attempts;
  const avg = s.totalMs / s.attempts;
  const speed = Math.max(0, Math.min(1, (3000 - avg) / 2500)); // 500ms → 1, 3000ms → 0
  return { score: acc * 0.6 + speed * 0.4, confidence: Math.min(1, s.attempts / 8) };
}

export function resetStats(): void {
  data.chars = {};
  data.sessions = [];
  save();
}
