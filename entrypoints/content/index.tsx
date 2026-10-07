import { render } from 'preact';
import './ui/styles.css';
import type { Message, PageInfo } from '@/lib/messages';
import { buildIndex, matchWhole, type MatchIndex } from '@/lib/matcher';
import { getSettings, listEntries, onEntriesChanged, onSettingsChanged } from '@/lib/store';
import type { Entry, Settings } from '@/lib/types';
import { readSelection, UI_TAG, type SelectionInfo } from './dom';
import { App } from './ui/App';
import { createUiStore, type UiActions } from './ui-store';

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const store = createUiStore();
    let settings: Settings = await getSettings();
    let entries = new Map<string, Entry>();
    let index: MatchIndex = buildIndex([]);

    async function reloadEntries(): Promise<void> {
      const list = await listEntries();
      entries = new Map(list.map((e) => [e.id, e]));
      index = buildIndex(list);
    }

    const actions: UiActions = {
      openCard(selection: SelectionInfo) {
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

    document.addEventListener('mouseup', (e) => {
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

    document.addEventListener('mousedown', (e) => {
      if (!fromOurUi(e) && store.get().kind !== 'idle') store.set({ kind: 'idle' });
    });

    document.addEventListener('selectionchange', () => {
      if (store.get().kind === 'button' && window.getSelection()?.isCollapsed) store.set({ kind: 'idle' });
    });

    window.addEventListener(
      'scroll',
      () => {
        const kind = store.get().kind;
        if (kind === 'button' || kind === 'tooltip') store.set({ kind: 'idle' });
      },
      { capture: true, passive: true },
    );

    browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
      if (message.type === 'open-save-card') {
        const selection = readSelection(window.getSelection());
        if (selection) actions.openCard(selection);
      } else if (message.type === 'get-page-info') {
        const info: PageInfo = { host: location.hostname };
        sendResponse(info);
      }
    });

    onEntriesChanged(() => void reloadEntries());
    onSettingsChanged((next) => {
      settings = next;
    });

    await reloadEntries();
  },
});
