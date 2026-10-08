import { entryKey, listEntries } from './store';
import { normalizeKey } from './text';
import type { Context, Entry } from './types';

export class ImportError extends Error {}

interface Backup {
  format: 'lexbox';
  version: 1;
  entries: Entry[];
}

export function serializeBackup(entries: Entry[]): string {
  const backup: Backup = { format: 'lexbox', version: 1, entries };
  return JSON.stringify(backup, null, 2);
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

function isContext(v: unknown): v is Context {
  return (
    isObject(v) &&
    typeof v.sentence === 'string' &&
    typeof v.url === 'string' &&
    typeof v.title === 'string' &&
    typeof v.addedAt === 'number'
  );
}

function isEntry(v: unknown): v is Entry {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.text === 'string' &&
    typeof v.translation === 'string' &&
    typeof v.createdAt === 'number' &&
    typeof v.updatedAt === 'number' &&
    Array.isArray(v.contexts) &&
    v.contexts.every(isContext)
  );
}

export function parseBackup(json: string): Entry[] {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new ImportError('Not a JSON file');
  }
  if (!isObject(data) || data.format !== 'lexbox' || !Array.isArray(data.entries) || !data.entries.every(isEntry)) {
    throw new ImportError('Not a Lexbox backup');
  }
  return data.entries;
}

export function mergeContexts(a: Context[], b: Context[]): Context[] {
  const seen = new Set<string>();
  const merged: Context[] = [];
  for (const c of [...a, ...b]) {
    const id = `${c.url}\n${c.sentence}`;
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(c);
  }
  return merged.sort((x, y) => y.addedAt - x.addedAt);
}

/** Merges a backup into storage by entry key. Returns the number of imported entries. */
export async function importBackup(json: string): Promise<number> {
  const incoming = parseBackup(json);
  const current = await listEntries();
  const byKey = new Map(current.map((e) => [e.key, e]));
  const usedIds = new Set(current.map((e) => e.id));
  const toWrite = new Map<string, Entry>();
  let imported = 0;

  for (const raw of incoming) {
    const key = normalizeKey(raw.text);
    if (!key) continue;
    imported++;
    const existing = byKey.get(key);
    let next: Entry;
    if (existing) {
      next = {
        ...existing,
        translation: existing.translation || raw.translation,
        contexts: mergeContexts(existing.contexts, raw.contexts),
        updatedAt: Date.now(),
      };
    } else {
      const id = raw.id && !usedIds.has(raw.id) ? raw.id : crypto.randomUUID();
      usedIds.add(id);
      next = {
        id,
        text: raw.text,
        key,
        translation: raw.translation,
        contexts: mergeContexts([], raw.contexts),
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      };
    }
    byKey.set(key, next);
    toWrite.set(entryKey(next.id), next);
  }

  await browser.storage.local.set(Object.fromEntries(toWrite));
  return imported;
}

/** A leading quote stops spreadsheets from running a cell that starts like a formula. */
const defuseFormula = (value: string): string => (/^[=+\-@\t\r]/.test(value) ? `'${value}` : value);

function csvCell(raw: string): string {
  const value = defuseFormula(raw);
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(entries: Entry[]): string {
  const rows = [
    ['text', 'translation', 'sentence'],
    ...entries.map((e) => [e.text, e.translation, e.contexts[0]?.sentence ?? '']),
  ];
  return rows.map((row) => row.map(csvCell).join(',')).join('\n') + '\n';
}
