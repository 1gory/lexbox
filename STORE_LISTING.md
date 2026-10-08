# Chrome Web Store — Publishing Info

> The extension UI ships in English and Russian (`public/_locales/{en,ru}`). The
> store listing is localized the same way: English is the primary language,
> Russian is a second listing language with its own description, screenshots and
> promo tiles. Every user-facing text below is given in both languages. The
> reviewer-facing parts (single purpose, privacy answers, permissions) are in
> English only.

## Extension name

| Language | Name |
|---|---|
| English | Lexbox |
| Russian | Lexbox |

The name comes from `extName` in `public/_locales/*/messages.json`; it is the
same word in both locales.

---

## Short description (132 chars max)

The dashboard does not take a separate summary: it shows the manifest
`description`, which is `__MSG_extDescription__`, so each language gets the
`extDescription` from its locale file. Edit the locale files, not the dashboard.

**English** (`public/_locales/en/messages.json`):

Save English words and phrases as you read, with a Russian translation. Lexbox highlights them on every page, translation on hover.

*(131 characters — within the 132 limit.)*

**Russian** (`public/_locales/ru/messages.json`):

Сохраняйте английские слова и фразы при чтении. Lexbox подсветит их на всех страницах и покажет перевод на русский при наведении.

*(129 characters — within the 132 limit.)*

> The previous lines ("Collect English words while reading and see their
> translations right in the text." / "Собирайте английские слова при чтении и
> смотрите перевод прямо в тексте.") did not name the target language. The
> translation is English → Russian only, so the summary now says so, which spares
> people who want another language an install-and-uninstall.

---

## Detailed description

The dashboard field is plain text: no Markdown. Paste the block as is; the `-`
bullets show up as typed.

### English

Lexbox helps you learn English words from the texts you actually read. Select an
unfamiliar word or phrase on any page, save it with a Russian translation, and
from then on Lexbox highlights it wherever it appears. Hover a highlighted word
to see its translation right in the text.

How it works:

- Save a word or phrase. Select it and click the small "+" button next to the
  selection, press Alt+S, or right-click and choose "Add to Lexbox".
- Get a translation. In Chrome 138 or later, Lexbox translates from English into
  Russian with Chrome's built-in translator, which runs on your computer. You can
  edit the result or type your own. The first time, Chrome downloads its
  English–Russian language pack; if the card shows a "Download translator"
  button, click it to start. In older versions of Chrome you type the
  translation yourself, and everything else works the same.
- Keep the context. Lexbox saves the sentence the word came from, together with
  the page title and a link back to the page.
- Meet it again. Saved words and phrases are softly highlighted on the pages you
  read, in other forms too: save "run" and Lexbox also marks "running" and "ran";
  save "put up with" and it marks "putting up with". Hover a highlight to see
  the translation.

The popup lets you turn highlighting on or off, switch it off for the current
site, and see how many words you have saved and the latest ones.

The dictionary page lets you search, edit translations, delete words, and read
every saved sentence with a link to its page. You can back up and restore the
dictionary as a JSON file, or export it as CSV for Anki or a spreadsheet. In
the settings you can hide the "+" button and manage the sites where
highlighting is off. The shortcut can be changed at
chrome://extensions/shortcuts.

The interface is in English and Russian.

Privacy: no account, no analytics, no network requests. Your words,
translations, saved sentences, page addresses and titles, and settings are
stored only in your browser, on this device. Translation runs on your device
too. One thing to know: highlighting uses the browser's CSS Custom Highlight
API, so a page's own scripts can see which words on that page are highlighted.

Current limits: translation is English to Russian only. Lexbox works in the main
page, not inside embedded frames, and not in PDFs, on browser pages or in the
Chrome Web Store. The dictionary is not synced between devices; use the JSON
backup to move it.

### Russian

Lexbox помогает учить английские слова по текстам, которые вы и так читаете.
Выделите незнакомое слово или фразу на любой странице и сохраните с переводом на
русский. Дальше Lexbox подсвечивает его везде, где оно встречается. Наведите
курсор на подсвеченное слово, и перевод появится прямо в тексте.

Как это работает:

- Сохраните слово или фразу. Выделите их и нажмите маленькую кнопку «+» рядом с
  выделением, клавиши Alt+S или пункт «Добавить в Lexbox» в контекстном меню.
- Получите перевод. В Chrome 138 и новее Lexbox переводит с английского на
  русский встроенным переводчиком Chrome, который работает на вашем компьютере.
  Перевод можно поправить или ввести свой. В первый раз Chrome скачивает
  англо-русский языковой пакет; если в карточке появилась кнопка «Скачать
  переводчик», нажмите её. В более старых версиях Chrome перевод вводится
  вручную, всё остальное работает так же.
- Сохраните контекст. Lexbox запоминает предложение, в котором встретилось
  слово, вместе с названием страницы и ссылкой на неё.
- Встречайте слово снова. Сохранённые слова и фразы мягко подсвечиваются на
  страницах, которые вы читаете, и в других формах тоже: сохраните «run», и
  Lexbox отметит «running» и «ran»; сохраните «put up with», и он отметит
  «putting up with». Наведите курсор на подсветку, чтобы увидеть перевод.

В окне расширения можно включить или выключить подсветку, отключить её на
текущем сайте и посмотреть, сколько слов сохранено и какие последние.

На странице словаря можно искать, править переводы, удалять слова и читать все
сохранённые предложения со ссылками на страницы. Словарь можно сохранить в
JSON-файл и восстановить из него или выгрузить в CSV для Anki или таблицы. В
настройках можно скрыть кнопку «+» и задать сайты, где подсветка выключена.
Горячую клавишу можно поменять на странице chrome://extensions/shortcuts.

Интерфейс на русском и английском.

Конфиденциальность: без аккаунта, без аналитики, без сетевых запросов. Слова,
переводы, сохранённые предложения, адреса и названия страниц и настройки
хранятся только в вашем браузере, на этом устройстве. Перевод тоже выполняется
на устройстве. Одна оговорка: подсветка использует CSS Custom Highlight API
браузера, поэтому скрипты самой страницы могут узнать, какие слова на ней
подсвечены.

Ограничения этой версии: перевод только с английского на русский. Lexbox
работает в основной странице, но не во встроенных фреймах, не в PDF, не на
служебных страницах браузера и не в Chrome Web Store. Словарь не
синхронизируется между устройствами; чтобы перенести его, используйте
JSON-бэкап.

---

## Category and language

- Category: **Education**
- Primary language: **English**
- Additional listing language: **Russian** (description, screenshots and promo
  tiles from the `ru` sets below; the summary comes from the `ru` locale file)

---

## Single purpose description (for Chrome Web Store review)

Lexbox has a single purpose: helping the user learn English vocabulary in
context while reading web pages. The user selects an English word or phrase and
saves it with a Russian translation and the sentence it appeared in; the
extension then highlights the saved words on the pages the user reads and shows
the translation on hover. The popup and the dictionary page exist only to manage
that word list (search, edit, delete, backup, export) and the highlighting
settings.

---

## Privacy practices (Data use disclosures)

- Does not collect any user data
- Does not transmit any data to external servers
- Saved words and phrases, their translations, the sentences they were saved
  from, the URL and title of those pages, and the settings are stored locally via
  `chrome.storage.local` on the user's device only
- Translation uses Chrome's built-in on-device Translator API; no text is sent to
  a translation service
- No analytics, tracking, or third-party scripts
- No network requests of any kind
- No account or sign-in

Dashboard answers:

- **Data collection:** none of the data categories is ticked. The extension does
  not collect user data: everything it stores stays on the device and is never
  transmitted. The store counts data as collected when it leaves the device.
- **Certifications:** tick all three (no sale or transfer to third parties
  outside the approved use cases, no use unrelated to the single purpose, no use
  for creditworthiness or lending).
- **Privacy policy URL:** `https://ipershin.me/lexbox/privacy/`
- **Remote code:** No. All JavaScript is bundled in the package; nothing is
  loaded or evaluated from a remote source.

---

## Permissions justification

Paste each line into the matching field of the Privacy tab.

- `storage` — Used only to save the user's dictionary (saved words and phrases,
  their translations, the sentences they were saved from with the page URL and
  title) and the settings (highlighting on or off, floating button on or off,
  sites where highlighting is off) in `chrome.storage.local`. The data stays on
  the device and is never transmitted.
