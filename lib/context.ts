export const MAX_SENTENCE = 300;

/** End punctuation (+ closing quotes), whitespace, then an uppercase letter / digit / opening quote. */
const BOUNDARY_RE = /([.!?]+["'\u201D\u2019)]*)\s+(?=["'\u201C\u2018(]?[A-Z0-9])/g;

/** The sentence of `text` that contains the range [start, end). */
export function extractSentence(text: string, start: number, end: number): string {
  let from = 0;
  let to = text.length;
  for (const m of text.matchAll(BOUNDARY_RE)) {
    const sentenceEnd = m.index! + m[1]!.length;
    const nextStart = m.index! + m[0].length;
    if (nextStart <= start) {
      from = nextStart;
    } else if (sentenceEnd >= end) {
      to = sentenceEnd;
      break;
    }
  }

  let a = from;
  let b = to;
  if (b - a > MAX_SENTENCE) {
    const middle = Math.floor((start + end) / 2);
    a = Math.max(from, middle - MAX_SENTENCE / 2);
    b = Math.min(to, a + MAX_SENTENCE);
    a = Math.max(from, b - MAX_SENTENCE);
  }

  let sentence = text.slice(a, b).replace(/\s+/g, ' ').trim();
  if (a > from) sentence = `\u2026${sentence}`;
  if (b < to) sentence = `${sentence}\u2026`;
  return sentence;
}
