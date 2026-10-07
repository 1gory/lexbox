export interface Token {
  /** Lowercased, curly apostrophes replaced with "'". */
  value: string;
  start: number;
  end: number;
}

const WORD_RE = /[A-Za-z]+(?:['\u2019][A-Za-z]+)*/g;

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const m of text.matchAll(WORD_RE)) {
    const start = m.index!;
    tokens.push({ value: m[0].toLowerCase().replace(/\u2019/g, "'"), start, end: start + m[0].length });
  }
  return tokens;
}

/** Canonical form used to compare saved expressions: "  Put UP with! " -> "put up with". */
export function normalizeKey(text: string): string {
  return tokenize(text)
    .map((t) => t.value)
    .join(' ');
}
