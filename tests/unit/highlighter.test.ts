import { beforeEach, describe, expect, it } from 'vitest';
import { Highlighter, type HighlightSink, type Scheduler } from '@/entrypoints/content/highlighter';
import { buildIndex } from '@/lib/matcher';

class FakeSink implements HighlightSink {
  ranges = new Set<Range>();
  deletes = 0;
  clears = 0;
  failNextAdd = false;
  add(range: Range) {
    if (this.failNextAdd) {
      this.failNextAdd = false;
      throw new Error('boom');
    }
    this.ranges.add(range);
  }
  delete(range: Range) { this.deletes++; return this.ranges.delete(range); }
  clear() { this.clears++; this.ranges.clear(); }
  texts() { return [...this.ranges].map((r) => r.toString()).sort(); }
}

const sync: Scheduler = (task) => task(() => true);
const tick = (ms = 30) => new Promise((resolve) => setTimeout(resolve, ms));
const index = buildIndex([
  { id: 'run', key: 'run' },
  { id: 'puw', key: 'put up with' },
]);

let sink: FakeSink;

beforeEach(() => {
  document.body.innerHTML = `
    <p id="a">He was running. She was <em>putting up</em> with it.</p>
    <ul><li>Item ran<ul><li>Nested run</li></ul></li></ul>
    <script>run()</script>
    <div contenteditable="true">run here</div>`;
  sink = new FakeSink();
});

describe('Highlighter', () => {
  it('highlights forms and phrases across inline tags, skipping ignored elements', () => {
    new Highlighter(document.body, sink, sync, 0).start(index);
    expect(sink.texts()).toEqual(['putting up with', 'ran', 'run', 'running']);
  });

  it('reports hasHits only while something is highlighted', () => {
    const h = new Highlighter(document.body, sink, sync, 0);
    expect(h.hasHits).toBe(false);
    h.start(index);
    expect(h.hasHits).toBe(true);
    h.start(buildIndex([{ id: 'zzz', key: 'zzz' }]));
    expect(h.hasHits).toBe(false);
    h.start(index);
    h.stop();
    expect(h.hasHits).toBe(false);
  });

  it('restarts with a new index and stops cleanly', () => {
    const h = new Highlighter(document.body, sink, sync, 0);
    h.start(index);
    h.start(buildIndex([{ id: 'item', key: 'item' }]));
    expect(sink.texts()).toEqual(['Item']);
    h.stop();
    expect(sink.ranges.size).toBe(0);
    expect(h.active).toBe(false);
  });

  it('processes one block per tick when there is no idle time', () => {
    const tasks: Array<(hasTime: () => boolean) => void> = [];
    const manual: Scheduler = (task) => { tasks.push(task); };
    new Highlighter(document.body, sink, manual, 0).start(index);
    expect(sink.ranges.size).toBe(0);
    while (tasks.length) tasks.shift()!(() => false);
    expect(sink.texts()).toEqual(['putting up with', 'ran', 'run', 'running']);
  });

  it('highlights added content', async () => {
    new Highlighter(document.body, sink, sync, 0).start(index);
    document.body.insertAdjacentHTML('beforeend', '<p>They ran home.</p>');
    await tick();
    expect(sink.texts()).toEqual(['putting up with', 'ran', 'ran', 'run', 'running']);
  });

  it('updates highlights when text changes', async () => {
    new Highlighter(document.body, sink, sync, 0).start(index);
    (document.getElementById('a')!.firstChild as Text).data = 'He was walking. She was ';
    await tick();
    expect(sink.texts()).toEqual(['putting up with', 'ran', 'run']);
  });

  it('drops highlights of removed blocks', async () => {
    new Highlighter(document.body, sink, sync, 0).start(index);
    document.querySelector('ul')!.remove();
    await tick();
    expect(sink.texts()).toEqual(['putting up with', 'running']);
  });

  it('ignores script and image nodes appended to body', async () => {
    new Highlighter(document.body, sink, sync, 0).start(index);
    const before = sink.texts();
    document.body.insertAdjacentHTML('beforeend', '<script>x</script><img>');
    await tick();
    expect(sink.deletes).toBe(0);
    expect(sink.texts()).toEqual(before);
  });

  it('only refreshes the paragraph whose text changed', async () => {
    new Highlighter(document.body, sink, sync, 0).start(index);
    (document.getElementById('a')!.firstChild as Text).data = 'He was walking. She was ';
    await tick();
    expect(sink.deletes).toBe(2); // the paragraph had two hits
    expect(sink.texts()).toEqual(['putting up with', 'ran', 'run']);
  });

  it('flushes under continuous mutations (max-wait, not endless debounce)', async () => {
    new Highlighter(document.body, sink, sync, 30).start(index);
    const text = document.querySelector('li li')!.firstChild as Text;
    let n = 0;
    const timer = setInterval(() => { text.data = `Nested run ${n++}`; }, 5);
    document.body.insertAdjacentHTML('beforeend', '<p>They ran home.</p>');
    await tick(150);
    clearInterval(timer);
    expect(sink.texts()).toContain('ran');
    expect(sink.texts().filter((t) => t === 'ran')).toHaveLength(2);
  });

  it('keeps highlighting later blocks when the sink throws once', () => {
    sink.failNextAdd = true;
    new Highlighter(document.body, sink, sync, 0).start(index);
    expect(sink.texts()).toEqual(expect.arrayContaining(['ran', 'run']));
  });

  it('does not clear the sink when restarting with a new index', () => {
    const h = new Highlighter(document.body, sink, sync, 0);
    h.start(index);
    const clears = sink.clears;
    h.start(buildIndex([{ id: 'item', key: 'item' }]));
    expect(sink.clears).toBe(clears);
    expect(sink.texts()).toEqual(['Item']);
  });
});
