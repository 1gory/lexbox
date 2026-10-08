/** "https://Example.com/path" or "example.com" -> "example.com"; "" when it is not a host. */
export function normalizeHost(input: string): string {
  const value = input.trim().toLowerCase();
  if (!value) return '';
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname;
  } catch {
    return '';
  }
}

/**
 * Pages our content script runs on (it matches <all_urls>): http, https and file, except the
 * Chrome Web Store and PDFs (the PDF viewer), and file pages unless the user allowed file access.
 */
export function isContentScriptUrl(url: string | undefined, { fileAccess = true }: { fileAccess?: boolean } = {}): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const { protocol, hostname, pathname } = parsed;
  if (protocol === 'file:') {
    if (!fileAccess) return false;
  } else if (protocol !== 'http:' && protocol !== 'https:') {
    return false;
  }
  if (hostname === 'chromewebstore.google.com') return false;
  if (hostname === 'chrome.google.com' && (pathname === '/webstore' || pathname.startsWith('/webstore/'))) return false;
  return !pathname.toLowerCase().endsWith('.pdf');
}

/** Whether `host` is one of `sites` or a subdomain of one: "nytimes.com" covers "www.nytimes.com". */
export function isExcludedHost(host: string, sites: readonly string[]): boolean {
  return host !== '' && sites.some((site) => host === site || host.endsWith(`.${site}`));
}
