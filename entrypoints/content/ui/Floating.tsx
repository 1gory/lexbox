import type { ComponentChildren } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Point } from '../ui-store';

const MARGIN = 8;

/** Fixed-position box at `at`, kept inside the viewport (flips above when there is no room below). */
export function Floating({ at, className, children }: { at: Point; className: string; children: ComponentChildren }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(at);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const x = Math.max(MARGIN, Math.min(at.x, window.innerWidth - width - MARGIN));
    const y = at.y + height + MARGIN > window.innerHeight ? Math.max(MARGIN, at.y - height - 32) : at.y;
    setPos({ x, y });
  }, [at.x, at.y]);

  return (
    <div ref={ref} class={className} style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
      {children}
    </div>
  );
}
