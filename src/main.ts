import './style.css';
import { ALL_KANA, KANA_SETS } from './data/kana';
import { PHRASES_LIST, WORDS } from './data/words';
import { DrillSession, type DrillConfig, type Item, type SessionSummary } from './drill/session';
import { data, mastery, resetStats, save } from './stats/store';

const app = document.querySelector<HTMLDivElement>('#app')!;
let session: DrillSession | null = null;

const words: Item[] = WORDS.map((w) => ({ text: w.kana, sub: w.meaning }));
const phrases: Item[] = PHRASES_LIST.map((w) => ({ text: w.kana, sub: w.meaning }));

function kanaItems(): Item[] {
  const chars = KANA_SETS.filter((s) => data.settings.sets.includes(s.id)).flatMap((s) => s.chars);
  return [...new Set(chars)].map((c) => ({ text: c }));
}

const MODES: { id: string; title: string; desc: string; config: () => DrillConfig | null }[] = [
  {
    id: 'kana',
    title: 'Kana drill',
    desc: 'Single kana from the rows selected below. Weighted toward your weak ones.',
    config: () => {
      const items = kanaItems();
      return items.length ? { mode: 'kana', title: 'Kana drill', items, adaptive: true } : null;
    },
  },
  {
    id: 'words',
    title: 'Words',
    desc: `${WORDS.length} beginner words with meanings.`,
    config: () => ({ mode: 'words', title: 'Words', items: words, adaptive: false }),
  },
  {
    id: 'phrases',
    title: 'Phrases',
    desc: 'Greetings and short sentences.',
    config: () => ({ mode: 'phrases', title: 'Phrases', items: phrases, adaptive: false }),
  },
  {
    id: 'timed',
    title: '60s speed run',
    desc: 'As many words as you can in one minute.',
    config: () => ({ mode: 'timed', title: '60s speed run', items: words, adaptive: false, timeLimitMs: 60_000 }),
  },
  {
    id: 'weak',
    title: 'Weak spots',
    desc: 'All kana and words, chosen by your error rate and speed.',
    config: () => ({
      mode: 'weak',
      title: 'Weak spots',
      items: [...ALL_KANA.map((c) => ({ text: c })), ...words],
      adaptive: true,
    }),
  },
];

function home(): void {
  session = null;
  const best = Math.max(0, ...data.sessions.filter((s) => s.mode === 'timed').map((s) => s.cpm));
  app.innerHTML = `
    <header class="bar"><span class="title">かな Flick Trainer</span>
      <button class="link" data-go="stats">Stats</button></header>
    <main class="home">
      <p class="intro">Use your phone's <b>12-key kana keyboard</b> (Gboard “日本語 12キー” or iOS “かな”).
        No need to press 確定: answers are checked as you flick.</p>
      <div class="modes">
        ${MODES.map(
          (m) => `<button class="mode" data-mode="${m.id}"><b>${m.title}</b><small>${m.desc}</small></button>`,
        ).join('')}
      </div>
      ${best ? `<p class="best">Best 60s run: <b>${best}</b> kana/min</p>` : ''}
      <h3>Kana drill rows</h3>
      <div class="chips">
        ${KANA_SETS.map(
          (s) =>
            `<button class="chip${data.settings.sets.includes(s.id) ? ' on' : ''}" data-set="${s.id}">${s.label}</button>`,
        ).join('')}
      </div>
      <h3>Settings</h3>
      <label>Flick hint
        <select id="hint">
          <option value="onMiss">after a mistake (or tap the prompt)</option>
          <option value="always">always</option>
          <option value="never">only when tapping the prompt</option>
        </select>
      </label>
      <label class="check"><input type="checkbox" id="debug" ${data.settings.debug ? 'checked' : ''}/> IME debug log</label>
    </main>`;

  const hint = app.querySelector<HTMLSelectElement>('#hint')!;
  hint.value = data.settings.hint;
  hint.addEventListener('change', () => {
    data.settings.hint = hint.value as typeof data.settings.hint;
    save();
  });
  app.querySelector<HTMLInputElement>('#debug')!.addEventListener('change', (e) => {
    data.settings.debug = (e.target as HTMLInputElement).checked;
    save();
  });
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
      if (!cfg) return alert('Select at least one kana row first.');
      startDrill(cfg);
    }),
  );
  app.querySelector('[data-go="stats"]')!.addEventListener('click', stats);
}

