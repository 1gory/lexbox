import { findMatches, type MatchIndex } from '@/lib/matcher';
import {
  BLOCK_SELECTOR, SKIP_SELECTOR, blockTextOf, closestBlock, collectBlocks, isSkipped, rangeFromOffsets, type BlockText,
} from './dom';

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

/** Nodes that carry no text for us (skipped elements, images, empty elements). */
const isInert = (node: Node): boolean => {
  if (node.nodeType === Node.TEXT_NODE) return false;
  if (node.nodeType !== Node.ELEMENT_NODE) return true;
  const el = node as Element;
  return el.matches(SKIP_SELECTOR) || !el.textContent;
};

export class Highlighter {
  private hits = new Map<Element, Hit[]>();
  private queue: BlockText[] = [];
  private pumping = false;
  private index: MatchIndex | null = null;
  private observer: MutationObserver | null = null;
  /** Blocks whose own text changed. */
  private textDirty = new Set<Node>();
  /** Added block subtrees that must be collected in full. */
  private newSubtrees = new Set<Element>();
  private needsSweep = false;
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

  /** Cheap check: is anything currently highlighted? */
  get hasHits(): boolean {
    return this.hits.size > 0;
  }

  /** (Re)highlights the whole root with the given index and watches for changes. */
  start(index: MatchIndex): void {
    this.index = index;
    // Apply replaces a block's hits, so there is no need to wipe highlights (avoids flicker).
    this.queue = [];
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
    this.resetDirty();
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
    try {
      while (this.queue.length > 0) {
        try {
          this.apply(this.queue.shift()!);
        } catch {
          // Skip a block that failed; keep the highlighter alive.
        }
        if (!hasTime()) break;
      }
    } finally {
      if (this.queue.length > 0 && this.index) {
        try {
          this.schedule((next) => this.pump(next));
        } catch {
          this.pumping = false;
        }
      } else {
        this.pumping = false;
      }
    }
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

  private resetDirty(): void {
    this.textDirty.clear();
    this.newSubtrees.clear();
    this.needsSweep = false;
  }

  private markAdded(parent: Node, node: Node): void {
    if (isInert(node)) return;
    if (node.nodeType === Node.TEXT_NODE) {
      this.textDirty.add(parent);
      return;
    }
    const el = node as Element;
    if (isBlockElement(el)) {
      this.newSubtrees.add(el);
      return;
    }
    this.textDirty.add(parent);
    for (const child of el.querySelectorAll(BLOCK_SELECTOR)) this.newSubtrees.add(child);
  }

  private onMutations(records: MutationRecord[]): void {
    let changed = false;
    for (const record of records) {
      if (isSkipped(record.target)) continue;
      if (record.type === 'characterData') {
        this.textDirty.add(record.target);
        changed = true;
        continue;
      }
      for (const node of record.addedNodes) {
        if (isInert(node)) continue;
        this.markAdded(record.target, node);
        changed = true;
      }
      for (const node of record.removedNodes) {
        if (isInert(node)) continue;
        if (isBlockElement(node)) this.needsSweep = true;
        else this.textDirty.add(record.target);
        changed = true;
      }
    }
    if (!changed || this.flushTimer) return;
    // Throttle: the pending flush picks up everything accumulated meanwhile.
    this.flushTimer = setTimeout(() => this.flush(), this.debounceMs);
  }

  private flush(): void {
    this.flushTimer = null;
    const textDirty = [...this.textDirty];
    const subtrees = [...this.newSubtrees];
    this.resetDirty();
    if (!this.index) return;

    for (const block of [...this.hits.keys()]) if (!block.isConnected) this.removeHits(block);

    const live = subtrees.filter((el) => el.isConnected);
    const topmost = live.filter((el) => !live.some((other) => other !== el && other.contains(el)));
    const blocks: BlockText[] = [];
    for (const root of topmost) {
      for (const block of [...this.hits.keys()]) if (root.contains(block)) this.removeHits(block);
      blocks.push(...collectBlocks(root).values());
    }

    const own = new Set<Element>();
    for (const node of textDirty) {
      if (!node.isConnected) continue;
      const block = closestBlock(node);
      if (block && !topmost.some((root) => root.contains(block))) own.add(block);
    }
    for (const block of own) {
      const bt = blockTextOf(block);
      if (bt) blocks.push(bt);
      else this.removeHits(block);
    }
    this.enqueue(blocks);
  }
}
