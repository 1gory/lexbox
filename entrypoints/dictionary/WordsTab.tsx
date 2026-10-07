import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '@/lib/i18n';
import { listEntries, onEntriesChanged } from '@/lib/store';
import { importBackup, serializeBackup, toCsv } from '@/lib/store-io';
import type { Entry } from '@/lib/types';
import { downloadText, today } from './download';
import { EntryRow } from './EntryRow';

type Notice = { kind: 'ok' | 'error'; text: string } | null;

export function WordsTab() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<Notice>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = () => void listEntries().then(setEntries);
    load();
    return onEntriesChanged(load);
  }, []);

  if (!entries) return null;

  const q = query.trim().toLowerCase();
  const visible = q
    ? entries.filter((e) => e.text.toLowerCase().includes(q) || e.translation.toLowerCase().includes(q))
    : entries;

  async function onImport(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      const count = await importBackup(await file.text());
      setNotice({ kind: 'ok', text: t('dictImported', String(count)) });
    } catch {
      setNotice({ kind: 'error', text: t('dictImportFailed') });
    }
  }

  return (
    <section>
      <div class="toolbar">
        <input
          class="search"
          type="search"
          placeholder={t('dictSearch')}
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
        />
        <button
          type="button"
          class="export-json"
          onClick={() => downloadText(`lexbox-${today()}.json`, serializeBackup(entries), 'application/json')}
        >
          {t('dictExportJson')}
        </button>
        <button type="button" class="import-json" onClick={() => fileRef.current?.click()}>
          {t('dictImportJson')}
        </button>
        <button
          type="button"
          class="export-csv"
          onClick={() => downloadText(`lexbox-${today()}.csv`, toCsv(entries), 'text/csv')}
        >
          {t('dictExportCsv')}
        </button>
        <input
          ref={fileRef}
          class="hidden"
          type="file"
          accept="application/json,.json"
          data-testid="import-input"
          onChange={(e) => void onImport(e)}
        />
      </div>

      {notice && <p class={`message ${notice.kind}`}>{notice.text}</p>}

      {visible.length === 0 ? (
        <p class="muted">{entries.length > 0 ? t('dictNothingFound') : t('popupEmpty')}</p>
      ) : (
        <ul class="entries">
          {visible.map((e) => (
            <EntryRow key={e.id} entry={e} />
          ))}
        </ul>
      )}
    </section>
  );
}
