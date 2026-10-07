import { describe, expect, it } from 'vitest';
import { extractSentence, MAX_SENTENCE } from '@/lib/context';

const around = (text: string, needle: string) => {
  const start = text.indexOf(needle);
  return extractSentence(text, start, start + needle.length);
};

describe('extractSentence', () => {
  const text = 'First one. The committee decided to put off the meeting. Last one';

  it('returns the sentence around the selection', () => {
    expect(around(text, 'put off')).toBe('The committee decided to put off the meeting.');
  });

  it('handles the first sentence', () => {
    expect(around(text, 'First')).toBe('First one.');
  });

  it('runs to the end of the block when there is no final punctuation', () => {
    expect(around(text, 'Last')).toBe('Last one');
  });

  it('does not split before a lowercase word', () => {
    expect(around('Use tools, e.g. hammers. Next.', 'hammers')).toBe('Use tools, e.g. hammers.');
  });

  it('handles closing quotes', () => {
    expect(around('He said "Stop!" Then left.', 'left')).toBe('Then left.');
  });

  it('collapses whitespace', () => {
    expect(around('A  big\n  dog. B.', 'big')).toBe('A big dog.');
  });

  it('truncates long sentences around the selection', () => {
    const long = `${'word '.repeat(150)}target ${'word '.repeat(150)}`;
    const result = around(long, 'target');
    expect(result.length).toBeLessThanOrEqual(MAX_SENTENCE + 2);
    expect(result).toContain('target');
    expect(result.startsWith('\u2026')).toBe(true);
    expect(result.endsWith('\u2026')).toBe(true);
  });
});