function startDrill(cfg: DrillConfig): void {
  session = new DrillSession(app, cfg, (s) => (s ? summary(cfg, s) : home()));
  session.start();
}

function summary(cfg: DrillConfig, s: SessionSummary): void {
  app.innerHTML = `
    <header class="bar"><span class="title">${cfg.title}: done</span></header>
    <main class="summary">
      <div class="big"><b>${s.cpm}</b><small>kana / min</small></div>
      <div class="big"><b>${Math.round(s.accuracy * 100)}%</b><small>clean items</small></div>
      <div class="big"><b>${s.items}</b><small>items · ${s.chars} kana</small></div>
      <div class="row">
        <button class="primary" id="again">Again</button>
        <button id="home">Home</button>
      </div>
    </main>`;
  app.querySelector('#again')!.addEventListener('click', () => startDrill(cfg));
  app.querySelector('#home')!.addEventListener('click', home);
}

function masteryColor(m: ReturnType<typeof mastery>): string {
  if (m === null) return 'var(--unseen)';
  const hue = Math.round(m.score * 120); // red → green
  // Few attempts → faded toward grey, so "new" doesn't look like "weak".
  return `color-mix(in srgb, hsl(${hue} 65% 45%) ${Math.round(25 + 75 * m.confidence)}%, var(--unseen))`;
}

function stats(): void {
  const recent = data.sessions.slice(-12).reverse();
  const timed = data.sessions.filter((s) => s.mode === 'timed').slice(-20);
  const maxCpm = Math.max(1, ...timed.map((s) => s.cpm));
  app.innerHTML = `
    <header class="bar"><button class="back">‹</button><span class="title">Stats</span></header>
    <main class="stats">
      <h3>Kana mastery</h3>
      <div class="heat">
        ${ALL_KANA.map((c) => {
          const st = data.chars[c];
          const tip = st ? `${st.attempts} tries, ${st.errors} errors, ${Math.round(st.totalMs / st.attempts)} ms avg` : 'not practised yet';
          return `<span style="background:${masteryColor(mastery(c))}" title="${tip}">${c}</span>`;
        }).join('')}
      </div>
      <p class="legend"><span style="background:hsl(0 65% 45%)"></span>weak <span style="background:hsl(120 65% 45%)"></span>strong <span style="background:var(--unseen)"></span>unseen</p>
      ${
        timed.length
          ? `<h3>60s runs (kana/min)</h3><div class="bars">${timed
              .map((s) => `<div style="height:${(s.cpm / maxCpm) * 100}%" title="${s.cpm}"><small>${s.cpm}</small></div>`)
              .join('')}</div>`
          : ''
      }
      <h3>Recent sessions</h3>
      ${
        recent.length
          ? `<table><tr><th>When</th><th>Mode</th><th>Items</th><th>/min</th><th>Clean</th></tr>${recent
              .map(
                (s) =>
                  `<tr><td>${new Date(s.date).toLocaleDateString()}</td><td>${s.mode}</td><td>${s.items}</td><td>${s.cpm}</td><td>${Math.round(s.accuracy * 100)}%</td></tr>`,
              )
              .join('')}</table>`
          : '<p>No sessions yet.</p>'
      }
      <button class="danger" id="reset">Reset all stats</button>
    </main>`;
  app.querySelector('.back')!.addEventListener('click', home);
  app.querySelector('#reset')!.addEventListener('click', () => {
    if (confirm('Delete all practice stats?')) {
      resetStats();
      stats();
    }
  });
}

home();
