import { describe, expect, it } from 'vitest';
import { normalizeKey, tokenize } from '@/lib/text';

describe('tokenize', () => {
  it('splits words, lowercases and keeps offsets', () => {
    expect(tokenize("Don't STOP—running!")).toEqual([
      { value: "don't", start: 0, end: 5 },
      { value: 'stop', start: 6, end: 10 },
      { value: 'running', start: 11, end: 18 },
    ]);
  });

  it('ignores digits and punctuation', () => {
    expect(tokenize('42 … !!')).toEqual([]);
  });
});

describe('normalizeKey', () => {
  it('lowercases, trims punctuation and collapses spaces', () => {
    expect(normalizeKey('  Put   UP with! ')).toBe('put up with');
  });

  it('returns an empty string when there are no words', () => {
    expect(normalizeKey('123 …')).toBe('');
  });
});