- `unlimitedStorage` — Used only so that a large dictionary keeps saving. Every
  entry carries example sentences, and over months of reading the dictionary can
  outgrow the default 10 MB `chrome.storage.local` quota. Without this
  permission saving would start failing silently for long-time users. No data
  leaves the device.
- `contextMenus` — Used only to add one item, "Add to Lexbox", to the context
  menu shown for selected text. Clicking it opens the save card for the
  selection. The item appears only when text is selected.
- `activeTab` — Used only when the user opens the popup: the popup reads the
  active tab's URL to choose between two hints when Lexbox is not running in that
  tab. A web page that was open before Lexbox was installed gets "Reload this page
  to use Lexbox"; a page where extensions cannot run (browser pages, the Chrome
  Web Store, PDFs) gets "Not available on this page". The URL is not stored or
  sent anywhere.
- Host access: content script on all sites (`<all_urls>`, main frame only) —
  Highlighting saved words and saving new ones have to work on whatever page the
  user is reading, and there is no fixed list of sites people learn English
  from. The content script reads the page text locally to find saved words and
  highlight them, shows the "+" button and the save card next to a selection,
  and shows the translation on hover. It sends nothing off the device. The user
  can turn highlighting off globally or for particular sites.

Remote code: No. Data collection: No.

---

## Screenshots guide

Chrome Web Store allows up to 5 screenshots. Required size: 1280×800 (or
640×400), JPEG or 24-bit PNG without alpha. The listing uses 4, one set per
listing language. They are produced by `npm run store:assets`
(`scripts/store-assets.mjs`). Each one has a dark caption band on top and a real
render of the extension below it.

