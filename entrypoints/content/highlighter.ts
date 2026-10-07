import { findMatches, type MatchIndex } from '@/lib/matcher';
import { BLOCK_SELECTOR, closestBlock, collectBlocks, isSkipped, rangeFromOffsets, type BlockText } from './dom';

/** What we need from a CSS Highlight; the native `Highlight` satisfies it. */
export interface HighlightSink {
  add(range: Range): unknown;
  delete(range: Range): unknown;
  clear(): void;
}

export interface Hit {
  range: Range;
  entryId: string;
}

export type Scheduler = (task: (hasTime: () => boolean) => void) => void;

export const idleScheduler: Scheduler = (task) =>
  requestIdleCallback((deadline) => task(() => deadline.timeRemaining() > 2), { timeout: 500 });

const isBlockElement = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE && (node as Element).matches(BLOCK_SELECTOR);

export class Highlighter {
  private hits = new Map<Element, Hit[]>();
  private queue: BlockText[] = [];
  private pumping = false;
  private index: MatchIndex | null = null;
  private observer: MutationObserver | null = null;
  private dirty = new Set<Node>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly root: Element,
    private readonly sink: HighlightSink,
    private readonly schedule: Scheduler = idleScheduler,
    private readonly debounceMs = 300,
  ) {}

  get active(): boolean {
    return this.index !== null;
  }

  /** (Re)highlights the whole root with the given index and watches for changes. */
  start(index: MatchIndex): void {
    this.index = index;
    this.clearAll();
    if (!this.observer) {
      this.observer = new MutationObserver((records) => this.onMutations(records));
      this.observer.observe(this.root, { childList: true, characterData: true, subtree: true });
    }
    this.enqueue([...collectBlocks(this.root).values()]);
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = null;
    this.dirty.clear();
    this.index = null;
    this.clearAll();
  }

  /** The highlighted match under the caret position, if the pointer is really over it. */
  hitAt(node: Node, offset: number, x: number, y: number): Hit | null {
    const block = closestBlock(node);
    if (!block) return null;
    for (const hit of this.hits.get(block) ?? []) {
      if (!hit.range.isPointInRange(node, offset)) continue;
      for (const r of hit.range.getClientRects()) {
        if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return hit;
      }
    }
    return null;
  }

  private clearAll(): void {
    this.sink.clear();
    this.hits.clear();
    this.queue = [];
  }

  private enqueue(blocks: BlockText[]): void {
    this.queue.push(...blocks);
    if (this.pumping || this.queue.length === 0) return;
    this.pumping = true;
    this.schedule((hasTime) => this.pump(hasTime));
  }

  private pump(hasTime: () => boolean): void {
    if (this.queue.length > 0) {
      do this.apply(this.queue.shift()!);
      while (this.queue.length > 0 && hasTime());
    }
    if (this.queue.length > 0 && this.index) this.schedule((next) => this.pump(next));
    else this.pumping = false;
  }

  private apply(bt: BlockText): void {
    if (!this.index || !bt.block.isConnected) return;
    // Text changed after collection: the pending mutation will re-enqueue this block.
    if (bt.spans.some((s) => !s.node.isConnected || s.node.data.length !== s.end - s.start)) return;
    this.removeHits(bt.block);
    const matches = findMatches(this.index, bt.text);
    if (matches.length === 0) return;
    const hits = matches.map((m) => ({ range: rangeFromOffsets(bt, m.start, m.end), entryId: m.entryId }));
    for (const hit of hits) this.sink.add(hit.range);
    this.hits.set(bt.block, hits);
  }

  private removeHits(block: Element): void {
    const old = this.hits.get(block);
    if (!old) return;
    for (const hit of old) this.sink.delete(hit.range);
    this.hits.delete(block);
  }

  private onMutations(records: MutationRecord[]): void {
    let removed = false;
    for (const record of records) {
      if (isSkipped(record.target)) continue;
      if (record.removedNodes.length > 0) removed = true;
      if (record.type === 'characterData') {
        this.dirty.add(record.target);
        continue;
      }
      for (const node of record.addedNodes) this.dirty.add(isBlockElement(node) ? node : record.target);
      // Removed blocks are cleaned up by the isConnected check; removed inline content changes the parent's text.
      if ([...record.removedNodes].some((node) => !isBlockElement(node))) this.dirty.add(record.target);
    }
    if (this.dirty.size === 0 && !removed) return;
    if (this.flushTimer) clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => this.flush(), this.debounceMs);
  }

  private flush(): void {
    this.flushTimer = null;
    if (!this.index) {
      this.dirty.clear();
      return;
    }
    const roots = new Set<Element>();
    for (const node of this.dirty) {
      if (!node.isConnected) continue;
      const block = closestBlock(node);
      if (block) roots.add(block);
    }
    this.dirty.clear();

    for (const block of [...this.hits.keys()]) if (!block.isConnected) this.removeHits(block);

    const all = [...roots];
    const topmost = all.filter((b) => !all.some((other) => other !== b && other.contains(b)));
    const blocks: BlockText[] = [];
    for (const root of topmost) {
      for (const block of [...this.hits.keys()]) if (root.contains(block)) this.removeHits(block);
      blocks.push(...collectBlocks(root).values());
    }
    this.enqueue(blocks);
  }
}
