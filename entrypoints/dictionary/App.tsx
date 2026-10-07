import { useState } from 'preact/hooks';
import { t } from '@/lib/i18n';
import { SettingsTab } from './SettingsTab';
import { WordsTab } from './WordsTab';

export function App() {
  const [tab, setTab] = useState<'words' | 'settings'>('words');
  return (
    <div class="page">
      <header class="top">
        <h1>{t('dictTitle')}</h1>
        <nav>
          <button type="button" class={`tab tab-words${tab === 'words' ? ' active' : ''}`} onClick={() => setTab('words')}>
            {t('dictTabWords')}
          </button>
          <button
            type="button"
            class={`tab tab-settings${tab === 'settings' ? ' active' : ''}`}
            onClick={() => setTab('settings')}
          >
            {t('dictTabSettings')}
          </button>
        </nav>
      </header>
      {tab === 'words' ? <WordsTab /> : <SettingsTab />}
    </div>
  );
}
