import { extractSentence } from '@/lib/context';
import { normalizeKey } from '@/lib/text';

export const UI_TAG = 'lexbox-ui';
export const MAX_SELECTION = 100;

export const BLOCK_SELECTOR = [
  'p', 'li', 'dt', 'dd', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'td', 'th', 'caption', 'figcaption',
  'blockquote', 'pre', 'div', 'section', 'article', 'aside', 'main', 'header', 'footer', 'nav',
  'ul', 'ol', 'dl', 'table', 'tr', 'form', 'fieldset', 'details', 'summary', 'address', 'body',
].join(',');

export const SKIP_SELECTOR = [
  'script', 'style', 'noscript', 'template', 'textarea', 'input', 'select', 'svg', UI_TAG,
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

export interface TextSpan {
  node: Text;
  start: number;
  end: number;
}

/** Text that belongs to one block (nested blocks are separate BlockTexts). */
export interface BlockText {
  block: Element;
  text: string;
  spans: TextSpan[];
}

export interface SelectionInfo {
  text: string;
  sentence: string;
  rect: { left: number; top: number; right: number; bottom: number };
}

const elementOf = (node: Node): Element | null =>
  node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;

export function closestBlock(node: Node): Element | null {
  return elementOf(node)?.closest(BLOCK_SELECTOR) ?? null;
}

export function isSkipped(node: Node): boolean {
  return elementOf(node)?.closest(SKIP_SELECTOR) != null;
}

export function collectBlocks(root: Element): Map<Element, BlockText> {
  const blocks = new Map<Element, BlockText>();
  if (isSkipped(root)) return blocks;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        return (node as Element).matches(SKIP_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    const block = closestBlock(text);
    if (!block) continue;
    let bt = blocks.get(block);
    if (!bt) {
      bt = { block, text: '', spans: [] };
      blocks.set(block, bt);
    }
    bt.spans.push({ node: text, start: bt.text.length, end: bt.text.length + text.data.length });
    bt.text += text.data;
  }
  return blocks;
}

export function blockTextOf(block: Element): BlockText | null {
  return collectBlocks(block).get(block) ?? null;
}

/** Converts a DOM boundary point to an offset in bt.text. */
export function offsetOf(bt: BlockText, container: Node, offset: number): number {
  if (container.nodeType === Node.TEXT_NODE) {
    const span = bt.spans.find((s) => s.node === container);
    if (span) return span.start + offset;
  }
  const boundary = document.createRange();
  boundary.setStart(container, offset);
  for (const span of bt.spans) {
    if (boundary.comparePoint(span.node, 0) >= 0) return span.start;
  }
  return bt.text.length;
}

function locate(bt: BlockText, pos: number, isEnd: boolean): { node: Text; offset: number } {
  for (const span of bt.spans) {
    const inside = isEnd ? pos > span.start && pos <= span.end : pos >= span.start && pos < span.end;
    if (inside) return { node: span.node, offset: pos - span.start };
  }
  const last = bt.spans[bt.spans.length - 1]!;
  return { node: last.node, offset: last.end - last.start };
}

export function rangeFromOffsets(bt: BlockText, start: number, end: number): Range {
  const from = locate(bt, start, false);
  const to = locate(bt, end, true);
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  return range;
}

/** The current selection if it can be saved: 1–100 chars, one block, not editable. */
export function readSelection(selection: Selection | null): SelectionInfo | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const range = selection.getRangeAt(0);
  const text = range.toString().replace(/\s+/g, ' ').trim();
  if (!text || text.length > MAX_SELECTION || !normalizeKey(text)) return null;
  if (isSkipped(range.startContainer) || isSkipped(range.endContainer)) return null;
  const active = document.activeElement;
  if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return null;

  const block = closestBlock(range.startContainer);
  if (!block || block !== closestBlock(range.endContainer)) return null;
  const bt = blockTextOf(block);
  if (!bt) return null;

  const sentence = extractSentence(
    bt.text,
    offsetOf(bt, range.startContainer, range.startOffset),
    offsetOf(bt, range.endContainer, range.endOffset),
  );
  const rects = range.getClientRects();
  const r = rects.length > 0 ? rects[rects.length - 1]! : range.getBoundingClientRect();
  return { text, sentence, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom } };
}
