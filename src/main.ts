import './style.css';
import { ALL_KANA, KANA_SETS } from './data/kana';
import { PHRASES_LIST, WORDS, type Word } from './data/words';
import { DrillSession, type DrillConfig, type Item, type SessionSummary } from './drill/session';
import { data, mastery, profile, resetStats, save, switchProfile, type Profile } from './stats/store';

const app = document.querySelector<HTMLDivElement>('#app')!;
let session: DrillSession | null = null;

const toItem = (w: Word): Item => ({ text: w.kana, kanji: w.kanji, sub: w.meaning });
const words: Item[] = WORDS.map(toItem);
const kanjiWords: Item[] = words.filter((w) => w.kanji);
const phrases: Item[] = PHRASES_LIST.map(toItem);

function kanaItems(): Item[] {
  const chars = KANA_SETS.filter((s) => data.settings.sets.includes(s.id)).flatMap((s) => s.chars);
  return [...new Set(chars)].map((c) => ({ text: c }));
}

interface Mode {
  id: string;
  glyph: string;
  title: string;
  desc: string;
  config: () => DrillConfig | null;
}

const MODES: Mode[] = [
  {
    id: 'kana',
    glyph: 'あ',
    title: 'Kana',
    desc: 'Rows you pick below',
    config: () => {
      const items = kanaItems();
      return items.length ? { mode: 'kana', title: 'Kana', items, adaptive: true } : null;
    },
  },
  {
    id: 'words',
    glyph: '語',
    title: 'Words',
    desc: `${WORDS.length} beginner words`,
    config: () => ({ mode: 'words', title: 'Words', items: words, adaptive: false }),
  },
  {
    id: 'kanji',
    glyph: '漢',
    title: 'Kanji reading',
    desc: 'Type the reading from memory',
    config: () => ({ mode: 'kanji', title: 'Kanji reading', items: kanjiWords, adaptive: false, hideReading: true }),
  },
  {
    id: 'phrases',
    glyph: '文',
    title: 'Phrases',
    desc: 'Greetings, short sentences',
    config: () => ({ mode: 'phrases', title: 'Phrases', items: phrases, adaptive: false }),
  },
  {
    id: 'timed',
    glyph: '60',
    title: 'Speed run',
    desc: 'Words for 60 seconds',
    config: () => ({ mode: 'timed', title: 'Speed run', items: words, adaptive: false, timeLimitMs: 60_000 }),
  },
  {
    id: 'weak',
    glyph: '弱',
    title: 'Weak spots',
    desc: 'Your slowest and most missed',
    config: () => ({
      mode: 'weak',
      title: 'Weak spots',
      items: [...ALL_KANA.map((c) => ({ text: c })), ...words],
      adaptive: true,
    }),
  },
];

const MODE_TITLE: Record<string, string> = Object.fromEntries(MODES.map((m) => [m.id, m.title]));

type Tab = 'home' | 'stats' | 'settings';

const ICONS: Record<Tab, string> = {
  home: '<path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" />',
  stats: '<path d="M5 20V11M12 20V5M19 20v-6" />',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8" /><circle cx="16" cy="7" r="2" /><circle cx="10" cy="17" r="2" />',
};
const TAB_LABEL: Record<Tab, string> = { home: 'Practice', stats: 'Stats', settings: 'Settings' };

function shell(tab: Tab, title: string, body: string): void {
  session = null;
  app.className = 'shell';
  const who = profile === 'guest' ? 'Guest' : 'Me';
  app.innerHTML = `
    <header class="top">
      <h1>${title}</h1>
      <button class="avatar${profile === 'guest' ? ' guest' : ''}" data-go="settings" aria-label="Profile: ${who}">${
        profile === 'guest' ? 'G' : 'わ'
      }</button>
    </header>
    <main class="content">${body}</main>
    <nav class="tabs">
      ${(Object.keys(ICONS) as Tab[])
        .map(
          (t) => `<button class="tab${t === tab ? ' on' : ''}" data-go="${t}">
            <svg viewBox="0 0 24 24" width="24" height="24">${ICONS[t]}</svg><span>${TAB_LABEL[t]}</span></button>`,
        )
        .join('')}
    </nav>`;
  app.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) =>
    b.addEventListener('click', () => SCREENS[b.dataset.go as Tab]()),
  );
}

const dayKey = (t: number | Date) => new Date(t).toDateString();

