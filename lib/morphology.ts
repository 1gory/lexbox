import { COMMON_BASES } from './common-words';
import { IRREGULAR_GROUPS } from './irregular';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
/** Shorter words are not inflected, and shorter stripped bases are not trusted. */
const MIN_LENGTH = 3;
/** -er/-est/-ly on shorter words mostly produce other words: ear → early, bit → bitter. */
const MIN_DERIVATION_LENGTH = 4;

let groupsByForm: Map<string, string[][]> | null = null;

function groupsOf(word: string): string[][] {
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

/** The irregular group `word` is the base form of, if any. */
const headedGroup = (word: string): string[] | undefined => groupsOf(word).find((g) => g[0] === word);

const isConsonant = (c: string | undefined): boolean => c !== undefined && /[a-z]/.test(c) && !VOWELS.has(c);

/** consonant-vowel-consonant ending, e.g. "stop", "big" (final w/x/y never doubles). */
function endsWithCvc(w: string): boolean {
  const n = w.length;
  const last = w[n - 1];
  return n >= 3 && isConsonant(last) && !'wxy'.includes(last!) && VOWELS.has(w[n - 2]!) && isConsonant(w[n - 3]);
}

const inflectable = (w: string): boolean => w.length >= MIN_LENGTH && /^[a-z]+$/.test(w);

/**
 * Regular inflections: -s/-es/-ies, -ed/-d/-ied, -ing (e-drop, ie → ying) and consonant doubling.
 * Verbs heading an irregular group get no regular past: the group lists it when it is valid.
 */
function regularInflections(w: string): string[] {
  if (!inflectable(w)) return [];
  const out: string[] = [];
  const last = w[w.length - 1]!;
  const consonantY = last === 'y' && isConsonant(w[w.length - 2]);
  const stem = w.slice(0, -1);
  const regularPast = !headedGroup(w);
  const cvc = endsWithCvc(w);

  // plural / 3rd person
  out.push(consonantY ? stem + 'ies' : w + 's');
  if (/(s|x|z|ch|sh|o)$/.test(w)) out.push(w + 'es');

  // past
  if (regularPast) {
    if (last === 'e') out.push(w + 'd');
    else if (consonantY) out.push(stem + 'ied');
    else out.push(w + 'ed');
    if (cvc) out.push(w + last + 'ed');
  }

  // -ing
  if (w.endsWith('ie')) out.push(w.slice(0, -2) + 'ying');
  else if (last === 'e' && !/(ee|ye|oe)$/.test(w)) out.push(stem + 'ing');
  else out.push(w + 'ing');
  if (cvc) out.push(w + last + 'ing');

  return out;
}

/** Comparative, superlative and adverb. No consonant doubling: bet → better, sum → summer. */
function derivations(w: string): string[] {
  if (w.length < MIN_DERIVATION_LENGTH || !/^[a-z]+$/.test(w)) return [];
  const last = w[w.length - 1]!;
  const consonantY = last === 'y' && isConsonant(w[w.length - 2]);
  const stem = w.slice(0, -1);
  const out: string[] = [];
  if (last === 'e') out.push(w + 'r', w + 'st');
  else if (consonantY) out.push(stem + 'ier', stem + 'iest');
  else out.push(w + 'er', w + 'est');

  if (consonantY) out.push(stem + 'ily');
  else if (w.endsWith('le')) out.push(stem + 'y');
  else out.push(w + 'ly');
  return out;
}

/** Inflections of `w` taken as a dictionary form: itself, possessive, its irregular group if it heads one. */
function lemmaInflections(w: string): Set<string> {
  return new Set([w, `${w}'s`, ...(headedGroup(w) ?? []), ...regularInflections(w)]);
}

/**
 * Every form of a word we generate forwards. Over-generation is fine for highlighting:
 * extra forms only matter if they actually appear in a text.
 */
export function forms(word: string): Set<string> {
  const w = word.toLowerCase();
  const out = new Set<string>([w, `${w}'s`]);
  const bases = new Set<string>([w]);
  for (const group of groupsOf(w)) {
    for (const f of group) out.add(f);
    bases.add(group[0]!);
  }
  for (const base of bases) for (const f of [...regularInflections(base), ...derivations(base)]) out.add(f);
  return out;
}

const hasVowel = (s: string): boolean => /[aeiouy]/.test(s);
const undouble = (stem: string): string => (stem.length >= 2 && stem.at(-1) === stem.at(-2) ? stem.slice(0, -1) : stem);

/** Bases that a regular suffix rule could have produced `w` from (unchecked). */
function strippedBases(w: string): string[] {
  const out: string[] = [];
  // The part left before the suffix must contain a vowel: "shed" is not "she" + "d". When one
  // reading is a common word, the others are junk too ("interesting" is not "intereste" + "ing").
  const fromStem = (stem: string, ...bases: string[]) => {
    if (hasVowel(stem) && !bases.some((b) => COMMON_BASES.has(b))) out.push(...bases);
  };
  if (w.endsWith("'s")) out.push(w.slice(0, -2));
  if (w.endsWith('ies')) out.push(w.slice(0, -3) + 'y');
  if (w.endsWith('es')) fromStem(w.slice(0, -2), w.slice(0, -2));
  if (w.endsWith('s')) fromStem(w.slice(0, -1), w.slice(0, -1));
  if (w.endsWith('ied')) out.push(w.slice(0, -3) + 'y');
  if (w.endsWith('ed')) {
    const stem = w.slice(0, -2);
    fromStem(stem, stem, stem + 'e', undouble(stem));
  }
  if (w.endsWith('ying')) out.push(w.slice(0, -4) + 'ie');
  if (w.endsWith('ing')) {
    const stem = w.slice(0, -3);
    fromStem(stem, stem, stem + 'e', undouble(stem));
  }
  return out;
}

/**
 * The word itself plus the dictionary forms it may be an inflection of:
 * "ran" → run, "cities" → city, "stopped" → stop, "making" → make, "world's" → world.
 * A stripped base is kept only if inflecting it gives the word back, so some junk
 * ("stopp" for "stopping") remains; it only matters if it appears in a text.
 * Derivations (-er/-est/-ly) are never reversed, and common words such as "even", "new" or
 * "meet" are never stripped bases, since their -s/-ed/-ing forms are often other words.
 */
export function baseCandidates(word: string): string[] {
  const w = word.toLowerCase();
  const out = new Set<string>([w]);
  const groups = groupsOf(w);
  for (const group of groups) out.add(group[0]!);
  // Irregular verb forms get their bases from the table only ("feed" is not "fee" + "d").
  if (groups.length === 0) {
    for (const base of strippedBases(w)) {
      // Common words are never derived bases: "evening" is not a form of "even" (see COMMON_BASES).
      if (base.length >= MIN_LENGTH && !COMMON_BASES.has(base) && lemmaInflections(base).has(w)) out.add(base);
    }
  }
  return [...out];
}

/**
 * Tokens that count as the word in a text: its own forms plus the inflections of every
 * base it may come from, so a saved "stopped" also matches "stop" and "stopping".
 */
export function matchForms(word: string): Set<string> {
  const w = word.toLowerCase();
  const out = forms(w);
  for (const base of baseCandidates(w)) {
    if (base !== w) for (const f of lemmaInflections(base)) out.add(f);
  }
  return out;
}

function shareBase(a: string, b: string): boolean {
  if (a === b) return true;
  const bases = new Set(baseCandidates(a));
  return baseCandidates(b).some((base) => bases.has(base));
}

/**
 * Whether two normalized keys are one dictionary entry: equal, or word by word inflections
 * of a common base ("stopping" / "stopped", "putting up with" / "put up with").
 * Words related only by -er/-est/-ly ("early" / "ear") stay distinct.
 */
export function sameLexeme(keyA: string, keyB: string): boolean {
  if (keyA === keyB) return true;
  const a = keyA.split(' ').filter(Boolean);
  const b = keyB.split(' ').filter(Boolean);
  return a.length > 0 && a.length === b.length && a.every((word, i) => shareBase(word, b[i]!));
}
