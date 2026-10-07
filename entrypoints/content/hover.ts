import type { Highlighter, Hit } from './highlighter';

export interface HoverOptions {
  highlighter: Highlighter;
  /** False while a card or the save button is shown. */
  canShow(): boolean;
  onEnter(hit: Hit, rect: DOMRect): void;
  onLeave(): void;
  delayMs?: number;
}

function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const position = document.caretPositionFromPoint?.(x, y);
  if (position) return { node: position.offsetNode, offset: position.offset };
  const range = document.caretRangeFromPoint?.(x, y);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

const contains = (r: DOMRect, x: number, y: number) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

export function watchHover({ highlighter, canShow, onEnter, onLeave, delayMs = 150 }: HoverOptions): {
  reset(): void;
  dispose(): void;
} {
  let current: Hit | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let frame = 0;
  let lastX = 0;
  let lastY = 0;

  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  function update(x: number, y: number) {
    if (!canShow()) return;
    const caret = highlighter.active ? caretAt(x, y) : null;
    const hit = caret ? highlighter.hitAt(caret.node, caret.offset, x, y) : null;
    if (hit === current) return;
    current = hit;
    cancel();
    if (!hit) {
      onLeave();
      return;
    }
    timer = setTimeout(() => {
      timer = null;
      if (!canShow()) return;
      const rect = [...hit.range.getClientRects()].find((r) => contains(r, x, y)) ?? hit.range.getBoundingClientRect();
      onEnter(hit, rect);
    }, delayMs);
  }

  const onMove = (e: MouseEvent) => {
    lastX = e.clientX;
    lastY = e.clientY;
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      update(lastX, lastY);
    });
  };
  document.addEventListener('mousemove', onMove, { passive: true });

  return {
    reset() {
      cancel();
      current = null;
    },
    dispose() {
      cancel();
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      document.removeEventListener('mousemove', onMove);
    },
  };
}
