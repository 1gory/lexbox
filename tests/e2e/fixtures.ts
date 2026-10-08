import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeKey } from '../../lib/text';
import type { Context, Entry } from '../../lib/types';

// `wxt build --mode e2e`: the only build whose shadow root is open, so locators can reach the UI.
const EXTENSION_DIR = path.resolve('.output/chrome-mv3-e2e');
const PAGES_DIR = path.resolve('tests/e2e/pages');
export const ARTICLE_URL = 'http://lexbox.test/article.html';
/** The same page on a subdomain. */
export const WWW_ARTICLE_URL = 'http://www.lexbox.test/article.html';

export const test = base.extend<{ context: BrowserContext; worker: Worker; extensionId: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    await context.route(/^http:\/\/(www\.)?lexbox\.test\//, (route) => {
      const file = path.join(PAGES_DIR, new URL(route.request().url()).pathname.slice(1));
      if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
      return route.fulfill({ contentType: 'text/html; charset=utf-8', body: fs.readFileSync(file, 'utf8') });
    });
    await use(context);
    await context.close();
  },
  worker: async ({ context }, use) => {
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    await use(worker);
  },
  extensionId: async ({ worker }, use) => {
    await use(new URL(worker.url()).host);
  },
});

export const expect = test.expect;

/**
 * Selects `needle` inside `selector` (across inline tags) by dragging the mouse over it, like a
 * user: the content script ignores untrusted, script-dispatched events.
 */
export async function selectText(page: Page, selector: string, needle: string): Promise<void> {
  // The content script injects at document_idle, possibly after `load`; wait until its UI host exists.
  await page.locator('lexbox-ui').waitFor({ state: 'attached' });
  await page.locator(selector).scrollIntoViewIfNeeded();
  const { from, to } = await page.evaluate(
    ({ selector, needle }) => {
      const root = document.querySelector(selector);
      if (!root) throw new Error(`${selector} not found`);
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      let full = '';
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        nodes.push(n as Text);
        full += (n as Text).data;
      }
      const start = full.indexOf(needle);
      if (start < 0) throw new Error(`"${needle}" not found in ${selector}`);
      /** Viewport rect of the character at `pos` of the concatenated text. */
      const charRect = (pos: number) => {
        let acc = 0;
        for (const node of nodes) {
          if (pos < acc + node.data.length) {
            const range = document.createRange();
            range.setStart(node, pos - acc);
            range.setEnd(node, pos - acc + 1);
            return range.getBoundingClientRect();
          }
          acc += node.data.length;
        }
        throw new Error('offset out of range');
      };
      const first = charRect(start);
      const last = charRect(start + needle.length - 1);
      // A press inside an old selection would start a drag-and-drop instead of a new selection.
      window.getSelection()?.removeAllRanges();
      return {
        from: { x: first.left + 1, y: first.top + first.height / 2 },
        to: { x: last.right - 1, y: last.top + last.height / 2 },
      };
    },
    { selector, needle },
  );
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 5 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe(needle);
}

type ChromeStorage = {
  chrome: {
    storage: { local: { get(k: null): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void> } };
  };
};

export async function storedEntries(worker: Worker): Promise<Entry[]> {
  return worker.evaluate(async () => {
    const all = await (self as unknown as ChromeStorage).chrome.storage.local.get(null);
    return Object.entries(all)
      .filter(([key]) => key.startsWith('entry:'))
      .map(([, value]) => value as Entry);
  });
}

export async function storedSettings(worker: Worker): Promise<Record<string, unknown> | undefined> {
  return worker.evaluate(async () => {
    const all = await (self as unknown as ChromeStorage).chrome.storage.local.get(null);
    return all.settings as Record<string, unknown> | undefined;
  });
}

export async function seed(worker: Worker, items: Record<string, unknown>): Promise<void> {
  await worker.evaluate((items) => (self as unknown as ChromeStorage).chrome.storage.local.set(items), items);
}

export function makeEntry(text: string, translation: string, contexts: Context[] = [], createdAt = Date.now()): Entry {
  const key = normalizeKey(text);
  return { id: `id-${key.replace(/ /g, '-')}`, text, key, translation, contexts, createdAt, updatedAt: createdAt };
}

export const entryItems = (...entries: Entry[]): Record<string, Entry> =>
  Object.fromEntries(entries.map((e) => [`entry:${e.id}`, e]));
