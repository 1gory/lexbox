import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import {
  addContext,
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
