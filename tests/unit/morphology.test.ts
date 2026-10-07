import { describe, expect, it } from 'vitest';
import { forms } from '@/lib/morphology';

const expectForms = (word: string, ...expected: string[]) => {
  const all = [...forms(word)];
  for (const f of expected) expect(all, `${word} -> ${f}`).toContain(f);
};

describe('forms', () => {
  it('includes the word itself and the possessive', () => expectForms('world', 'world', "world's"));
  it('doubles the final consonant', () => expectForms('stop', 'stops', 'stopped', 'stopping'));
  it('drops the final e before -ing', () => expectForms('make', 'makes', 'making', 'made'));
  it('turns consonant + y into -ies/-ied/-ier/-ily', () => {
    expectForms('city', 'cities');
    expectForms('happy', 'happier', 'happiest', 'happily');
  });
  it('handles -es endings', () => expectForms('watch', 'watches', 'watched', 'watching'));
  it('handles ie -> ying', () => expectForms('lie', 'lying', 'lies', 'lied', 'lay', 'lain'));
  it('keeps ee before -ing', () => expectForms('see', 'seeing', 'sees', 'saw', 'seen'));
  it('handles -le -> -ly', () => expectForms('gentle', 'gently'));
  it('handles comparatives with doubling', () => expectForms('big', 'bigger', 'biggest'));
  it('adds irregular forms', () => {
    expectForms('run', 'runs', 'running', 'ran');
    expectForms('go', 'goes', 'going', 'went', 'gone');
    expectForms('be', 'is', 'are', 'was', 'were', 'been', 'being');
  });
  it('maps an irregular form back to its whole group', () => expectForms('ran', 'run', 'runs', 'running'));
  it('is case-insensitive', () => expectForms('Run', 'running'));
  it('does not inflect very short words', () => {
    expect([...forms('us')]).not.toContain('uses');
  });
});
