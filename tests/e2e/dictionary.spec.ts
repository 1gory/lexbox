import fs from 'node:fs';
import { entryItems, expect, makeEntry, seed, storedEntries, storedSettings, test } from './fixtures';

const context1 = { sentence: 'They ran across the field.', url: 'http://lexbox.test/article.html', title: 'Test article', addedAt: 1 };

test.beforeEach(async ({ worker }) => {
  await seed(worker, entryItems(makeEntry('run', 'бежать', [context1], 1), makeEntry('put up with', '', [], 2)));
});

test('lists, searches, edits and deletes entries', async ({ context, worker, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/dictionary.html`);

  await expect(page.locator('.entry .entry-text')).toHaveText(['put up with', 'run']);

  await page.locator('.search').fill('беж');
  await expect(page.locator('.entry .entry-text')).toHaveText(['run']);
  await page.locator('.search').fill('');

  const row = page.locator('.entry', { hasText: 'put up with' });
  await row.locator('.entry-translation').fill('терпеть');
  await row.locator('.entry-translation').press('Enter');
  await expect
    .poll(async () => (await storedEntries(worker)).find((e) => e.text === 'put up with')?.translation)
    .toBe('терпеть');

  const runRow = page.locator('.entry', { hasText: 'run' }).last();
  await runRow.locator('.toggle-contexts').click();
  await expect(runRow.locator('.contexts mark')).toHaveText('ran');
  await expect(runRow.locator('.contexts a')).toHaveAttribute('href', context1.url);

  page.once('dialog', (dialog) => void dialog.accept());
  await runRow.locator('.delete').click();
  await expect(page.locator('.entry .entry-text')).toHaveText(['put up with']);
  await expect.poll(async () => (await storedEntries(worker)).length).toBe(1);
});

test('exports and imports a JSON backup', async ({ context, worker, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/dictionary.html`);

  const [download] = await Promise.all([page.waitForEvent('download'), page.locator('.export-json').click()]);
  const backup = JSON.parse(fs.readFileSync((await download.path())!, 'utf8'));
  expect(backup.format).toBe('lexbox');
  expect(backup.entries).toHaveLength(2);

  const extra = makeEntry('give up', 'сдаваться');
  await page.locator('[data-testid=import-input]').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ format: 'lexbox', version: 1, entries: [extra] })),
  });
  await expect(page.locator('.message.ok')).toContainText('1');
  await expect.poll(async () => (await storedEntries(worker)).length).toBe(3);

  await page.locator('[data-testid=import-input]').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"nope": true}'),
  });
  await expect(page.locator('.message.error')).toBeVisible();
  expect(await storedEntries(worker)).toHaveLength(3);
});

test('edits settings', async ({ context, worker, extensionId }) => {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/dictionary.html`);
  await page.locator('.tab-settings').click();

  await page.locator('.floating-toggle').uncheck();
  await expect.poll(async () => (await storedSettings(worker))?.floatingButton).toBe(false);

  await page.locator('.site-input').fill('https://Example.com/some/page');
  await page.locator('.add-site').click();
  await expect(page.locator('.sites li span')).toHaveText(['example.com']);
  await expect.poll(async () => (await storedSettings(worker))?.excludedSites).toEqual(['example.com']);

  await page.locator('.remove-site').click();
  await expect.poll(async () => (await storedSettings(worker))?.excludedSites).toEqual([]);
});
