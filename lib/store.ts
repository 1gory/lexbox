import { buildIndex, matchWhole } from './matcher';
import { normalizeKey } from './text';
import { DEFAULT_SETTINGS, type Context, type Entry, type EntryDraft, type Settings } from './types';

export const ENTRY_PREFIX = 'entry:';
const SETTINGS_KEY = 'settings';

export const entryKey = (id: string): string => ENTRY_PREFIX + id;

type ChangeListener = Parameters<typeof browser.storage.onChanged.addListener>[0];

export async function listEntries(): Promise<Entry[]> {
  const all = await browser.storage.local.get(null);
  return Object.entries(all)
    .filter(([key]) => key.startsWith(ENTRY_PREFIX))
    .map(([, value]) => value as Entry)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function putEntry(entry: Entry): Promise<void> {
  await browser.storage.local.set({ [entryKey(entry.id)]: entry });
}

/** The entry `text` is a form of ("running" finds "run"). */
export function findInList(entries: Entry[], text: string): Entry | null {
  const id = matchWhole(buildIndex(entries), text);
  return id ? (entries.find((e) => e.id === id) ?? null) : null;
}

export function addContext(contexts: Context[], context: Context | null): Context[] {
  if (!context) return contexts;
  if (contexts.some((c) => c.url === context.url && c.sentence === context.sentence)) return contexts;
  return [context, ...contexts];
}

/** Creates an entry, or adds the context to the entry the text is a form of. */
export async function saveEntry(draft: EntryDraft): Promise<Entry> {
  const key = normalizeKey(draft.text);
  if (!key) throw new Error('Nothing to save: the text has no words');
  const now = Date.now();
  const translation = draft.translation.trim();

  const existing = findInList(await listEntries(), draft.text);
  if (existing) {
    const updated: Entry = {
      ...existing,
      translation: translation || existing.translation,
      contexts: addContext(existing.contexts, draft.context),
      updatedAt: now,
    };
    await putEntry(updated);
    return updated;
  }

  const entry: Entry = {
    id: crypto.randomUUID(),
    text: draft.text.replace(/\s+/g, ' ').trim(),
    key,
    translation,
    contexts: draft.context ? [draft.context] : [],
    createdAt: now,
    updatedAt: now,
  };
  await putEntry(entry);
  return entry;
}

export async function updateTranslation(id: string, translation: string): Promise<void> {
  const stored = await browser.storage.local.get(entryKey(id));
  const entry = stored[entryKey(id)] as Entry | undefined;
  if (!entry) return;
  await putEntry({ ...entry, translation: translation.trim(), updatedAt: Date.now() });
}

export async function removeEntry(id: string): Promise<void> {
  await browser.storage.local.remove(entryKey(id));
}

const withDefaults = (value: unknown): Settings => ({ ...DEFAULT_SETTINGS, ...(value as Partial<Settings> | undefined) });

export async function getSettings(): Promise<Settings> {
  const stored = await browser.storage.local.get(SETTINGS_KEY);
  return withDefaults(stored[SETTINGS_KEY]);
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await browser.storage.local.set({ [SETTINGS_KEY]: next });
  return next;
}

export function onEntriesChanged(cb: () => void): () => void {
  const listener: ChangeListener = (changes, area) => {
    if (area === 'local' && Object.keys(changes).some((k) => k.startsWith(ENTRY_PREFIX))) cb();
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}

export function onSettingsChanged(cb: (settings: Settings) => void): () => void {
  const listener: ChangeListener = (changes, area) => {
    const change = changes[SETTINGS_KEY];
    if (area === 'local' && change) cb(withDefaults(change.newValue));
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
