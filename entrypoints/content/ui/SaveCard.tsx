import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '@/lib/i18n';
import { saveEntry } from '@/lib/store';
import { normalizeKey } from '@/lib/text';
import { translate } from '@/lib/translator';
import type { Entry } from '@/lib/types';
import type { SelectionInfo } from '../dom';
import type { Point } from '../ui-store';
import { Floating } from './Floating';

type Status = 'idle' | 'translating' | 'downloading' | 'needs-download' | 'manual';

/** Runs `action` for real user input only, not for clicks a page script dispatches. */
const trusted = (action: () => void) => (e: Event) => {
  if (e.isTrusted) action();
};

interface Props {
  at: Point;
  selection: SelectionInfo;
  existing: Entry | null;
  onClose: () => void;
}

export function SaveCard({ at, selection, existing, onClose }: Props) {
  // The entry the card adds a context to; null when it creates a new one.
  const [entry, setEntry] = useState(existing);
  const [separate, setSeparate] = useState(false);
  const [text, setText] = useState(existing?.text ?? selection.text);
  const [translation, setTranslation] = useState(existing?.translation ?? '');
  const [status, setStatus] = useState<Status>(existing ? 'idle' : 'translating');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const edited = useRef(false);
  const mounted = useRef(true);
  const translationRef = useRef<HTMLInputElement>(null);
  // Another form of the selection is in the dictionary ("find" for "found"): offer a separate entry.
  const otherForm = entry !== null && entry.key !== normalizeKey(selection.text);

  function runTranslation() {
    setStatus('translating');
    void translate(selection.text, () => mounted.current && setStatus('downloading')).then((result) => {
      if (!mounted.current) return;
      if (result.status === 'ok') {
        if (!edited.current) setTranslation(result.text);
        setStatus('idle');
      } else {
        setStatus(result.status === 'needs-download' ? 'needs-download' : 'manual');
      }
    });
  }

  useEffect(() => {
    translationRef.current?.focus();
    if (!existing) runTranslation();
    return () => {
      mounted.current = false;
    };
  }, []);

  function saveSeparately() {
    setEntry(null);
    setSeparate(true);
    setText(selection.text);
    setTranslation('');
    edited.current = false;
    translationRef.current?.focus();
    runTranslation();
  }

  async function save() {
    if (saving || !normalizeKey(text)) return;
    setSaving(true);
    setFailed(false);
    try {
      await saveEntry(
        {
          text,
          translation,
          context: { sentence: selection.sentence, url: location.href, title: document.title, addedAt: Date.now() },
        },
        { separate },
      );
      onClose();
    } catch (error) {
      console.error('[lexbox] save failed', error);
      setFailed(true);
      setSaving(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (!e.isTrusted) return;
    if (e.key === 'Enter') {
      if (!(e.target instanceof HTMLInputElement) || e.isComposing) return;
      e.preventDefault();
      void save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  return (
    <Floating at={at} className="lx-card">
      <div onKeyDown={onKeyDown}>
        <input class="lx-text" value={text} onInput={(e) => setText(e.currentTarget.value)} />
        <input
          ref={translationRef}
          class="lx-translation"
          value={translation}
          placeholder={status === 'translating' ? t('cardTranslating') : t('cardTranslationPlaceholder')}
          onInput={(e) => {
            edited.current = true;
            setTranslation(e.currentTarget.value);
          }}
        />
        {status === 'downloading' && <div class="lx-hint">{t('cardDownloading')}</div>}
        {status === 'manual' && <div class="lx-hint">{t('cardEnterManually')}</div>}
        {status === 'needs-download' && (
          // Opened by the shortcut or the context menu there is no user activation to start the
          // language-pack download with; this click provides it. Typing a translation still works.
          <button type="button" class="lx-download" onClick={trusted(runTranslation)}>
            {t('cardDownloadTranslator')}
          </button>
        )}
        {entry && <div class="lx-hint lx-existing">{t('cardInDictionary', String(entry.contexts.length))}</div>}
        {otherForm && (
          <button type="button" class="lx-separate" onClick={trusted(saveSeparately)}>
            {t('cardSaveSeparate')}
          </button>
        )}
        {failed && <div class="lx-hint lx-error">{t('cardSaveFailed')}</div>}
        {selection.sentence && <div class="lx-sentence">{selection.sentence}</div>}
        <div class="lx-actions">
          <button type="button" class="lx-cancel" onClick={trusted(onClose)}>
            {t('cardCancel')}
          </button>
          <button type="button" class="lx-save" disabled={saving} onClick={trusted(() => void save())}>
            {entry ? t('cardAddContext') : t('cardSave')}
          </button>
        </div>
      </div>
    </Floating>
  );
}