function streak(): number {
  const days = new Set(data.sessions.map((s) => dayKey(s.date)));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // still alive if you practised yesterday
  let n = 0;
  while (days.has(dayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

function guestBanner(): string {
  return profile === 'guest'
    ? `<div class="banner"><div><b>Guest mode</b><small>Fresh stats. Your own progress isn't touched.</small></div>
        <button class="btn small" id="exit-guest">Exit</button></div>`
    : '';
}

function bindGuestBanner(): void {
  app.querySelector('#exit-guest')?.addEventListener('click', () => {
    switchProfile('me');
    home();
  });
}

function home(): void {
  const best = Math.max(0, ...data.sessions.filter((s) => s.mode === 'timed').map((s) => s.cpm));
  const today = data.sessions.filter((s) => dayKey(s.date) === dayKey(new Date())).reduce((a, s) => a + s.items, 0);
  shell(
    'home',
    'Practice',
    `
    ${guestBanner()}
    <section class="hero">
      <div><b>${streak()}</b><small>day streak</small></div>
      <div><b>${today}</b><small>done today</small></div>
      <div><b>${best || '–'}</b><small>best / min</small></div>
    </section>
    <div class="modes">
      ${MODES.map(
        (m) => `<button class="mode" data-mode="${m.id}">
          <span class="glyph">${m.glyph}</span><b>${m.title}</b><small>${m.desc}</small></button>`,
      ).join('')}
    </div>
    <h2>Kana rows</h2>
    <div class="card chips">
      ${KANA_SETS.map(
        (s) => `<button class="chip${data.settings.sets.includes(s.id) ? ' on' : ''}" data-set="${s.id}">${s.label}</button>`,
      ).join('')}
    </div>`,
  );
  bindGuestBanner();
  app.querySelectorAll<HTMLButtonElement>('[data-set]').forEach((b) =>
    b.addEventListener('click', () => {
      const id = b.dataset.set!;
      const sets = data.settings.sets;
      const i = sets.indexOf(id);
      if (i >= 0) sets.splice(i, 1);
      else sets.push(id);
      b.classList.toggle('on', i < 0);
      save();
    }),
  );
  app.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) =>
    b.addEventListener('click', () => {
      const cfg = MODES.find((m) => m.id === b.dataset.mode)!.config();
      if (!cfg) return alert('Pick at least one kana row first.');
      startDrill(cfg);
    }),
  );
}

function startDrill(cfg: DrillConfig): void {
  app.className = '';
  session = new DrillSession(app, cfg, (s) => (s ? summary(cfg, s) : home()));
  session.start();
}

function summary(cfg: DrillConfig, s: SessionSummary): void {
  app.className = '';
  app.innerHTML = `
    <main class="summary">
      <p class="eyebrow">${cfg.title}</p>
      <h1>おつかれさま!</h1>
      <div class="result">
        <div class="card stat main"><b>${s.cpm}</b><small>kana per minute</small></div>
        <div class="card stat"><b>${Math.round(s.accuracy * 100)}%</b><small>without a slip</small></div>
        <div class="card stat"><b>${s.items}</b><small>items · ${s.chars} kana</small></div>
      </div>
      <div class="actions">
        <button class="btn primary" id="again">Again</button>
        <button class="btn" id="home">Done</button>
      </div>
    </main>`;
  app.querySelector('#again')!.addEventListener('click', () => startDrill(cfg));
  app.querySelector('#home')!.addEventListener('click', home);
}

function masteryColor(m: ReturnType<typeof mastery>): string {
  if (m === null) return 'var(--unseen)';
  // Amber (weak) → green (strong) as a tint, faded when there are few attempts.
  const hue = `color-mix(in oklch, var(--good) ${Math.round(m.score * 100)}%, var(--weak))`;
  return `color-mix(in srgb, ${hue} ${Math.round(30 + 45 * m.confidence)}%, var(--surface))`;
}

function stats(): void {
  const recent = data.sessions.slice(-12).reverse();
  const timed = data.sessions.filter((s) => s.mode === 'timed').slice(-20);
  const maxCpm = Math.max(1, ...timed.map((s) => s.cpm));
  const totalItems = data.sessions.reduce((a, s) => a + s.items, 0);
  const practised = ALL_KANA.filter((c) => data.chars[c]?.attempts).length;
  shell(
    'stats',
    'Stats',
    `
    ${guestBanner()}
    <section class="hero">
      <div><b>${data.sessions.length}</b><small>sessions</small></div>
      <div><b>${totalItems}</b><small>items</small></div>
      <div><b>${practised}/${ALL_KANA.length}</b><small>kana seen</small></div>
    </section>
    <h2>Kana mastery</h2>
    <div class="card">
      <div class="heat">
        ${ALL_KANA.map((c) => {
          const st = data.chars[c];
          const tip = st ? `${st.attempts} tries, ${st.errors} errors, ${Math.round(st.totalMs / st.attempts)} ms avg` : 'not practised yet';
          return `<span style="background:${masteryColor(mastery(c))}" title="${tip}">${c}</span>`;
        }).join('')}
      </div>
      <p class="legend"><span style="background:var(--weak)"></span>weak <span style="background:var(--good)"></span>strong <span style="background:var(--unseen)"></span>new</p>
    </div>
    ${
      timed.length
        ? `<h2>Speed runs</h2><div class="card"><div class="bars">${timed
            .map((s) => `<div style="height:${(s.cpm / maxCpm) * 100}%"><small>${s.cpm}</small></div>`)
            .join('')}</div><p class="legend">kana per minute, last ${timed.length} runs</p></div>`
        : ''
    }
    <h2>Recent</h2>
    ${
      recent.length
        ? `<div class="card list">${recent
            .map(
              (s) => `<div class="list-row">
                <div><b>${MODE_TITLE[s.mode] ?? s.mode}</b><small>${new Date(s.date).toLocaleDateString()} · ${s.items} items</small></div>
                <div class="right"><b>${s.cpm}</b><small>/min · ${Math.round(s.accuracy * 100)}%</small></div>
              </div>`,
            )
            .join('')}</div>`
        : '<div class="card empty">No sessions yet. Go flick something!</div>'
    }`,
  );
  bindGuestBanner();
}

const seg = (name: string, value: string, opts: [string, string][]) =>
  `<div class="seg" data-seg="${name}">${opts
    .map(([v, l]) => `<button data-v="${v}" class="${v === value ? 'on' : ''}">${l}</button>`)
    .join('')}</div>`;

function settings(): void {
  shell(
    'settings',
    'Settings',
    `
    <h2>Profile</h2>
    <div class="card">
      ${seg('profile', profile, [
        ['me', 'Me'],
        ['guest', 'Guest'],
      ])}
      <p class="note">Handing your phone to someone? Guest mode starts with empty stats and leaves yours untouched.
        Every time you switch to Guest, it starts fresh.</p>
    </div>
    <h2>Flick hint</h2>
    <div class="card">
      ${seg('hint', data.settings.hint, [
        ['always', 'Always'],
        ['onMiss', 'After a miss'],
        ['never', 'On tap'],
      ])}
      <p class="note">You can always tap the prompt to see which key to flick.</p>
    </div>
    <h2>Keyboard</h2>
    <div class="card">
      <p class="note lead">Use your phone's <b>12-key kana keyboard</b> (Gboard “日本語 12キー” or iOS “かな”).
        You don't need to press 確定: answers are checked as you flick. Converting to the right kanji also counts.</p>
      <label class="toggle"><span>IME debug log</span><input type="checkbox" id="debug" ${data.settings.debug ? 'checked' : ''} /></label>
    </div>
    <button class="btn danger-quiet" id="reset">Reset ${profile === 'guest' ? 'guest' : 'all'} stats</button>`,
  );
  app.querySelectorAll<HTMLDivElement>('[data-seg]').forEach((g) =>
    g.querySelectorAll<HTMLButtonElement>('button').forEach((b) =>
      b.addEventListener('click', () => {
        const v = b.dataset.v!;
        if (g.dataset.seg === 'profile') {
          switchProfile(v as Profile);
          return settings();
        }
        data.settings.hint = v as typeof data.settings.hint;
        save();
        g.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      }),
    ),
  );
  app.querySelector<HTMLInputElement>('#debug')!.addEventListener('change', (e) => {
    data.settings.debug = (e.target as HTMLInputElement).checked;
    save();
  });
  app.querySelector('#reset')!.addEventListener('click', () => {
    if (confirm('Delete all practice stats for this profile?')) {
      resetStats();
      settings();
    }
  });
}

const SCREENS: Record<Tab, () => void> = { home, stats, settings };

home();
