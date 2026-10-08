import { ARTICLE_URL, entryItems, expect, makeEntry, seed, selectText, storedEntries, test } from './fixtures';

test('ignores input dispatched by page scripts', async ({ context, worker }) => {
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await page.locator('lexbox-ui').waitFor({ state: 'attached' });
  const fab = page.locator('lexbox-ui .lx-fab');
  const card = page.locator('lexbox-ui .lx-card');

  // A script selects text and fakes the mouseup: no save button.
  await page.evaluate(() => {
    const text = document.querySelector('#p1')!.firstChild!;
    const range = document.createRange();
    range.setStart(text, 4);
    range.setEnd(text, 13);
    getSelection()!.removeAllRanges();
    getSelection()!.addRange(range);
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  await page.waitForTimeout(300);
  await expect(fab).toHaveCount(0);

  // A script click on the real save button does not open the card.
  await selectText(page, '#p1', 'committee');
  await expect(fab).toHaveCount(1);
  const shadowClick = (selector: string) =>
    page.evaluate((s) => (document.querySelector('lexbox-ui')!.shadowRoot!.querySelector(s) as HTMLElement).click(), selector);
  await shadowClick('.lx-fab');
  await page.waitForTimeout(300);
  await expect(card).toHaveCount(0);

  // Script clicks and key presses inside the card neither save nor close it.
  await fab.click();
  await card.locator('.lx-translation').fill('комитет');
  await shadowClick('.lx-save');
  await shadowClick('.lx-cancel');
  await page.evaluate(() =>
    document
      .querySelector('lexbox-ui')!
      .shadowRoot!.querySelector('.lx-translation')!
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, composed: true })),
  );
  await page.waitForTimeout(300);
  await expect(card).toHaveCount(1);
  expect(await storedEntries(worker)).toEqual([]);
});

test('shows no tooltip for script-dispatched mouse moves', async ({ context, worker }) => {
  await seed(worker, entryItems(makeEntry('run', 'бежать')));
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await expect.poll(() => page.evaluate(() => CSS.highlights.get('lexbox')?.size ?? 0)).toBeGreaterThan(0);
  await page.evaluate(() => {
    const range = [...CSS.highlights.get('lexbox')!].find((r) => (r as Range).toString() === 'ran') as Range;
    const rect = range.getBoundingClientRect();
    const init = { bubbles: true, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 };
    document.dispatchEvent(new MouseEvent('mousemove', init));
  });
  await page.waitForTimeout(500);
  await expect(page.locator('lexbox-ui .lx-tooltip')).toHaveCount(0);
});

test('a page stopping mouseup propagation does not hide the save button', async ({ context }) => {
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await page.evaluate(() => document.body.addEventListener('mouseup', (e) => e.stopPropagation()));
  await selectText(page, '#p1', 'committee');
  await expect(page.locator('lexbox-ui .lx-fab')).toHaveCount(1);
});

test('puts the UI host and the highlight style back when the page removes them', async ({ context, worker }) => {
  await seed(worker, entryItems(makeEntry('run', 'бежать')));
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await page.locator('lexbox-ui').waitFor({ state: 'attached' });
  const hasHighlightStyle = () =>
    page.evaluate(() => [...document.querySelectorAll('style')].some((s) => s.textContent?.includes('::highlight(lexbox)')));
  await expect.poll(hasHighlightStyle).toBe(true);

  await page.evaluate(() => {
    document.querySelector('lexbox-ui')!.remove();
    for (const s of document.querySelectorAll('style')) if (s.textContent?.includes('::highlight(lexbox)')) s.remove();
  });
  await expect(page.locator('lexbox-ui')).toHaveCount(1);
  await expect.poll(hasHighlightStyle).toBe(true);

  // The restored UI still works.
  await selectText(page, '#p1', 'committee');
  await page.locator('lexbox-ui .lx-fab').click();
  await expect(page.locator('lexbox-ui .lx-card .lx-text')).toHaveValue('committee');
});
