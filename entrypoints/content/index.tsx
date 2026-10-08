import { render } from 'preact';
import './ui/styles.css';
import type { Message, PageInfo } from '@/lib/messages';
import { buildIndex, type MatchIndex } from '@/lib/matcher';
import { findInList, getSettings, listEntries, onEntriesChanged, onSettingsChanged } from '@/lib/store';
import type { Entry, Settings } from '@/lib/types';
import { readSelection, UI_TAG, type SelectionInfo } from './dom';
import { Highlighter } from './highlighter';
import { watchHover } from './hover';
import { App } from './ui/App';
import { createUiStore, type UiActions } from './ui-store';

const HIGHLIGHT_NAME = 'lexbox';
const HIGHLIGHT_CSS = `::highlight(${HIGHLIGHT_NAME}) {
  background-color: rgba(255, 200, 40, 0.22);
  text-decoration: underline dotted rgba(170, 120, 0, 0.75);
  text-underline-offset: 3px;
}`;

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const store = createUiStore();
    let settings: Settings = await getSettings();
    if (ctx.isInvalid) return;
    let entries = new Map<string, Entry>();
    let index: MatchIndex = buildIndex([]);

    // Highlights live in the page document: ::highlight() does not reach into our shadow root.
    const style = document.createElement('style');
    style.textContent = HIGHLIGHT_CSS;
    (document.head ?? document.documentElement).append(style);
    const highlight = new Highlight();
    CSS.highlights.set(HIGHLIGHT_NAME, highlight);
    // document.body is null in XML/SVG documents: then there is nothing to highlight.
    let highlighterRoot: Element | null = document.body;
    let highlighter: Highlighter | null = highlighterRoot ? new Highlighter(highlighterRoot, highlight) : null;
    let bodyObserver: MutationObserver | null = null;

    ctx.onInvalidated(() => {
      bodyObserver?.disconnect();
      highlighter?.stop();
      style.remove();
      if (CSS.highlights.get(HIGHLIGHT_NAME) === highlight) CSS.highlights.delete(HIGHLIGHT_NAME);
    });

    function refreshHighlighting(): void {
      if (ctx.isInvalid || !highlighter) return;
      const enabled = settings.highlightEnabled && !settings.excludedSites.includes(location.hostname);
      if (enabled) highlighter.start(index);
      else highlighter.stop();
    }

    async function load(): Promise<void> {
      const list = await listEntries();
      if (ctx.isInvalid) return;
      entries = new Map(list.map((e) => [e.id, e]));
      index = buildIndex(list);
      refreshHighlighting();
    }

    // Latest in-flight reload; openCard awaits it so `existing` never reads a stale index.
    let reloading: Promise<void> = Promise.resolve();
    function reloadEntries(): Promise<void> {
      reloading = load();
      return reloading;
    }

    const actions: UiActions = {
      async openCard(selection: SelectionInfo) {
        const before = store.get();
        await reloading.catch(() => {});
        // The UI moved on while we waited (dismissed, other selection): do not resurrect a card.
        if (ctx.isInvalid || store.get() !== before) return;
        store.set({
          kind: 'card',
          at: { x: selection.rect.left, y: selection.rect.bottom + 8 },
          selection,
          existing: findInList([...entries.values()], selection.text),
        });
      },
      close() {
        store.set({ kind: 'idle' });
      },
    };

    const ui = await createShadowRootUi(ctx, {
      name: UI_TAG,
      position: 'inline',
      anchor: 'html',
      append: 'last',
      isolateEvents: true,
      onMount(container) {
        render(<App store={store} actions={actions} />, container);
        return container;
      },
      onRemove(container) {
        if (container) render(null, container);
      },
    });
    if (ctx.isInvalid) return;
    ui.mount();

    const fromOurUi = (e: Event) => e.composedPath().includes(ui.shadowHost);

    const hover = watchHover({
      getHighlighter: () => highlighter,
      canShow: () => {
        const kind = store.get().kind;
        return kind === 'idle' || kind === 'tooltip';
      },
      onEnter(hit, rect) {
        const entry = entries.get(hit.entryId);
        if (entry) store.set({ kind: 'tooltip', at: { x: rect.left, y: rect.bottom + 6 }, entry });
        else if (store.get().kind === 'tooltip') store.set({ kind: 'idle' });
      },
      onLeave() {
        if (store.get().kind === 'tooltip') store.set({ kind: 'idle' });
      },
    });

    // Turbo Drive and similar swap document.body: rebind the highlighter to the new one.
    bodyObserver = new MutationObserver(() => {
      if (ctx.isInvalid || document.body === highlighterRoot) return;
      highlighter?.stop();
      highlighterRoot = document.body;
      highlighter = highlighterRoot ? new Highlighter(highlighterRoot, highlight) : null;
      hover.reset();
      refreshHighlighting();
    });
    bodyObserver.observe(document.documentElement, { childList: true });

    ctx.addEventListener(document, 'mouseup', (e) => {
      if (fromOurUi(e) || !settings.floatingButton) return;
      // Let the browser finish updating the selection.
      setTimeout(() => {
        if (store.get().kind === 'card') return;
        const selection = readSelection(window.getSelection());
        if (selection) {
          store.set({ kind: 'button', at: { x: selection.rect.right + 4, y: selection.rect.bottom + 4 }, selection });
        }
      }, 0);
    });

    ctx.addEventListener(document, 'mousedown', (e) => {
      if (!fromOurUi(e) && store.get().kind !== 'idle') store.set({ kind: 'idle' });
    });

    ctx.addEventListener(document, 'selectionchange', () => {
      if (store.get().kind === 'button' && window.getSelection()?.isCollapsed) store.set({ kind: 'idle' });
    });

    ctx.addEventListener(
      window,
      'scroll',
      () => {
        hover.reset();
        const kind = store.get().kind;
        if (kind === 'button' || kind === 'tooltip') store.set({ kind: 'idle' });
      },
      { capture: true, passive: true },
    );

    const onMessage = (message: Message, _sender: unknown, sendResponse: (response: PageInfo) => void) => {
      if (message.type === 'open-save-card') {
        const selection = readSelection(window.getSelection());
        if (selection) void actions.openCard(selection);
      } else if (message.type === 'get-page-info') {
        sendResponse({ host: location.hostname });
      }
    };
    browser.runtime.onMessage.addListener(onMessage);

    const offEntries = onEntriesChanged(() => void reloadEntries());
    const offSettings = onSettingsChanged((next) => {
      settings = next;
      refreshHighlighting();
    });

    ctx.onInvalidated(() => {
      hover.dispose();
      offEntries();
      offSettings();
      browser.runtime.onMessage.removeListener(onMessage);
    });

    await reloadEntries();
  },
});
