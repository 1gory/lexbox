import { describe, expect, it } from 'vitest';
import { baseCandidates, forms, matchForms, sameLexeme } from '@/lib/morphology';

const expectForms = (word: string, ...expected: string[]) => {
  const all = [...forms(word)];
  for (const f of expected) expect(all, `${word} -> ${f}`).toContain(f);
};

const expectNoForms = (word: string, ...unexpected: string[]) => {
  const all = [...forms(word)];
  for (const f of unexpected) expect(all, `${word} -/-> ${f}`).not.toContain(f);
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
  it('adds -er/-est/-ly to words of four letters or more', () => {
    expectForms('quick', 'quicker', 'quickest', 'quickly');
    expectForms('late', 'later', 'latest', 'lately');
  });
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

  describe('does not over-generate into other words', () => {
    it('no doubled -er/-est', () => {
      expectNoForms('let', 'letter');
      expectNoForms('bet', 'better');
      expectNoForms('sum', 'summer');
      expectNoForms('big', 'bigger', 'biggest');
    });
    it('no -er/-est/-ly for words shorter than four letters', () => {
      expectNoForms('ear', 'early');
      expectNoForms('bit', 'bitter');
      expectNoForms('man', 'manner', 'manly');
    });
    it('no regular past for irregular verbs', () => {
      expectNoForms('see', 'seed');
      expectNoForms('run', 'runned');
      expectNoForms('find', 'finded');
    });
  });
});

describe('baseCandidates', () => {
  const expectBases = (word: string, ...expected: string[]) => {
    const all = baseCandidates(word);
    for (const b of expected) expect(all, `${word} <- ${b}`).toContain(b);
  };
  const expectNoBases = (word: string, ...unexpected: string[]) => {
    const all = baseCandidates(word);
    for (const b of unexpected) expect(all, `${word} <-/- ${b}`).not.toContain(b);
  };

  it('includes the word itself', () => expectBases('Table', 'table'));
  it('maps irregular forms to the base', () => {
    expectBases('ran', 'run');
    expectBases('went', 'go');
    expectBases('found', 'find');
  });
  it('reverses -ies/-ied, -es and -s', () => {
    expectBases('cities', 'city');
    expectBases('carried', 'carry');
    expectBases('flies', 'fly');
    expectBases('watches', 'watch');
    expectBases('stops', 'stop');
  });
  it('reverses -ed with e-restore and un-doubling', () => {
    expectBases('walked', 'walk');
    expectBases('liked', 'like');
    expectBases('used', 'use');
    expectBases('stopped', 'stop');
  });
  it('reverses -ing with e-restore, un-doubling and -ying', () => {
    expectBases('walking', 'walk');
    expectBases('making', 'make');
    expectBases('putting', 'put');
    expectBases('lying', 'lie');
  });
  it('strips the possessive', () => expectBases("world's", 'world'));
  it('rejects candidates the word is not an inflection of', () => {
    expectNoBases('seed', 'see');
    expectNoBases('shed', 'she');
    expectNoBases('string', 'str');
    expectNoBases('earring', 'ear');
    expectNoBases('feed', 'fee');
  });
  it('does not reverse derivations', () => {
    expectNoBases('early', 'ear');
    expectNoBases('letter', 'let');
    expectNoBases('quickly', 'quick');
  });
});

describe('matchForms', () => {
  const expectMatches = (word: string, ...expected: string[]) => {
    const all = [...matchForms(word)];
    for (const f of expected) expect(all, `${word} ~ ${f}`).toContain(f);
  };

  it('covers every inflection of a saved inflected form', () => {
    expectMatches('stopped', 'stop', 'stops', 'stopping', 'stopped');
    expectMatches('cities', 'city', "city's");
    expectMatches('putting', 'put', 'puts');
    expectMatches('running', 'run', 'ran', 'runs');
    expectMatches('Making', 'make', 'made');
  });
  it('still covers the forward forms', () => expectMatches('quick', 'quickly'));
  it('does not pull in the irregular group of a derived base', () => {
    // "bore" is a derived base of "boring", but it is not the head of the bear group.
    expect([...matchForms('boring')]).not.toContain('bear');
  });
});

describe('common words are never derived bases', () => {
  const expectNoMatch = (word: string, ...unexpected: string[]) => {
    const all = [...matchForms(word)];
    for (const f of unexpected) expect(all, `${word} !~ ${f}`).not.toContain(f);
  };

  it('does not highlight a common word for a lexicalized form', () => {
    expectNoMatch('evening', 'even');
    expectNoMatch('news', 'new');
    expectNoMatch('meeting', 'meet', 'met');
    expectNoMatch('goods', 'good');
    expectNoMatch('times', 'time');
    expectNoMatch('means', 'mean', 'meant');
    expectNoMatch('building', 'build', 'built');
    expectNoMatch('feeling', 'feel', 'felt');
    expectNoMatch('interesting', 'interest', 'interested');
    expectNoMatch('savings', 'save', 'saving');
  });

  it('keeps reverse bases of ordinary words', () => {
    expect([...matchForms('cities')]).toContain('city');
    expect([...matchForms('stopped')]).toContain('stop');
    expect([...matchForms('running')]).toContain('run');
  });

  it('keeps the forward forms of a common word saved directly', () => {
    expect([...matchForms('meet')]).toEqual(expect.arrayContaining(['meet', 'met', 'meeting', 'meets']));
    expect([...matchForms('even')]).toContain('evening');
  });

  it('keeps such words apart in dedup', () => {
    expect(sameLexeme('meeting', 'meet')).toBe(false);
    expect(sameLexeme('news', 'new')).toBe(false);
    expect(sameLexeme('evening', 'even')).toBe(false);
  });
});

describe('sameLexeme', () => {
  it('merges inflections of one word', () => {
    expect(sameLexeme('stopping', 'stopped')).toBe(true);
    expect(sameLexeme('running', 'ran')).toBe(true);
    expect(sameLexeme('cities', 'city')).toBe(true);
    expect(sameLexeme('run', 'running')).toBe(true);
    expect(sameLexeme('find', 'found')).toBe(true);
  });
  it('keeps words related only by -er/-est/-ly apart', () => {
    expect(sameLexeme('early', 'ear')).toBe(false);
    expect(sameLexeme('letter', 'let')).toBe(false);
    expect(sameLexeme('bitter', 'bit')).toBe(false);
    expect(sameLexeme('manner', 'man')).toBe(false);
    expect(sameLexeme('quickly', 'quick')).toBe(false);
  });
  it('compares phrases word by word', () => {
    expect(sameLexeme('putting up with', 'put up with')).toBe(true);
    expect(sameLexeme('put up with', 'put up')).toBe(false);
    expect(sameLexeme('put off', 'put up')).toBe(false);
  });
  it('treats equal keys as the same', () => {
    expect(sameLexeme('xyz', 'xyz')).toBe(true);
  });
});
