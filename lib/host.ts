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
