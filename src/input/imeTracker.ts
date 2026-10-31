/**
 * Wraps a text input that receives text from the phone's own IME (Gboard 12-key, iOS Kana).
 *
 * Clearing an <input> while the IME is composing is unreliable (Gboard may re-insert the old
 * composition). So after an item is completed we don't clear immediately: we remember a
 * baseline offset and only look at text after it. The field is actually cleared once the
 * composition ends (Enter / 確定) or, as a last resort, when it gets too long.
 */
export type ImeLogger = (msg: string) => void;

export class ImeTracker {
  private baseline = 0;
  private composing = false;

  readonly el: HTMLInputElement;
  private onChange: (typed: string) => void;
  private log: ImeLogger;

  constructor(el: HTMLInputElement, onChange: (typed: string) => void, log: ImeLogger = () => {}) {
    this.el = el;
    this.onChange = onChange;
    this.log = log;
    el.setAttribute('lang', 'ja');
    el.setAttribute('autocomplete', 'off');
    el.setAttribute('autocorrect', 'off');
    el.setAttribute('autocapitalize', 'off');
    el.setAttribute('spellcheck', 'false');
    el.setAttribute('enterkeyhint', 'next');

    el.addEventListener('compositionstart', () => {
      this.composing = true;
      this.log(`compstart value="${el.value}"`);
    });
    el.addEventListener('compositionupdate', (e) => {
      this.log(`compupdate data="${e.data}"`);
    });
    el.addEventListener('compositionend', (e) => {
      this.composing = false;
      this.log(`compend data="${e.data}" value="${el.value}"`);
      // Drop already-consumed text now that it is safe to edit the value.
      setTimeout(() => this.compact(), 0);
    });
    el.addEventListener('input', (e) => {
      const ie = e as InputEvent;
      if (el.value.length < this.baseline) this.baseline = el.value.length;
      this.log(`input type=${ie.inputType} composing=${ie.isComposing} value="${el.value}"`);
      this.onChange(this.typed());
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.isComposing) e.preventDefault();
    });
  }

  typed(): string {
    return this.el.value.slice(this.baseline);
  }

  /** Mark everything typed so far as consumed. */
  consume(): void {
    if (!this.composing) {
      this.el.value = '';
      this.baseline = 0;
    } else {
      this.baseline = this.el.value.length;
      if (this.baseline > 40) this.hardReset();
    }
    this.log(`consume composing=${this.composing} baseline=${this.baseline}`);
  }

  private compact(): void {
    if (this.composing || this.baseline === 0) return;
    this.el.value = this.el.value.slice(this.baseline);
    this.baseline = 0;
    this.log(`compact value="${this.el.value}"`);
  }

  /** Blur/clear/refocus: forces the IME to drop its composition buffer. */
  hardReset(): void {
    this.el.blur();
    this.el.value = '';
    this.baseline = 0;
    this.composing = false;
    requestAnimationFrame(() => this.el.focus());
    this.log('hardReset');
  }

  focus(): void {
    this.el.focus();
  }
}
