import { t } from '@/lib/i18n';
import type { Entry } from '@/lib/types';
import type { Point } from '../ui-store';
import { Floating } from './Floating';

export function Tooltip({ at, entry }: { at: Point; entry: Entry }) {
  return (
    <Floating at={at} className="lx-tooltip">
      <div class="lx-tt-text">{entry.text}</div>
      <div class="lx-tt-translation">{entry.translation || t('dictNoTranslation')}</div>
    </Floating>
  );
}
