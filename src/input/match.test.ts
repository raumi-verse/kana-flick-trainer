import { describe, expect, it } from 'vitest';
import { match, normalize } from './match';

describe('normalize', () => {
  it('converts katakana to hiragana and keeps ー', () => {
    expect(normalize('カタカナー')).toBe('かたかなー');
  });
  it('NFKC + whitespace', () => {
    expect(normalize(' ｶ ')).toBe('か');
  });
});

describe('match', () => {
  it('empty', () => expect(match('ねこ', '').status).toBe('empty'));
  it('prefix', () => expect(match('ねこ', 'ね')).toMatchObject({ status: 'prefix', correct: 1 }));
  it('done', () => expect(match('ねこ', 'ねこ').status).toBe('done'));
  it('wrong char', () => expect(match('ねこ', 'のこ')).toMatchObject({ status: 'wrong', wrongAt: 0 }));
  it('too long', () => expect(match('ね', 'ねこ')).toMatchObject({ status: 'wrong', wrongAt: 1 }));
  it('base before dakuten is pending', () => expect(match('がっこう', 'か').status).toBe('pending'));
  it('ば on the way to ぱ is pending', () => expect(match('ぱ', 'ば').status).toBe('pending'));
  it('つ on the way to っ is pending', () => expect(match('きって', 'きつ').status).toBe('pending'));
  it('づ when cycling past っ is pending', () => expect(match('きって', 'きづ').status).toBe('pending'));
  it('や on the way to ゃ is pending', () => expect(match('きゃ', 'きや').status).toBe('pending'));
  it('unfixed base in middle is wrong', () => expect(match('がっこう', 'かっ')).toMatchObject({ status: 'wrong', wrongAt: 0 }));
  it('different group is wrong', () => expect(match('が', 'さ').status).toBe('wrong'));
  it('katakana input accepted', () => expect(match('ねこ', 'ネコ').status).toBe('done'));
});
