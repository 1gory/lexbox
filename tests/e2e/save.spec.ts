import { ARTICLE_URL, expect, selectText, storedEntries, test } from './fixtures';

test('saves a selected phrase with context', async ({ context, worker }) => {
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);

  await selectText(page, '#p1', 'put off');
  await page.locator('lexbox-ui .lx-fab').click();

  const card = page.locator('lexbox-ui .lx-card');
  await expect(card.locator('.lx-text')).toHaveValue('put off');
  // Playwright Chromium has no Translator API, so the user types the translation.
  await card.locator('.lx-translation').fill('откладывать');
  await card.locator('.lx-translation').press('Enter');
  await expect(card).toHaveCount(0);

  await expect.poll(() => storedEntries(worker)).toEqual([
    expect.objectContaining({
      text: 'put off',
      key: 'put off',
      translation: 'откладывать',
      contexts: [
        expect.objectContaining({
          sentence: 'The committee decided to put off the meeting.',
          url: ARTICLE_URL,
          title: 'Test article',
        }),
      ],
    }),
  ]);
});

test('adds a context when the same word is saved again in another form', async ({ context, worker }) => {
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);

  await selectText(page, '#p2', 'running');
  await page.locator('lexbox-ui .lx-fab').click();
  await page.locator('lexbox-ui .lx-translation').fill('бег');
  await page.locator('lexbox-ui .lx-save').click();
  await expect.poll(async () => (await storedEntries(worker)).length).toBe(1);

  await selectText(page, '#p3', 'Running');
  await page.locator('lexbox-ui .lx-fab').click();
  const card = page.locator('lexbox-ui .lx-card');
  await expect(card.locator('.lx-existing')).toContainText('1');
  await expect(card.locator('.lx-translation')).toHaveValue('бег');
  await card.locator('.lx-save').click();

  await expect.poll(async () => (await storedEntries(worker))[0]?.contexts.map((c) => c.sentence)).toEqual([
    'Running is healthy.',
    'He kept running until it rained.',
  ]);
  expect(await storedEntries(worker)).toHaveLength(1);
});

test('Escape closes the card without saving', async ({ context, worker }) => {
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await selectText(page, '#p1', 'committee');
  await page.locator('lexbox-ui .lx-fab').click();
  await page.locator('lexbox-ui .lx-translation').press('Escape');
  await expect(page.locator('lexbox-ui .lx-card')).toHaveCount(0);
  expect(await storedEntries(worker)).toEqual([]);
});

test('Enter on the focused Cancel button closes the card without saving', async ({ context, worker }) => {
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await selectText(page, '#p1', 'committee');
  await page.locator('lexbox-ui .lx-fab').click();
  await page.locator('lexbox-ui .lx-translation').fill('комитет');
  await page.locator('lexbox-ui .lx-cancel').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('lexbox-ui .lx-card')).toHaveCount(0);
  expect(await storedEntries(worker)).toEqual([]);
});

test('the background message opens the card for the current selection', async ({ context, worker }) => {
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await selectText(page, '#p1', 'noise');
  await worker.evaluate(async () => {
    type Tabs = { chrome: { tabs: { query(q: object): Promise<{ id?: number }[]>; sendMessage(id: number, m: object): Promise<unknown> } } };
    const { tabs } = (self as unknown as Tabs).chrome;
    for (const tab of await tabs.query({})) {
      if (tab.id != null) await tabs.sendMessage(tab.id, { type: 'open-save-card' }).catch(() => {});
    }
  });
  await expect(page.locator('lexbox-ui .lx-card .lx-text')).toHaveValue('noise');
});
