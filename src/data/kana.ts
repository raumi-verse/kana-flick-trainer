// 12-key flick layout (Gboard "Japanese 12 keys" / iOS "Japanese Kana").
// Each key: [tap, left, up, right, down]; null = not a kana on that direction.

export type Dir = 'tap' | 'left' | 'up' | 'right' | 'down';
export const DIRS: Dir[] = ['tap', 'left', 'up', 'right', 'down'];

export const KEYS: Record<string, (string | null)[]> = {
  あ: ['あ', 'い', 'う', 'え', 'お'],
  か: ['か', 'き', 'く', 'け', 'こ'],
  さ: ['さ', 'し', 'す', 'せ', 'そ'],
  た: ['た', 'ち', 'つ', 'て', 'と'],
  な: ['な', 'に', 'ぬ', 'ね', 'の'],
  は: ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ま: ['ま', 'み', 'む', 'め', 'も'],
  や: ['や', null, 'ゆ', null, 'よ'],
  ら: ['ら', 'り', 'る', 'れ', 'ろ'],
  わ: ['わ', 'を', 'ん', 'ー', null],
};

// Visual grid of the 12-key pad (4 rows x 3 cols).
export const PAD: string[][] = [
  ['あ', 'か', 'さ'],
  ['た', 'な', 'は'],
  ['ま', 'や', 'ら'],
  ['小゛゜', 'わ', '、。?!'],
];

export type Mod = 'dakuten' | 'handakuten' | 'small';

// Modified kana -> [base kana, modifier]
const MODS: [string, string, Mod][] = [];
const addMods = (from: string, to: string, mod: Mod) => {
  [...from].forEach((c, i) => MODS.push([[...to][i], c, mod]));
};
addMods('かきくけこさしすせそたちつてとはひふへほう', 'がぎぐげござじずぜぞだぢづでどばびぶべぼゔ', 'dakuten');
addMods('はひふへほ', 'ぱぴぷぺぽ', 'handakuten');
addMods('あいうえおつやゆよわ', 'ぁぃぅぇぉっゃゅょゎ', 'small');

export interface FlickInfo {
  char: string;
  key: string;
  dir: Dir;
  mod?: Mod;
}

const INFO = new Map<string, FlickInfo>();
for (const [key, chars] of Object.entries(KEYS)) {
  chars.forEach((c, i) => {
    if (c) INFO.set(c, { char: c, key, dir: DIRS[i] });
  });
}
for (const [modded, base, mod] of MODS) {
  const b = INFO.get(base)!;
  INFO.set(modded, { char: modded, key: b.key, dir: b.dir, mod });
}

export function flickInfo(c: string): FlickInfo | undefined {
  return INFO.get(c);
}

// Characters reachable from each other by pressing the 小゛゜ key (cycle order differs
// between keyboards, so any member of the group counts as "still being typed").
const GROUP = new Map<string, string>();
for (const [modded, base] of MODS) {
  GROUP.set(base, base);
  GROUP.set(modded, base);
}
export function sameModGroup(a: string, b: string): boolean {
  const ga = GROUP.get(a);
  return ga !== undefined && ga === GROUP.get(b);
}

export const DIR_LABEL: Record<Dir, string> = {
  tap: 'tap',
  left: 'flick ←',
  up: 'flick ↑',
  right: 'flick →',
  down: 'flick ↓',
};

export function hintText(c: string): string {
  const f = INFO.get(c);
  if (!f) return '';
  let s = `${f.key} key · ${DIR_LABEL[f.dir]}`;
  if (f.mod === 'dakuten') s += ' · then 小゛゜ (゛)';
  if (f.mod === 'handakuten') s += ' · then 小゛゜ (゜, tap again)';
  if (f.mod === 'small') s += ' · then 小゛゜ (small)';
  return s;
}

// Drill sets
export interface KanaSet {
  id: string;
  label: string;
  chars: string[];
}

const row = (k: string) => KEYS[k].filter((c): c is string => !!c);
export const KANA_SETS: KanaSet[] = [
  ...Object.keys(KEYS).map((k) => ({ id: k, label: `${k}行`, chars: row(k) })),
  { id: 'daku', label: 'が dakuten', chars: [...'がぎぐげござじずぜぞだぢづでどばびぶべぼ'] },
  { id: 'handaku', label: 'ぱ handakuten', chars: [...'ぱぴぷぺぽ'] },
  { id: 'small', label: 'ゃっ small', chars: [...'ぁぃぅぇぉっゃゅょ'] },
  { id: 'yoon', label: 'きゃ combos', chars: ['きゃ', 'しゅ', 'ちょ', 'にゃ', 'ひゅ', 'みょ', 'りゃ', 'ぎゅ', 'じょ', 'びゃ', 'ぴゅ', 'きょ', 'しゃ', 'ちゃ', 'りょ'] },
];

export const ALL_KANA: string[] = [...new Set(KANA_SETS.filter((s) => s.id !== 'yoon').flatMap((s) => s.chars))];
