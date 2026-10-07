import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { t } from '@/lib/i18n';
import { buildIndex, findMatches } from '@/lib/matcher';
import { removeEntry, updateTranslation } from '@/lib/store';
import type { Entry } from '@/lib/types';

/** Context sentence with the saved expression marked. */
function Sentence({ entry, sentence }: { entry: Entry; sentence: string }) {
  const parts: ComponentChildren[] = [];
  let pos = 0;
  for (const m of findMatches(buildIndex([entry]), sentence)) {
    parts.push(sentence.slice(pos, m.start), <mark key={m.start}>{sentence.slice(m.start, m.end)}</mark>);
    pos = m.end;
  }
  parts.push(sentence.slice(pos));
  return <q class="sentence">{parts}</q>;
}

export function EntryRow({ entry }: { entry: Entry }) {
  const [value, setValue] = useState(entry.translation);
  const [open, setOpen] = useState(false);

  useEffect(() => setValue(entry.translation), [entry.translation]);

  function commit() {
    if (value.trim() !== entry.translation) void updateTranslation(entry.id, value);
  }

  function remove() {
    if (confirm(t('dictConfirmDelete', entry.text))) void removeEntry(entry.id);
  }

  return (
    <li class="entry">
      <div class="entry-main">
        <span class="entry-text">{entry.text}</span>
        <input
          class={`entry-translation${entry.translation ? '' : ' empty'}`}
          value={value}
          placeholder={t('dictNoTranslation')}
          onInput={(e) => setValue(e.currentTarget.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
        <button type="button" class="link toggle-contexts" onClick={() => setOpen(!open)}>
          {t('dictContexts', String(entry.contexts.length))}
        </button>
        <button type="button" class="link danger delete" onClick={remove}>
          {t('dictDelete')}
        </button>
      </div>
      {open && (
        <ul class="contexts">
          {entry.contexts.map((c) => (
            <li key={`${c.url}\n${c.sentence}`}>
              <Sentence entry={entry} sentence={c.sentence} />
              <a href={c.url} target="_blank" rel="noreferrer">
                {c.title || c.url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
