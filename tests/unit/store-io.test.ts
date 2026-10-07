import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { listEntries, putEntry } from '@/lib/store';
import { ImportError, importBackup, mergeContexts, parseBackup, serializeBackup, toCsv } from '@/lib/store-io';
import type { Context, Entry } from '@/lib/types';

const ctx = (sentence: string, addedAt: number): Context => ({ sentence, url: 'https://a.test', title: 'A', addedAt });
const entry = (id: string, text: string, translation: string, contexts: Context[]): Entry => ({
  id, text, key: text.toLowerCase(), translation, contexts, createdAt: 1, updatedAt: 1,
});

beforeEach(() => fakeBrowser.reset());

describe('backup', () => {
  it('round-trips entries', async () => {
    const entries = [entry('1', 'run', 'бежать', [ctx('I run.', 1)])];
    const json = serializeBackup(entries);
    expect(parseBackup(json)).toEqual(entries);
    expect(await importBackup(json)).toBe(1);
    expect(await listEntries()).toEqual(entries);
  });

  it('rejects invalid files without touching storage', async () => {
    await putEntry(entry('1', 'run', 'бежать', []));
    await expect(importBackup('not json')).rejects.toBeInstanceOf(ImportError);
    await expect(importBackup('{"format":"other","entries":[]}')).rejects.toBeInstanceOf(ImportError);
    await expect(importBackup('{"format":"lexbox","version":1,"entries":[{"text":1}]}')).rejects.toBeInstanceOf(ImportError);
    expect(await listEntries()).toHaveLength(1);
  });

  it('merges entries with the same key', async () => {
    await putEntry(entry('local', 'run', '', [ctx('A.', 1)]));
    const json = serializeBackup([entry('remote', 'Run', 'бежать', [ctx('A.', 1), ctx('B.', 2)])]);
    await importBackup(json);
    const [merged, ...rest] = await listEntries();
    expect(rest).toEqual([]);
    expect(merged!.id).toBe('local');
    expect(merged!.translation).toBe('бежать');
    expect(merged!.contexts.map((c) => c.sentence)).toEqual(['B.', 'A.']);
  });

  it('keeps the local translation when both exist', async () => {
    await putEntry(entry('local', 'run', 'бежать', []));
    await importBackup(serializeBackup([entry('remote', 'run', 'управлять', [])]));
    expect((await listEntries())[0]!.translation).toBe('бежать');
  });
});

describe('mergeContexts', () => {
  it('deduplicates and sorts newest first', () => {
    expect(mergeContexts([ctx('A.', 1)], [ctx('B.', 3), ctx('A.', 1)]).map((c) => c.sentence)).toEqual(['B.', 'A.']);
  });
});

describe('toCsv', () => {
  it('escapes quotes, commas and newlines', () => {
    const csv = toCsv([entry('1', 'say "hi"', 'сказать, привет', [ctx('Line one\nline two', 1)])]);
    expect(csv).toBe('text,translation,sentence\n"say ""hi""","сказать, привет","Line one\nline two"\n');
  });
});
