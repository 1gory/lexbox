import { describe, expect, it } from 'vitest';
import { isContentScriptUrl, normalizeHost } from '@/lib/host';

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

describe('isContentScriptUrl', () => {
  it('accepts http, https and file pages', () => {
    expect(isContentScriptUrl('https://example.com/a')).toBe(true);
    expect(isContentScriptUrl('http://example.com')).toBe(true);
    expect(isContentScriptUrl('file:///home/me/page.html')).toBe(true);
  });

  it('rejects browser pages, other schemes and missing urls', () => {
    expect(isContentScriptUrl('chrome://extensions')).toBe(false);
    expect(isContentScriptUrl('chrome-extension://abc/popup.html')).toBe(false);
    expect(isContentScriptUrl('about:blank')).toBe(false);
    expect(isContentScriptUrl('not a url')).toBe(false);
    expect(isContentScriptUrl(undefined)).toBe(false);
  });
});
