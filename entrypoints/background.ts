import { t } from '@/lib/i18n';
import type { Message } from '@/lib/messages';

const MENU_ID = 'lexbox-save';

function openSaveCard(tabId: number): void {
  const message: Message = { type: 'open-save-card' };
  // The content script is absent on restricted pages; nothing to do there.
  browser.tabs.sendMessage(tabId, message).catch(() => {});
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: MENU_ID,
      title: t('menuSave'),
      contexts: ['selection'],
      documentUrlPatterns: ['http://*/*', 'https://*/*', 'file:///*'],
    });
  });

  browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === MENU_ID && tab?.id != null) openSaveCard(tab.id);
  });

  browser.commands.onCommand.addListener(async (command, tab) => {
    if (command !== 'save-selection') return;
    const tabId = tab?.id ?? (await browser.tabs.query({ active: true, currentWindow: true }))[0]?.id;
    if (tabId != null) openSaveCard(tabId);
  });
});
