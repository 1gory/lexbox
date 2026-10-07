import { beforeEach, describe, expect, it } from 'vitest';
import { Highlighter, type HighlightSink, type Scheduler } from '@/entrypoints/content/highlighter';
import { buildIndex } from '@/lib/matcher';

class FakeSink implements HighlightSink {
  ranges = new Set<Range>();
  add(range: Range) { this.ranges.add(range); }
  delete(range: Range) { return this.ranges.delete(range); }
  clear() { this.ranges.clear(); }
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
});
