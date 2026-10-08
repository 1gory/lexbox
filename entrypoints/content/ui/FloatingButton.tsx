import { t } from '@/lib/i18n';
import type { Point } from '../ui-store';

export function FloatingButton({ at, onClick }: { at: Point; onClick: () => void }) {
  return (
    <button
      type="button"
      class="lx-fab"
      title={t('buttonSaveTitle')}
      aria-label={t('buttonSaveTitle')}
      style={{ left: `${at.x}px`, top: `${at.y}px` }}
      // Keep the page selection alive while clicking.
      onMouseDown={(e) => e.preventDefault()}
      onClick={(e) => e.isTrusted && onClick()}
    >
      +
    </button>
  );
}
