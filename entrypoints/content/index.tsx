import { render } from 'preact';
import './ui/styles.css';
import type { Message, PageInfo } from '@/lib/messages';
import { buildIndex, matchWhole, type MatchIndex } from '@/lib/matcher';
import { getSettings, listEntries, onEntriesChanged, onSettingsChanged } from '@/lib/store';
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
    let entries = new Map<string, Entry>();
    let index: MatchIndex = buildIndex([]);

    // Highlights live in the page document: ::highlight() does not reach into our shadow root.
    const style = document.createElement('style');
    style.textContent = HIGHLIGHT_CSS;
    (document.head ?? document.documentElement).append(style);
    const highlight = new Highlight();
    CSS.highlights.set(HIGHLIGHT_NAME, highlight);
    const highlighter = new Highlighter(document.body, highlight);

    function refreshHighlighting(): void {
      const enabled = settings.highlightEnabled && !settings.excludedSites.includes(location.hostname);
      if (enabled) highlighter.start(index);
      else highlighter.stop();
    }

    async function load(): Promise<void> {
      const list = await listEntries();
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
        await reloading.catch(() => {});
        const id = matchWhole(index, selection.text);
        store.set({
          kind: 'card',
          at: { x: selection.rect.left, y: selection.rect.bottom + 8 },
          selection,
          existing: id ? (entries.get(id) ?? null) : null,
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
    ui.mount();

    const fromOurUi = (e: Event) => e.composedPath().includes(ui.shadowHost);

    const hover = watchHover({
      highlighter,
      canShow: () => {
        const kind = store.get().kind;
        return kind === 'idle' || kind === 'tooltip';
      },
      onEnter(hit, rect) {
        const entry = entries.get(hit.entryId);
        if (entry) store.set({ kind: 'tooltip', at: { x: rect.left, y: rect.bottom + 6 }, entry });
      },
      onLeave() {
        if (store.get().kind === 'tooltip') store.set({ kind: 'idle' });
      },
    });

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
      highlighter.stop();
    });

    await reloadEntries();
  },
});
