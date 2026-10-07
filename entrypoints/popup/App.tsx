import { useEffect, useState } from 'preact/hooks';
import { t } from '@/lib/i18n';
import type { Message, PageInfo } from '@/lib/messages';
import { getSettings, listEntries, onEntriesChanged, onSettingsChanged, updateSettings } from '@/lib/store';
import type { Entry, Settings } from '@/lib/types';

/** Host of the active tab, or null where the content script cannot run. */
async function currentPageHost(): Promise<string | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (tab?.id == null) return null;
  try {
    const message: Message = { type: 'get-page-info' };
    const info = (await browser.tabs.sendMessage(tab.id, message)) as PageInfo | undefined;
    return info?.host ?? null;
  } catch {
    return null;
  }
}

export function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [host, setHost] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const loadEntries = () => void listEntries().then(setEntries);
    void getSettings().then(setSettings);
    loadEntries();
    void currentPageHost().then(setHost);
    const offSettings = onSettingsChanged(setSettings);
    const offEntries = onEntriesChanged(loadEntries);
    return () => {
      offSettings();
      offEntries();
    };
  }, []);

  if (!settings) return null;
  const excluded = host ? settings.excludedSites.includes(host) : false;

  function toggleSite() {
    if (!host || !settings) return;
    const sites = settings.excludedSites;
    void updateSettings({ excludedSites: excluded ? sites.filter((h) => h !== host) : [...sites, host] });
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
      {host === null && <p class="muted unavailable">{t('popupUnavailable')}</p>}

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