| # | What to show | English file | Russian file |
|---|---|---|---|
| 1 | An article with several soft highlights and the hover tooltip open over one of them. The core experience; this is the most important slot | `store/screenshots/en/screenshot_1280x800_1.jpg` | `store/screenshots/ru/screenshot_1280x800_1.jpg` |
| 2 | The save card next to a selection: the expression, the translation, the context sentence and the Save button | `store/screenshots/en/screenshot_1280x800_2.jpg` | `store/screenshots/ru/screenshot_1280x800_2.jpg` |
| 3 | The dictionary page with 8–10 entries and one entry's contexts expanded | `store/screenshots/en/screenshot_1280x800_3.jpg` | `store/screenshots/ru/screenshot_1280x800_3.jpg` |
| 4 | The popup over the article: highlight switch, "Disable on this site", word count, recent words | `store/screenshots/en/screenshot_1280x800_4.jpg` | `store/screenshots/ru/screenshot_1280x800_4.jpg` |

Upload the `en` set to the English listing and the `ru` set to the Russian one,
in slot order. The extension UI inside each shot must be in the language of that
listing.

Slots 1 and 2 carry the listing. Screenshots must show the real current UI;
re-run `npm run store:assets` after any visible change to the content-script UI,
the popup or the dictionary.

### Promo tiles

| Tile | Size | English file | Russian file |
|---|---|---|---|
| Small promo tile (recommended) | 440×280 PNG | `store/promo/en/tile_440x280.png` | `store/promo/ru/tile_440x280.png` |
| Marquee (only for featured placement, optional) | 1400×560 PNG | `store/promo/en/marquee_1400x560.png` | `store/promo/ru/marquee_1400x560.png` |

The store takes promo tiles as JPEG or 24-bit PNG **without an alpha channel**.
Check with `sips -g hasAlpha store/promo/*/*.png`; every file must say `no`.

---

## Packaging (ZIP for Chrome Web Store)

Run from the repo root:

```bash
npm run zip
```

`wxt zip` makes a production build into `dist/chrome-mv3` and packs exactly
that folder into **`dist/lexbox-1.0.0-chrome.zip`** (the name is
`lexbox-<package.json version>-chrome.zip`). Nothing outside the build output
can get in, so there is no whitelist to maintain. Check it with
`npm run preflight` (if wired up) or `unzip -l dist/lexbox-1.0.0-chrome.zip`.

### What's included
| Path | Why |
|------|-----|
| `manifest.json` | Generated by WXT from `wxt.config.ts`; the version comes from `package.json` |
| `background.js` | Service worker: context menu item and the Alt+S command |
| `content-scripts/content.js`, `content-scripts/content.css` | Highlighting, the "+" button, the save card and the tooltip |
| `popup.html`, `dictionary.html`, `chunks/*.js`, `assets/*.css` | Popup and dictionary page |
| `icon/16.png`, `32.png`, `48.png`, `96.png`, `128.png` | Toolbar and store icons referenced by the manifest |
| `_locales/en/messages.json`, `_locales/ru/messages.json` | UI strings, extension name and summary |

### What's excluded (must NOT be in ZIP)
| Path | Why |
|------|-----|
| `dist/chrome-mv3-e2e/` | The e2e build keeps the content-script shadow root **open** for Playwright; the store build must use the closed one |
| `node_modules/`, `package.json`, `package-lock.json` | Dev tooling only |
| `entrypoints/`, `lib/` (TypeScript sources) | Compiled into the bundle |
| `tests/`, `test-results/`, `playwright.config.ts`, `vitest.config.ts` | Tests |
| `store/`, `scripts/` | Store assets and the scripts that make them; screenshots are uploaded separately |
| `docs/`, `*.md` | Docs, not part of the extension |
| `*.map` | Source maps; not needed at runtime |
| `.git/`, `.wxt/`, `.idea/`, `.DS_Store` | Dev metadata |

---

## Pre-publish checklist (quick)

The authoritative, step-by-step list is in `RELEASE.md`. This is the short
version of the things that bite this kind of project:

- [ ] `package.json` and `package-lock.json` versions match; the manifest gets
      the version from `package.json`
- [ ] `npm run compile`, `npm test` and `npm run e2e` are green
- [ ] Permissions in `dist/chrome-mv3/manifest.json` are exactly `storage`,
      `unlimitedStorage`, `contextMenus`, `activeTab`, with no `host_permissions`;
      the justifications above cover all of them
- [ ] No `console.log` in the built JS (the `console.warn`/`console.error` calls
      for failed translation and failed save are intentional)
- [ ] The ZIP is `dist/lexbox-<version>-chrome.zip` from `npm run zip`, not a zip
      of `dist/chrome-mv3-e2e`
- [ ] Icons 16/32/48/96/128 are in the ZIP; no tests, `*.md` or `*.map`
- [ ] Short descriptions in both locale files are ≤ 132 characters
- [ ] Screenshots and promo tiles regenerated with `npm run store:assets` and
      match the current UI, in both languages
- [ ] Privacy policy is live at `https://ipershin.me/lexbox/privacy/`
- [ ] Store description, single purpose, privacy answers and permission
      justifications filled in the dashboard
