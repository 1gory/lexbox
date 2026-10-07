import { describe, expect, it } from 'vitest';
import { buildIndex, findMatches, matchWhole } from '@/lib/matcher';

const index = buildIndex([
  { id: 'run', key: 'run' },
  { id: 'put', key: 'put' },
  { id: 'puw', key: 'put up with' },
  { id: 'wk', key: 'well known' },
  { id: 'empty', key: '' },
]);

const texts = (text: string) => findMatches(index, text).map((m) => [text.slice(m.start, m.end), m.entryId]);

describe('findMatches', () => {
  it('finds a word form with offsets', () => {
    expect(findMatches(index, 'He was Running fast')).toEqual([{ start: 7, end: 14, entryId: 'run' }]);
  });

  it('does not match inside another word', () => {
    expect(findMatches(index, 'rerun the outputs')).toEqual([]);
  });

  it('finds phrases in inflected form', () => {
    expect(texts('She was putting up with it')).toEqual([['putting up with', 'puw']]);
  });

  it('does not join a phrase across punctuation', () => {
    expect(texts('put up. With love')).toEqual([['put', 'put']]);
  });

  it('allows hyphens between phrase words', () => {
    expect(texts('a well-known fact')).toEqual([['well-known', 'wk']]);
  });

  it('prefers the longest match and continues after it', () => {
    expect(texts('Put up with noise, then put it down. They ran.')).toEqual([
      ['Put up with', 'puw'],
      ['put', 'put'],
      ['ran', 'run'],
    ]);
  });
});

describe('matchWhole', () => {
  it('matches a whole text that is a form of an entry', () => {
    expect(matchWhole(index, 'Running')).toBe('run');
    expect(matchWhole(index, 'putting up with')).toBe('puw');
  });

  it('returns null when the text is longer than the entry', () => {
    expect(matchWhole(index, 'run fast')).toBeNull();
    expect(matchWhole(index, '')).toBeNull();
  });
});
