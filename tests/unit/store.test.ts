import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  addContext,
  findInList,
  getSettings,
  listEntries,
  onEntriesChanged,
  onSettingsChanged,
  putEntry,
  removeEntry,
  saveEntry,
  updateSettings,
  updateTranslation,
} from '@/lib/store';
import { DEFAULT_SETTINGS, type Context, type Entry } from '@/lib/types';

const ctx = (sentence: string, url = 'https://a.test/1'): Context => ({ sentence, url, title: 'A', addedAt: 1 });

beforeEach(() => fakeBrowser.reset());

describe('saveEntry', () => {
  it('falls back to a hex id when crypto.randomUUID is unavailable', async () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto), randomUUID: undefined });
    try {
      const saved = await saveEntry({ text: 'walk', translation: 'идти', context: ctx('I walk.') });
      expect(saved.id).toMatch(/^[0-9a-f]{32}$/);
      expect(await listEntries()).toEqual([saved]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('creates a new entry', async () => {
    const saved = await saveEntry({ text: ' Put  up with ', translation: ' терпеть ', context: ctx('Cannot put up with it.') });
    expect(saved).toMatchObject({ text: 'Put up with', key: 'put up with', translation: 'терпеть' });
    expect(saved.contexts).toEqual([ctx('Cannot put up with it.')]);
    expect(await listEntries()).toEqual([saved]);
  });

  it('adds a context to an existing entry matched by word form', async () => {
    const first = await saveEntry({ text: 'run', translation: 'бежать', context: ctx('I run.') });
    const second = await saveEntry({ text: 'running', translation: '', context: ctx('Running is fun.', 'https://b.test') });
    expect(second.id).toBe(first.id);
    expect(second.translation).toBe('бежать');
    expect(second.contexts.map((c) => c.sentence)).toEqual(['Running is fun.', 'I run.']);
    expect(await listEntries()).toHaveLength(1);
  });

  it('merges an inflected form saved first with later forms', async () => {
    const first = await saveEntry({ text: 'stopped', translation: 'остановился', context: ctx('It stopped.') });
    const second = await saveEntry({ text: 'stopping', translation: '', context: ctx('Stop stopping.') });
    const third = await saveEntry({ text: 'stop', translation: '', context: ctx('Stop.') });
    expect(second.id).toBe(first.id);
    expect(third.id).toBe(first.id);
    expect(third.contexts).toHaveLength(3);
    expect(await listEntries()).toHaveLength(1);
  });

  it('merges inflections and irregular forms', async () => {
    for (const [a, b] of [
      ['running', 'ran'],
      ['cities', 'city'],
      ['putting up with', 'put up with'],
    ] as const) {
      fakeBrowser.reset();
      const first = await saveEntry({ text: a, translation: '', context: null });
      expect((await saveEntry({ text: b, translation: '', context: null })).id, `${a} / ${b}`).toBe(first.id);
    }
  });

  it('keeps words related only by -er/-est/-ly separate', async () => {
    for (const [a, b] of [
      ['early', 'ear'],
      ['letter', 'let'],
      ['bitter', 'bit'],
      ['manner', 'man'],
    ] as const) {
      fakeBrowser.reset();
      await saveEntry({ text: a, translation: 'a', context: null });
      await saveEntry({ text: b, translation: 'b', context: null });
      expect((await listEntries()).map((e) => [e.key, e.translation]).sort(), `${a} / ${b}`).toEqual(
        [[a, 'a'], [b, 'b']].sort(),
      );
    }
  });

  it('saves a common base separately from its lexicalized form', async () => {
    const meeting = await saveEntry({ text: 'meeting', translation: 'встреча', context: null });
    const meet = await saveEntry({ text: 'meet', translation: 'встречать', context: null });
    expect(meet.id).not.toBe(meeting.id);
    expect((await listEntries()).map((e) => [e.key, e.translation]).sort()).toEqual([
      ['meet', 'встречать'],
      ['meeting', 'встреча'],
    ]);
  });

  it('creates a separate entry for another form on request', async () => {
    const find = await saveEntry({ text: 'find', translation: 'находить', context: null });
    const found = await saveEntry({ text: 'found', translation: 'основать', context: ctx('They found a company.') }, { separate: true });
    expect(found.id).not.toBe(find.id);
    expect(found).toMatchObject({ key: 'found', translation: 'основать' });
    const entries = await listEntries();
    expect(entries.map((e) => [e.key, e.translation]).sort()).toEqual([
      ['find', 'находить'],
      ['found', 'основать'],
    ]);
  });

  it('reuses an exact key even when asked for a separate entry', async () => {
    const first = await saveEntry({ text: 'found', translation: 'основать', context: null });
    const again = await saveEntry({ text: 'Found', translation: '', context: ctx('Found it.') }, { separate: true });
    expect(again.id).toBe(first.id);
    expect(await listEntries()).toHaveLength(1);
  });

  it('overrides the translation when a new one is given', async () => {
    await saveEntry({ text: 'run', translation: 'бежать', context: null });
    const updated = await saveEntry({ text: 'run', translation: 'управлять', context: null });
    expect(updated.translation).toBe('управлять');
  });

  it('does not duplicate the same context', async () => {
    await saveEntry({ text: 'run', translation: '', context: ctx('I run.') });
    const again = await saveEntry({ text: 'run', translation: '', context: ctx('I run.') });
    expect(again.contexts).toHaveLength(1);
  });

  it('rejects text without words', async () => {
    await expect(saveEntry({ text: '123', translation: '', context: null })).rejects.toThrow();
  });
});

