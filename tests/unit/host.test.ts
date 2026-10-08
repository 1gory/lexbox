import { describe, expect, it } from 'vitest';
import { isContentScriptUrl, isExcludedHost, normalizeHost } from '@/lib/host';

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

  it('rejects pages where Chrome never runs content scripts', () => {
    expect(isContentScriptUrl('https://chromewebstore.google.com/detail/abc')).toBe(false);
    expect(isContentScriptUrl('https://chrome.google.com/webstore/detail/abc')).toBe(false);
    expect(isContentScriptUrl('https://example.com/paper.PDF')).toBe(false);
    expect(isContentScriptUrl('file:///home/me/paper.pdf')).toBe(false);
    expect(isContentScriptUrl('https://chrome.google.com/search')).toBe(true);
    expect(isContentScriptUrl('https://example.com/pdf-guide.html')).toBe(true);
  });

  it('rejects file pages without file access', () => {
    expect(isContentScriptUrl('file:///home/me/page.html', { fileAccess: false })).toBe(false);
    expect(isContentScriptUrl('https://example.com', { fileAccess: false })).toBe(true);
  });
});

describe('isExcludedHost', () => {
  it('matches the site itself and its subdomains', () => {
    expect(isExcludedHost('nytimes.com', ['nytimes.com'])).toBe(true);
    expect(isExcludedHost('www.nytimes.com', ['nytimes.com'])).toBe(true);
    expect(isExcludedHost('a.b.nytimes.com', ['other.org', 'nytimes.com'])).toBe(true);
  });

  it('does not match other hosts that merely end the same way', () => {
    expect(isExcludedHost('notnytimes.com', ['nytimes.com'])).toBe(false);
    expect(isExcludedHost('nytimes.com', ['www.nytimes.com'])).toBe(false);
    expect(isExcludedHost('nytimes.com', [])).toBe(false);
    expect(isExcludedHost('', ['nytimes.com'])).toBe(false);
  });
});
