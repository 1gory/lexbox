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
npm run e2e       # build + end-to-end tests (Playwright)
```

## Release

```bash
npm run zip       # .output/lexbox-<version>-chrome.zip for the Chrome Web Store
```

Translation uses Chrome's built-in on-device Translator API (Chrome 138+, en → ru).
Without it the user types the translation manually.
