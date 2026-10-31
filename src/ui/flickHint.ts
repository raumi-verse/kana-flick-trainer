import { DIRS, KEYS, PAD, flickInfo, hintText, type Dir } from '../data/kana';

const POS: Record<Dir, string> = { tap: 'c', left: 'l', up: 'u', right: 'r', down: 'd' };

/** Render a 12-key pad with the key/direction for `char` highlighted. */
export function renderFlickHint(char: string | undefined): string {
  const info = char ? flickInfo(char) : undefined;
  const cells = PAD.flat()
    .map((k) => {
      const active = info?.key === k;
      const modActive = !!info?.mod && k === '小゛゜';
      const petals = KEYS[k]
        ? DIRS.map((d, i) => {
            const c = KEYS[k][i];
            if (!c || (!active && d !== 'tap')) return '';
            const hit = active && info!.dir === d;
            return `<span class="petal p-${POS[d]}${hit ? ' hit' : ''}">${c}</span>`;
          }).join('')
        : `<span class="petal p-c small-label">${k}</span>`;
      return `<div class="key${active ? ' active' : ''}${modActive ? ' mod' : ''}">${petals}</div>`;
    })
    .join('');
  const text = char ? hintText(char) : '';
  return `<div class="pad">${cells}</div><div class="hint-text">${char ? `<b>${char}</b> ` : ''}${text}</div>`;
}
