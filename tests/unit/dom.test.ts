import { beforeEach, describe, expect, it } from 'vitest';
import {
  blockTextOf,
  collectBlocks,
  offsetOf,
  rangeFromOffsets,
  readSelection,
} from '@/entrypoints/content/dom';

beforeEach(() => {
  document.body.innerHTML = `
    <p id="p">She was <em>putting up</em> with it. Then she left.</p>
    <ul><li id="outer">Item one<ul><li id="inner">Nested item</li></ul></li></ul>
    <div id="mixed">Loose text<script>var run = 1;</script><div contenteditable="true">editable</div></div>
    <lexbox-ui>ui text</lexbox-ui>`;
});

const select = (startNode: Node, startOffset: number, endNode: Node, endOffset: number) => {
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  return selection;
};

describe('collectBlocks', () => {
  it('assigns each text node to its nearest block and skips ignored elements', () => {
    const texts = [...collectBlocks(document.body).values()].map((b) => [b.block.id, b.text.trim()]);
    expect(texts).toContainEqual(['p', 'She was putting up with it. Then she left.']);
    expect(texts).toContainEqual(['outer', 'Item one']);
    expect(texts).toContainEqual(['inner', 'Nested item']);
    expect(texts).toContainEqual(['mixed', 'Loose text']);
    expect(texts.flat().join(' ')).not.toMatch(/var run|editable|ui text/);
  });
});

describe('ranges and offsets', () => {
  it('builds a range across inline elements', () => {
    const bt = blockTextOf(document.getElementById('p')!)!;
    const start = bt.text.indexOf('putting');
    const range = rangeFromOffsets(bt, start, start + 'putting up with'.length);
    expect(range.toString()).toBe('putting up with');
  });

  it('maps text and element boundaries to block offsets', () => {
    const p = document.getElementById('p')!;
    const bt = blockTextOf(p)!;
    const emText = p.querySelector('em')!.firstChild!;
    expect(offsetOf(bt, emText, 3)).toBe('She was put'.length);
    expect(offsetOf(bt, p, 1)).toBe('She was '.length);
  });
});

describe('readSelection', () => {
  it('returns the text and its sentence', () => {
    const p = document.getElementById('p')!;
    const em = p.querySelector('em')!.firstChild!;
    const after = em.parentNode!.nextSibling!;
    const info = readSelection(select(em, 0, after, ' with'.length));
    expect(info).toMatchObject({ text: 'putting up with', sentence: 'She was putting up with it.' });
  });

  it('rejects selections spanning two blocks', () => {
    const outer = document.getElementById('outer')!.firstChild!;
    const inner = document.getElementById('inner')!.firstChild!;
    expect(readSelection(select(outer, 0, inner, 6))).toBeNull();
  });

  it('rejects selections without words or longer than 100 characters', () => {
    document.body.innerHTML = `<p id="n">123 456</p><p id="l">${'word '.repeat(30)}</p>`;
    const n = document.getElementById('n')!.firstChild!;
    const l = document.getElementById('l')!.firstChild!;
    expect(readSelection(select(n, 0, n, 7))).toBeNull();
    expect(readSelection(select(l, 0, l, 140))).toBeNull();
  });

  it('rejects selections inside editable content', () => {
    const editable = document.querySelector('[contenteditable]')!.firstChild!;
    expect(readSelection(select(editable, 0, editable, 8))).toBeNull();
  });

  it('returns null for an empty selection', () => {
    window.getSelection()!.removeAllRanges();
    expect(readSelection(window.getSelection())).toBeNull();
  });
});
