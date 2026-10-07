import { entryItems, expect, makeEntry, seed, storedSettings, test } from './fixtures';

test('shows the word count, recent words and toggles highlighting', async ({ context, worker, extensionId }) => {
  await seed(worker, entryItems(makeEntry('run', 'бежать', [], 1), makeEntry('put up with', 'терпеть', [], 2)));
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);

  await expect(page.locator('.count')).toContainText('2');
  await expect(page.locator('.recent li .word')).toHaveText(['put up with', 'run']);
  // Opened as a tab, the "active page" is the popup itself, where the content script does not run.
  await expect(page.locator('.unavailable')).toBeVisible();

  await page.locator('.highlight-toggle').uncheck();
  await expect.poll(async () => (await storedSettings(worker))?.highlightEnabled).toBe(false);
});

test('opens the dictionary page', async ({ context, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  const [dictionary] = await Promise.all([context.waitForEvent('page'), page.locator('.open-dictionary').click()]);
  await expect(dictionary).toHaveURL(`chrome-extension://${extensionId}/dictionary.html`);
});
