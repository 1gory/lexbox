import { describe, expect, it } from 'vitest';
import { normalizeHost } from '@/lib/host';

describe('normalizeHost', () => {
  it('extracts the hostname from urls and bare hosts', () => {
    expect(normalizeHost(' https://Example.com/path?q=1 ')).toBe('example.com');
    expect(normalizeHost('news.ycombinator.com')).toBe('news.ycombinator.com');
  });

  it('returns an empty string for invalid input', () => {
    expect(normalizeHost('')).toBe('');
    expect(normalizeHost('http://')).toBe('');
  });
});
