# Lexbox

Chrome extension for learning English words in context. Select an unfamiliar word or phrase
while reading, save it with a translation, and every saved expression is highlighted on later
pages, with the translation shown on hover.

## Development

```bash
npm install
npx playwright install chromium   # once, for e2e tests
npm run dev                        # opens Chrome with the extension and hot reload
```

## Checks

```bash
npm run compile   # TypeScript
npm test          # unit tests (Vitest)
npm run e2e       # e2e build + end-to-end tests (Playwright)
```

`npm run e2e` builds with `wxt build --mode e2e` into `.output/chrome-mv3-e2e`. That build keeps
the content-script shadow root open so Playwright locators can reach the UI; every other build
uses a closed root.

## Release

```bash
npm run zip       # .output/lexbox-<version>-chrome.zip for the Chrome Web Store
```

Translation uses Chrome's built-in on-device Translator API (Chrome 138+, en → ru).
Without it the user types the translation manually.

## Privacy

- All data (saved words, translations, example sentences with their page URLs and titles, settings)
  stays on the device in `chrome.storage.local`. Nothing is sent anywhere.
- Translation runs on-device through Chrome's built-in Translator API.
- Permissions: `storage` and `unlimitedStorage` for the dictionary, `contextMenus` for "Add to Lexbox",
  and `activeTab`, so the popup can read the current tab's address when you open it and suggest a reload
  on pages opened before Lexbox was installed. The content script runs on all pages to highlight words.
- Highlighting uses the CSS Custom Highlight API. Its registry belongs to the page, so a page's own
  scripts can see which words on that page are highlighted, and so learn which of them are saved.

## Export

The dictionary exports a JSON backup and a CSV (text, translation, sentence) for Anki or a
spreadsheet. CSV cells starting with `=`, `+`, `-` or `@` get a leading `'` so spreadsheets do not
run them as formulas; the quote is visible after importing into Anki.
