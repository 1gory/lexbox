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

/** Pages our content script runs on: it matches <all_urls>, which covers http, https and file. */
export function isContentScriptUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return ['http:', 'https:', 'file:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}
