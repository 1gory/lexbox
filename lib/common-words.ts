/**
 * High-frequency words that are never taken as a *derived* base, i.e. one found by stripping
 * -s/-ed/-ing from a saved word. Their suffixed forms are often separate words with their own
 * translation: evening ≠ even, news ≠ new, meeting ≠ meet, goods ≠ good, interested ≠ interest.
 * Without this list, saving "evening" would highlight every "even" with the translation of "evening".
 *
 * The list errs toward precision: a word here loses only the reverse expansion. Saved directly
 * ("meet"), it still matches itself and its forward forms (met, meeting). Plain verbs whose
 * inflections are just inflections (run, stop, walk, make, take…) and nouns whose plural is just a
 * plural (city, hand, eye…) are deliberately absent.
 */
export const COMMON_BASES: ReadonlySet<string> = new Set(
  `
  account advance amaze amuse annoy arm ash base bear begin belong bless book bore
  brief build cloth clothe concern condition content cook cross crowd custom damage deal
  depart detail develop draw dress earn end engage engineer even excite experience farm feel
  fill find fish fit follow found frighten fund garden gift glass good ground hear heat
  hold house interest land last lead learn leave left letter light limit line live long manner
  market mean meant meet miss morn new nurse odd offer open paint park please press
  print quarter race rail rank rate read reason record relate relation rich right ring rule
  sail sale save saving scare school season serve set settle ship shop short skill smoke spell
  spirit stand stock strike surprise surround tear term thank thought time tire train trouble
  unite value warn water wed will wood work worry wound write
  `
    .split(/\s+/)
    .filter(Boolean),
);
