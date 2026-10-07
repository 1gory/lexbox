/** Localized UI string; falls back to the key so missing messages stay visible but harmless. */
export function t(key: string, substitutions?: string | string[]): string {
  try {
    // WXT types getMessage keys as a union of known messages; callers pass plain strings.
    return browser.i18n.getMessage(key as never, substitutions) || key;
  } catch {
    return key;
  }
}
