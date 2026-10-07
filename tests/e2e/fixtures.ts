import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeKey } from '../../lib/text';
import type { Context, Entry } from '../../lib/types';

const EXTENSION_DIR = path.resolve('.output/chrome-mv3');
const PAGES_DIR = path.resolve('tests/e2e/pages');
export const ARTICLE_URL = 'http://lexbox.test/article.html';

export const test = base.extend<{ context: BrowserContext; worker: Worker; extensionId: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_DIR}`, `--load-extension=${EXTENSION_DIR}`],
    });
    await context.route('http://lexbox.test/**', (route) => {
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

/** Selects `needle` inside `selector` (across inline tags) and fires mouseup like a real user. */
export async function selectText(page: Page, selector: string, needle: string): Promise<void> {
  // The content script injects at document_idle, possibly after `load`; wait until its UI host exists.
  await page.locator('lexbox-ui').waitFor({ state: 'attached' });
  await page.evaluate(
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
      const locate = (pos: number, isEnd: boolean) => {
        let acc = 0;
        for (const node of nodes) {
          const len = node.data.length;
          if (isEnd ? pos <= acc + len : pos < acc + len) return { node, offset: pos - acc };
          acc += len;
        }
        throw new Error('offset out of range');
      };
      const from = locate(start, false);
      const to = locate(start + needle.length, true);
      const range = document.createRange();
      range.setStart(from.node, from.offset);
      range.setEnd(to.node, to.offset);
      const selection = window.getSelection()!;
      selection.removeAllRanges();
      selection.addRange(range);
      const rect = range.getBoundingClientRect();
      document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, clientX: rect.right, clientY: rect.bottom }));
    },
    { selector, needle },
  );
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