describe('findInList', () => {
  const entry = (key: string, createdAt: number): Entry => ({
    id: key, text: key, key, translation: '', contexts: [], createdAt, updatedAt: createdAt,
  });

  it('prefers the exact key over another form, whatever the order', () => {
    expect(findInList([entry('find', 2), entry('found', 1)], 'Found')?.id).toBe('found');
    expect(findInList([entry('found', 2), entry('find', 1)], 'Found')?.id).toBe('found');
    expect(findInList([entry('found', 2), entry('find', 1)], 'find')?.id).toBe('find');
  });

  it('falls back to an entry of the same lexeme', () => {
    expect(findInList([entry('find', 1)], 'found')?.id).toBe('find');
    expect(findInList([entry('stopped', 1)], 'stopping')?.id).toBe('stopped');
    expect(findInList([entry('ear', 1)], 'early')).toBeNull();
  });
});

describe('entries', () => {
  const entry = (id: string, createdAt: number): Entry => ({
    id, text: id, key: id, translation: '', contexts: [], createdAt, updatedAt: createdAt,
  });

  it('lists entries newest first and ignores other keys', async () => {
    await putEntry(entry('old', 1));
    await putEntry(entry('new', 2));
    await updateSettings({ floatingButton: false });
    expect((await listEntries()).map((e) => e.id)).toEqual(['new', 'old']);
  });

  it('updates the translation and removes entries', async () => {
    await putEntry(entry('a', 1));
    await updateTranslation('a', ' перевод ');
    expect((await listEntries())[0]!.translation).toBe('перевод');
    await removeEntry('a');
    expect(await listEntries()).toEqual([]);
  });

  it('addContext prepends and deduplicates by url + sentence', () => {
    const list = [ctx('One.')];
    expect(addContext(list, null)).toBe(list);
    expect(addContext(list, ctx('One.'))).toBe(list);
    expect(addContext(list, ctx('Two.')).map((c) => c.sentence)).toEqual(['Two.', 'One.']);
  });
});

describe('settings', () => {
  it('returns defaults and merges updates', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    await updateSettings({ excludedSites: ['a.test'] });
    expect(await getSettings()).toEqual({ ...DEFAULT_SETTINGS, excludedSites: ['a.test'] });
  });
});

describe('subscriptions', () => {
  it('notifies about entry changes only', async () => {
    const cb = vi.fn();
    const off = onEntriesChanged(cb);
    await updateSettings({ floatingButton: false });
    expect(cb).not.toHaveBeenCalled();
    await saveEntry({ text: 'run', translation: '', context: null });
    expect(cb).toHaveBeenCalledTimes(1);
    off();
    await saveEntry({ text: 'walk', translation: '', context: null });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('passes merged settings to settings listeners', async () => {
    const cb = vi.fn();
    onSettingsChanged(cb);
    await updateSettings({ highlightEnabled: false });
    expect(cb).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, highlightEnabled: false });
  });
});
