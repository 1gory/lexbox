import { describe, expect, it } from 'vitest';
import { buildIndex, findMatches } from '@/lib/matcher';

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

describe('findMatches with inflected entries', () => {
  const inflected = buildIndex([
    { id: 'stopped', key: 'stopped' },
    { id: 'puw', key: 'putting up with' },
    { id: 'cities', key: 'cities' },
  ]);
  const found = (text: string) => findMatches(inflected, text).map((m) => [text.slice(m.start, m.end), m.entryId]);

  it('matches every inflection of a saved inflected word', () => {
    expect(found('stop, stops, stopping')).toEqual([
      ['stop', 'stopped'],
      ['stops', 'stopped'],
      ['stopping', 'stopped'],
    ]);
    expect(found('One city, two cities.')).toEqual([
      ['city', 'cities'],
      ['cities', 'cities'],
    ]);
  });

  it('matches a phrase saved in an inflected form', () => {
    expect(found('I put up with it')).toEqual([['put up with', 'puw']]);
  });
});

describe('exact-key priority', () => {
  it('prefers the entry that equals the token, whatever the order of entries', () => {
    for (const entries of [
      [{ id: 'find', key: 'find' }, { id: 'found', key: 'found' }],
      [{ id: 'found', key: 'found' }, { id: 'find', key: 'find' }],
    ]) {
      const idx = buildIndex(entries);
      expect(findMatches(idx, 'I found it and find more').map((m) => m.entryId)).toEqual(['found', 'find']);
    }
  });

  it('prefers the exact phrase among phrases of equal length', () => {
    for (const entries of [
      [{ id: 'base', key: 'put up' }, { id: 'past', key: 'putting up' }],
      [{ id: 'past', key: 'putting up' }, { id: 'base', key: 'put up' }],
    ]) {
      const idx = buildIndex(entries);
      expect(findMatches(idx, 'putting up, put up').map((m) => m.entryId)).toEqual(['past', 'base']);
    }
  });

  it('still prefers a longer phrase over an exact shorter word', () => {
    const idx = buildIndex([
      { id: 'put', key: 'put' },
      { id: 'puw', key: 'put up with' },
    ]);
    expect(findMatches(idx, 'put up with').map((m) => m.entryId)).toEqual(['puw']);
  });
});
