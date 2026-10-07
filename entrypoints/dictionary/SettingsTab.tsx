import { useEffect, useState } from 'preact/hooks';
import { normalizeHost } from '@/lib/host';
import { t } from '@/lib/i18n';
import { getSettings, onSettingsChanged, updateSettings } from '@/lib/store';
import type { Settings } from '@/lib/types';

export function SettingsTab() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [site, setSite] = useState('');

  useEffect(() => {
    void getSettings().then(setSettings);
    return onSettingsChanged(setSettings);
  }, []);

  if (!settings) return null;
  const sites = settings.excludedSites;

  function addSite(e: Event) {
    e.preventDefault();
    const host = normalizeHost(site);
    if (!host) return;
    if (!sites.includes(host)) void updateSettings({ excludedSites: [...sites, host] });
    setSite('');
  }

  return (
    <section class="settings">
      <label class="row">
        <input
          class="floating-toggle"
          type="checkbox"
          checked={settings.floatingButton}
          onChange={(e) => void updateSettings({ floatingButton: e.currentTarget.checked })}
        />
        {t('settingsFloatingButton')}
      </label>
      <p class="muted">{t('settingsShortcut')}</p>

      <h2>{t('settingsExcludedSites')}</h2>
      {sites.length === 0 ? (
        <p class="muted">{t('settingsNoExcludedSites')}</p>
      ) : (
        <ul class="sites">
          {sites.map((host) => (
            <li key={host}>
              <span>{host}</span>
              <button
                type="button"
                class="link remove-site"
                onClick={() => void updateSettings({ excludedSites: sites.filter((h) => h !== host) })}
              >
                {t('settingsRemoveSite')}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form class="add-site-form" onSubmit={addSite}>
        <input
          class="site-input"
          value={site}
          placeholder={t('settingsSitePlaceholder')}
          onInput={(e) => setSite(e.currentTarget.value)}
        />
        <button type="submit" class="add-site">
          {t('settingsAddSite')}
        </button>
      </form>
    </section>
  );
}
