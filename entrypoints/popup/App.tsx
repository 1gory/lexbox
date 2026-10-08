import { useEffect, useState } from 'preact/hooks';
import { isContentScriptUrl, isExcludedHost } from '@/lib/host';
import { t } from '@/lib/i18n';
import type { Message, PageInfo } from '@/lib/messages';
import { getSettings, listEntries, onEntriesChanged, onSettingsChanged, updateSettings } from '@/lib/store';
import type { Entry, Settings } from '@/lib/types';

type PageState =
  /** The content script answered; `host` is empty on file pages. */
  | { kind: 'ready'; host: string }
  /** A web page opened before Lexbox was installed or updated: no content script until it reloads. */
  | { kind: 'reload' }
  /** A page the content script cannot run on (browser pages, the store, other extensions). */
  | { kind: 'unavailable' };

async function activePage(): Promise<PageState> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) return { kind: 'unavailable' };
  try {
    const message: Message = { type: 'get-page-info' };
    const info = (await browser.tabs.sendMessage(tab.id, message)) as PageInfo | undefined;
    if (info) return { kind: 'ready', host: info.host };
  } catch {
    // No content script in the tab.
  }
  // Chrome exposes tab.url only with the "tabs" permission or an explicit host permission; the
  // content-script matches do not count. Without it the url is undefined and we say "unavailable".
  return isContentScriptUrl(tab.url) ? { kind: 'reload' } : { kind: 'unavailable' };
}

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [page, setPage] = useState<PageState | null>(null);

  useEffect(() => {
    const loadEntries = () => void listEntries().then(setEntries);
    void getSettings().then(setSettings);
    loadEntries();
    void activePage().then(setPage);
    const offSettings = onSettingsChanged(setSettings);
    const offEntries = onEntriesChanged(loadEntries);
    return () => {
      offSettings();
      offEntries();
    };
  }, []);

  if (!settings) return null;
  const host = page?.kind === 'ready' ? page.host : null;
  const excluded = host ? isExcludedHost(host, settings.excludedSites) : false;

  function toggleSite() {
    if (!host || !settings) return;
    const sites = settings.excludedSites;
    // Turning it back on removes every entry covering this host, "example.com" for "www.example.com" too.
    void updateSettings({
      excludedSites: excluded ? sites.filter((site) => !isExcludedHost(host, [site])) : [...sites, host],
    });
  }

  function openDictionary() {
    void browser.tabs.create({ url: browser.runtime.getURL('/dictionary.html') });
    window.close();
  }

  return (
    <main class="popup">
      <header>
        <strong>Lexbox</strong>
        <span class="count">{t('popupWordCount', String(entries.length))}</span>
      </header>

      <label class="row">
        <input
          class="highlight-toggle"
          type="checkbox"
          checked={settings.highlightEnabled}
          onChange={(e) => void updateSettings({ highlightEnabled: e.currentTarget.checked })}
        />
        {t('popupHighlight')}
      </label>

      {host && (
        <label class="row">
          <input class="site-toggle" type="checkbox" checked={excluded} onChange={toggleSite} />
          {t('popupDisableSite')} <span class="host">{host}</span>
        </label>
      )}
      {page?.kind === 'reload' && <p class="muted reload-hint">{t('popupReload')}</p>}
      {page?.kind === 'unavailable' && <p class="muted unavailable">{t('popupUnavailable')}</p>}

      {entries.length === 0 ? (
        <p class="muted">{t('popupEmpty')}</p>
      ) : (
        <ul class="recent">
          {entries.slice(0, 5).map((e) => (
            <li key={e.id}>
              <span class="word">{e.text}</span>
              <span class="translation">{e.translation || '—'}</span>
            </li>
          ))}
        </ul>
      )}

      <button type="button" class="open-dictionary" onClick={openDictionary}>
        {t('popupOpenDictionary')}
      </button>
    </main>
  );
}
