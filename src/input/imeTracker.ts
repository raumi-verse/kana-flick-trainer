/**
 * Wraps a text input that receives text from the phone's own IME (Gboard 12-key, iOS Kana).
 *
 * After an item is completed the field is cleared right away, even mid-composition. Some IMEs
 * (Gboard) may re-insert the old composition afterwards; to cope with that we remember the
 * consumed text and, if the next value starts with it again, treat it as a baseline offset
 * that is ignored and dropped once the composition ends.
 */
export type ImeLogger = (msg: string) => void;

export class ImeTracker {
  private baseline = 0;
  private composing = false;
  /** Text consumed while composing, which the IME might re-insert. */
  private stale = '';

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
      this.stale = '';
      this.log(`compend data="${e.data}" value="${el.value}"`);
      // Drop already-consumed text now that it is safe to edit the value.
      setTimeout(() => this.compact(), 0);
    });
    el.addEventListener('input', (e) => {
      const ie = e as InputEvent;
      if (this.stale) {
        // Fresh typing after a clear arrives one kana at a time, so a longer first value that
        // starts with the consumed text can only be the IME re-inserting it.
        if (el.value.length > 1 && el.value.startsWith(this.stale)) this.baseline = this.stale.length;
        this.stale = '';
      }
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
    this.stale = this.composing ? this.el.value : '';
    this.el.value = '';
    this.baseline = 0;
    this.log(`consume composing=${this.composing} stale="${this.stale}"`);
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
    this.stale = '';
    requestAnimationFrame(() => this.el.focus());
    this.log('hardReset');
  }

  focus(): void {
    this.el.focus();
  }
}
