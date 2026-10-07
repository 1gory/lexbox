import type { Page } from '@playwright/test';
import { ARTICLE_URL, entryItems, expect, makeEntry, seed, selectText, test } from './fixtures';

const highlighted = (page: Page) =>
  page.evaluate(() => [...(CSS.highlights.get('lexbox') ?? [])].map((r) => (r as Range).toString()).sort());

const seedWords = (worker: Parameters<typeof seed>[0]) =>
  seed(worker, entryItems(makeEntry('run', 'бежать'), makeEntry('put up with', 'терпеть')));

test('highlights saved words and phrases in any form', async ({ context, worker }) => {
  await seedWords(worker);
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  // Textarea content is never highlighted.
  await expect
    .poll(() => highlighted(page))
    .toEqual(['Running', 'put up with', 'putting up with', 'ran', 'running', 'running']);
});

test('highlights a word right after it is saved', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await selectText(page, '#p1', 'committee');
  await page.locator('lexbox-ui .lx-fab').click();
  await page.locator('lexbox-ui .lx-translation').fill('комитет');
  await page.locator('lexbox-ui .lx-save').click();
  await expect.poll(() => highlighted(page)).toEqual(['committee']);
});

test('highlights content added later', async ({ context, worker }) => {
  await seedWords(worker);
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await expect.poll(async () => (await highlighted(page)).length).toBe(6);
  await page.evaluate(() => document.getElementById('feed')!.insertAdjacentHTML('beforeend', '<p>We ran home.</p>'));
  await expect.poll(async () => (await highlighted(page)).filter((t) => t === 'ran').length).toBe(2);
});

test('shows the translation on hover', async ({ context, worker }) => {
  await seedWords(worker);
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await expect.poll(async () => (await highlighted(page)).length).toBe(6);
  const point = await page.evaluate(() => {
    const range = [...CSS.highlights.get('lexbox')!].find((r) => (r as Range).toString() === 'ran') as Range;
    const rect = range.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  await page.mouse.move(point.x, point.y);
  await expect(page.locator('lexbox-ui .lx-tooltip .lx-tt-translation')).toHaveText('бежать');
  await page.mouse.move(5, 5);
  await expect(page.locator('lexbox-ui .lx-tooltip')).toHaveCount(0);
});

test('respects the global switch and excluded sites', async ({ context, worker }) => {
  await seedWords(worker);
  await seed(worker, { settings: { highlightEnabled: false, floatingButton: true, excludedSites: [] } });
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await page.waitForSelector('lexbox-ui', { state: 'attached' });
  expect(await highlighted(page)).toEqual([]);

  await seed(worker, { settings: { highlightEnabled: true, floatingButton: true, excludedSites: ['lexbox.test'] } });
  await page.waitForTimeout(300);
  expect(await highlighted(page)).toEqual([]);

  await seed(worker, { settings: { highlightEnabled: true, floatingButton: true, excludedSites: [] } });
  await expect.poll(async () => (await highlighted(page)).length).toBe(6);
});
