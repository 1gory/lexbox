import { IRREGULAR_GROUPS } from './irregular';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);

let groupsByForm: Map<string, string[][]> | null = null;

function irregularGroupsOf(word: string): string[][] {
  if (!groupsByForm) {
    groupsByForm = new Map();
    for (const line of IRREGULAR_GROUPS) {
      const group = line.split(' ');
      for (const form of group) {
        const list = groupsByForm.get(form) ?? [];
        list.push(group);
        groupsByForm.set(form, list);
      }
    }
  }
  return groupsByForm.get(word) ?? [];
}

const isConsonant = (c: string | undefined): boolean => c !== undefined && /[a-z]/.test(c) && !VOWELS.has(c);

/** consonant-vowel-consonant ending, e.g. "stop", "big" (final w/x/y never doubles). */
function endsWithCvc(w: string): boolean {
  const n = w.length;
  const last = w[n - 1];
  return n >= 3 && isConsonant(last) && !'wxy'.includes(last!) && VOWELS.has(w[n - 2]!) && isConsonant(w[n - 3]);
}

/**
 * Regular inflections of a lowercase word. Over-generation is fine:
 * extra forms only matter if they actually appear in a text.
 */
export function regularForms(w: string): string[] {
  if (w.length < 3 || !/^[a-z]+$/.test(w)) return [];
  const out: string[] = [];
  const last = w[w.length - 1]!;
  const consonantY = last === 'y' && isConsonant(w[w.length - 2]);
  const stem = w.slice(0, -1);

  // plural / 3rd person
  out.push(consonantY ? stem + 'ies' : w + 's');
  if (/(s|x|z|ch|sh|o)$/.test(w)) out.push(w + 'es');

  // past
  if (last === 'e') out.push(w + 'd');
  else if (consonantY) out.push(stem + 'ied');
  else out.push(w + 'ed');

  // -ing
  if (w.endsWith('ie')) out.push(w.slice(0, -2) + 'ying');
  else if (last === 'e' && !/(ee|ye|oe)$/.test(w)) out.push(stem + 'ing');
  else out.push(w + 'ing');

  // comparative / superlative
  if (last === 'e') out.push(w + 'r', w + 'st');
  else if (consonantY) out.push(stem + 'ier', stem + 'iest');
  else out.push(w + 'er', w + 'est');

  // adverb
  if (consonantY) out.push(stem + 'ily');
  else if (w.endsWith('le')) out.push(stem + 'y');
  else out.push(w + 'ly');

  if (endsWithCvc(w)) {
    const doubled = w + last;
    out.push(doubled + 'ed', doubled + 'ing', doubled + 'er', doubled + 'est');
  }
  return out;
}

/** Every form of a word we try to recognise in texts. */
export function forms(word: string): Set<string> {
  const w = word.toLowerCase();
  const out = new Set<string>([w, `${w}'s`]);
  const bases = new Set<string>([w]);
  for (const group of irregularGroupsOf(w)) {
    for (const f of group) out.add(f);
    bases.add(group[0]!);
  }
  for (const base of bases) for (const f of regularForms(base)) out.add(f);
  return out;
}
