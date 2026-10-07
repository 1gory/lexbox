import { forms } from './morphology';
import { tokenize, type Token } from './text';

export interface Match {
  start: number;
  end: number;
  entryId: string;
}

interface Pattern {
  entryId: string;
  /** One set of accepted forms per word of the entry. */
  tokens: Set<string>[];
}

export interface MatchIndex {
  byFirst: Map<string, Pattern[]>;
}

/** Only whitespace or hyphens may separate the words of a phrase. */
const GAP_RE = /^[\s\u00a0\-\u2010\u2011\u2013]+$/;

export function buildIndex(entries: ReadonlyArray<{ id: string; key: string }>): MatchIndex {
  const byFirst = new Map<string, Pattern[]>();
  for (const entry of entries) {
    const words = entry.key.split(' ').filter(Boolean);
    if (words.length === 0) continue;
    const pattern: Pattern = { entryId: entry.id, tokens: words.map((w) => forms(w)) };
    for (const form of pattern.tokens[0]!) {
      const list = byFirst.get(form) ?? [];
      list.push(pattern);
      byFirst.set(form, list);
    }
  }
  // Longest patterns first so the first hit at a position is the longest one.
  for (const list of byFirst.values()) list.sort((a, b) => b.tokens.length - a.tokens.length);
  return { byFirst };
}

function matchesAt(pattern: Pattern, tokens: Token[], i: number, text: string): boolean {
  if (i + pattern.tokens.length > tokens.length) return false;
  for (let k = 0; k < pattern.tokens.length; k++) {
    const token = tokens[i + k]!;
    if (!pattern.tokens[k]!.has(token.value)) return false;
    if (k > 0 && !GAP_RE.test(text.slice(tokens[i + k - 1]!.end, token.start))) return false;
  }
  return true;
}

export function findMatches(index: MatchIndex, text: string): Match[] {
  const tokens = tokenize(text);
  const matches: Match[] = [];
  let i = 0;
  while (i < tokens.length) {
    const candidates = index.byFirst.get(tokens[i]!.value);
    const hit = candidates?.find((p) => matchesAt(p, tokens, i, text));
    if (hit) {
      const last = tokens[i + hit.tokens.length - 1]!;
      matches.push({ start: tokens[i]!.start, end: last.end, entryId: hit.entryId });
      i += hit.tokens.length;
    } else {
      i++;
    }
  }
  return matches;
}

/** Id of the entry the whole text is a form of ("running" -> entry "run"), else null. */
export function matchWhole(index: MatchIndex, text: string): string | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;
  const candidates = index.byFirst.get(tokens[0]!.value) ?? [];
  const hit = candidates.find((p) => p.tokens.length === tokens.length && matchesAt(p, tokens, 0, text));
  return hit?.entryId ?? null;
}
