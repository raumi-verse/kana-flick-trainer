import { ImeTracker } from '../input/imeTracker';
import { match, normalize } from '../input/match';
import { data, recordItem, recordSession } from '../stats/store';
import { renderFlickHint } from '../ui/flickHint';
import { pickRandom, pickWeighted } from './scheduler';

export interface Item {
  text: string;
  sub?: string;
}

export interface DrillConfig {
  mode: string;
  title: string;
  items: Item[];
  adaptive: boolean;
  timeLimitMs?: number;
}

export interface SessionSummary {
  items: number;
  chars: number;
  cpm: number;
  accuracy: number;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export class DrillSession {
  private item!: Item;
  private itemStart = 0;
  private missed = false;
  private errorChars = new Set<string>();
  private revealHint = false;

  private doneItems = 0;
  private cleanItems = 0;
  private doneChars = 0;
  private activeMs = 0;
  private sessionStart = 0;
  private timer?: number;
  private finished = false;

  private tracker: ImeTracker;
  private $ = <T extends HTMLElement>(sel: string) => this.root.querySelector<T>(sel)!;

  private root: HTMLElement;
  private cfg: DrillConfig;
  private onFinish: (s: SessionSummary | null) => void;

  constructor(root: HTMLElement, cfg: DrillConfig, onFinish: (s: SessionSummary | null) => void) {
    this.root = root;
    this.cfg = cfg;
    this.onFinish = onFinish;
    root.innerHTML = `
      <header class="bar">
        <button class="back" aria-label="Back">‹</button>
        <span class="title">${esc(cfg.title)}</span>
        <span class="counters"></span>
      </header>
      <main class="drill">
        <div class="target" title="Tap for hint"></div>
        <div class="sub"></div>
        <div class="typed"></div>
        <input class="ime" type="text" placeholder="type here with the kana keyboard" />
        <div class="hint"></div>
        <pre class="debug" ${data.settings.debug ? '' : 'hidden'}></pre>
      </main>`;

    const debug = this.$<HTMLPreElement>('.debug');
    const log = data.settings.debug
      ? (m: string) => {
          debug.textContent = `${new Date().toISOString().slice(17, 23)} ${m}\n${debug.textContent}`.slice(0, 4000);
        }
      : undefined;
    this.tracker = new ImeTracker(this.$<HTMLInputElement>('.ime'), (t) => this.onInput(t), log);

    this.$('.back').addEventListener('click', () => this.finish());
    this.$('.target').addEventListener('click', () => {
      this.revealHint = true;
      this.render(this.tracker.typed());
      this.tracker.focus();
    });
    root.querySelector('.drill')!.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.tracker.focus();
    });
  }

  start(): void {
    this.next(true);
    this.tracker.focus();
  }

  /** The clock (and the 60s countdown) only starts with the first keypress. */
  private startClock(): void {
    this.sessionStart = performance.now();
    if (this.cfg.timeLimitMs) {
      this.timer = window.setInterval(() => {
        this.renderCounters();
        if (performance.now() - this.sessionStart >= this.cfg.timeLimitMs!) this.finish();
      }, 250);
    }
  }

  private next(first = false): void {
    const prev = first ? undefined : this.item;
    this.item = this.cfg.adaptive
      ? pickWeighted(this.cfg.items, (i) => normalize(i.text), prev)
      : pickRandom(this.cfg.items, prev);
    this.itemStart = first ? 0 : performance.now();
    this.missed = false;
    this.revealHint = false;
    this.errorChars.clear();
    this.$('.target').textContent = this.item.text;
    this.$('.sub').textContent = this.item.sub ?? '';
    this.render(this.tracker.typed());
    this.renderCounters();
  }

  private onInput(typed: string): void {
    if (this.finished) return;
    if (!this.sessionStart && typed) this.startClock();
    if (!this.itemStart && typed) this.itemStart = performance.now();
    const target = normalize(this.item.text);
    const m = match(target, typed);

    if (m.status === 'wrong') {
      const c = [...target][m.wrongAt];
      if (c) this.errorChars.add(c);
      this.missed = true;
    }
    if (m.status === 'done') {
      const ms = performance.now() - (this.itemStart || performance.now());
      recordItem(target, ms, this.errorChars);
      this.doneItems++;
      this.doneChars += [...target].length;
      this.activeMs += ms;
      if (!this.missed) this.cleanItems++;
      this.flash(this.missed ? 'ok-late' : 'ok');
      this.tracker.consume();
      this.next();
      return;
    }
    this.render(typed);
  }

  private render(typed: string): void {
    const target = [...normalize(this.item.text)];
    const m = match(target.join(''), typed);
    const u = [...normalize(typed)];
    this.$('.typed').innerHTML = u
      .map((c, i) => {
        const cls = i < m.correct ? 'good' : m.status === 'pending' && i === m.correct ? 'pending' : 'bad';
        return `<span class="${cls}">${esc(c)}</span>`;
      })
      .join('');

    const showHint =
      data.settings.hint === 'always' || this.revealHint || (data.settings.hint === 'onMiss' && this.missed);
    const nextChar = target[m.correct];
    this.$('.hint').innerHTML = showHint ? renderFlickHint(nextChar) : '';
    this.root.querySelector('.drill')!.classList.toggle('is-wrong', m.status === 'wrong');
  }

  private flash(cls: string): void {
    const t = this.$('.drill');
    t.classList.remove('ok', 'ok-late');
    void t.offsetWidth;
    t.classList.add(cls);
  }

  private summary(): SessionSummary {
    const minutes = this.cfg.timeLimitMs ? this.cfg.timeLimitMs / 60000 : this.activeMs / 60000;
    return {
      items: this.doneItems,
      chars: this.doneChars,
      cpm: minutes > 0 ? Math.round(this.doneChars / minutes) : 0,
      accuracy: this.doneItems ? this.cleanItems / this.doneItems : 0,
    };
  }

  private renderCounters(): void {
    const s = this.summary();
    let txt = `${s.items} done · ${Math.round(s.accuracy * 100)}%`;
    if (this.cfg.timeLimitMs) {
      const elapsed = this.sessionStart ? performance.now() - this.sessionStart : 0;
      const left = Math.max(0, this.cfg.timeLimitMs - elapsed);
      txt += ` · ${Math.ceil(left / 1000)}s`;
    } else if (s.cpm) {
      txt += ` · ${s.cpm}/min`;
    }
    this.$('.counters').textContent = txt;
  }

  finish(): void {
    if (this.finished) return;
    this.finished = true;
    clearInterval(this.timer);
    this.tracker.el.blur();
    const s = this.summary();
    if (s.items > 0) recordSession({ date: Date.now(), mode: this.cfg.mode, ...s });
    this.onFinish(s.items > 0 ? s : null);
  }
}
