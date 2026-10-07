import { useEffect, useRef, useState } from 'preact/hooks';
import { t } from '@/lib/i18n';
import { saveEntry } from '@/lib/store';
import { normalizeKey } from '@/lib/text';
import { translate } from '@/lib/translator';
import type { Entry } from '@/lib/types';
import type { SelectionInfo } from '../dom';
import type { Point } from '../ui-store';
import { Floating } from './Floating';

type Status = 'idle' | 'translating' | 'downloading' | 'manual';

interface Props {
  at: Point;
  selection: SelectionInfo;
  existing: Entry | null;
  onClose: () => void;
}

export function SaveCard({ at, selection, existing, onClose }: Props) {
  const [text, setText] = useState(existing?.text ?? selection.text);
  const [translation, setTranslation] = useState(existing?.translation ?? '');
  const [status, setStatus] = useState<Status>(existing ? 'idle' : 'translating');
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const edited = useRef(false);
  const translationRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    translationRef.current?.focus();
    if (existing) return;
    let cancelled = false;
    void translate(selection.text, () => !cancelled && setStatus('downloading')).then((result) => {
      if (cancelled) return;
      if (result.status === 'ok') {
        if (!edited.current) setTranslation(result.text);
        setStatus('idle');
      } else {
        setStatus('manual');
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    if (saving || !normalizeKey(text)) return;
    setSaving(true);
    setFailed(false);
    try {
      await saveEntry({
        text,
        translation,
        context: { sentence: selection.sentence, url: location.href, title: document.title, addedAt: Date.now() },
      });
      onClose();
    } catch (error) {
      console.error('[lexbox] save failed', error);
      setFailed(true);
      setSaving(false);
    }
  }

  function onKeyDown(e: KeyboardEvent) {
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
        {existing && <div class="lx-hint lx-existing">{t('cardInDictionary', String(existing.contexts.length))}</div>}
        {failed && <div class="lx-hint lx-error">{t('cardSaveFailed')}</div>}
        {selection.sentence && <div class="lx-sentence">{selection.sentence}</div>}
        <div class="lx-actions">
          <button type="button" class="lx-cancel" onClick={onClose}>
            {t('cardCancel')}
          </button>
          <button type="button" class="lx-save" disabled={saving} onClick={() => void save()}>
            {existing ? t('cardAddContext') : t('cardSave')}
          </button>
        </div>
      </div>
    </Floating>
  );
}
