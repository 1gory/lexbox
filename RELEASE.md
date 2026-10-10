# Release — Lexbox

The common runbook is [`../RELEASE.md`](../RELEASE.md) (the shared
`~/Sites/extensions/` workspace, outside this repo). Walk it step by step; this
file holds only what is specific to this extension. Section numbers match the
common steps.

> The first publication (`PUBLISH-CHECKLIST.md`) is done — v1.0.0 went live on
> 2026-10-10. Every release uses the runbooks.

| | |
|---|---|
| Version lives in | `package.json` (+ `package-lock.json`); WXT writes it into the built manifest — there is no manifest in the repo |
| Version history | `CHANGELOG.md` (not shown in the UI) |
| Store listing | `STORE_LISTING.md`, English **and** Russian · ID `docpkegnbgaadchkoafmlmkphhhkhbfa` |
| Landing | `https://ipershin.me/lexbox/` (+ `/privacy/`) |
| GitHub | `1gory/lexbox`, default branch `master` |
| ZIP | `dist/lexbox-X.Y.Z-chrome.zip`, built by `npm run zip` |

---

### 0. Gate: never zip the e2e build

🔴 **Upload only `dist/lexbox-X.Y.Z-chrome.zip` made by `npm run zip`.**

`npm run e2e` builds `dist/chrome-mv3-e2e`, which keeps the content-script
shadow root **open** so Playwright can reach the card and tooltip — any page
script could then read and drive the save card. It sits next to the real build
in `dist/`. Never zip a `dist/` folder by hand.

### 1. Version
```bash
npm version <patch|minor|major> --no-git-tag-version
grep -m2 '"version"' package.json package-lock.json
```
`--no-git-tag-version` because the tag is made in step 8.

**Storage:** one `chrome.storage.local` key per entry (`entry:<id>`) plus
`settings` (`lib/store.ts`); the JSON backup is read by `parseBackup` in
`lib/store-io.ts`. A change to `Entry`, `Context` or `Settings`
(`lib/types.ts`) → migrate on update and keep old backups importable.

### 2. Release notes
- [ ] A section for the new version in `CHANGELOG.md`.

### 3. Checks
- [ ] `npm run compile`, `npm test`, `npm run e2e`.
- [ ] No `console.log` in `entrypoints/` or `lib/`. The `console.warn` for a
      failed translation and the `console.error` for a failed save are
      intentional.
- [ ] `npm run build`, load `dist/chrome-mv3` unpacked, walk a real loop on a
      real article: select → "+" → translation → Save; highlight; hover
      tooltip; Alt+S and the context menu; popup count and recent words;
      dictionary edit / delete / import / export.
- [ ] Once with Chrome in Russian: new strings exist in both
      `public/_locales/en` and `ru`.

### 4. Store listing
- [ ] Detailed description in English **and** Russian.
- [ ] Summary changed → `extDescription` in **both**
      `public/_locales/*/messages.json`, ≤ 132 characters each. The dashboard
      takes it from the package.
- [ ] Permissions today (`wxt.config.ts`): `storage`, `unlimitedStorage`,
      `contextMenus`, `activeTab`, plus the content script on `<all_urls>`.

### 5. Screenshots and promo tiles
- [ ] `npm run store:assets` regenerates
      `store/screenshots/{en,ru}/screenshot_1280x800_{1..4}.jpg` and
      `store/promo/{en,ru}/{tile_440x280,marquee_1400x560}.png` (no alpha).
- [ ] Open every file in both languages; `ru` shots show the Russian UI.
- [ ] `sips -g pixelWidth -g pixelHeight store/screenshots/*/*.jpg` — 1280×800.

### 7. Site
- [ ] Card image: `pershin.me/img/projects/lexbox.jpg` is a copy of
      `store/site/lexbox.jpg` if slot 1 changed.

### 8. Commit + tag
- [ ] `dist/`, `.wxt/`, `test-results/` stay ignored.
- [ ] Merge into `master` if the release was prepared on a branch.

### 9. Build ZIP
```bash
npm run zip
npm run preflight
unzip -l dist/lexbox-X.Y.Z-chrome.zip
unzip -p dist/lexbox-X.Y.Z-chrome.zip manifest.json | grep -o '"version":"[^"]*"'
unzip -p dist/lexbox-X.Y.Z-chrome.zip manifest.json | grep -o '"permissions":\[[^]]*\]'
```
Permissions must be exactly `["storage","unlimitedStorage","contextMenus","activeTab"]`.

**Must be inside:** `manifest.json`, `background.js`,
`content-scripts/content.js` and `content.css`, `popup.html`,
`dictionary.html`, `chunks/`, `assets/`, `icon/16.png` … `icon/128.png`,
`_locales/en/messages.json`, `_locales/ru/messages.json`.

**Must NOT be inside:** `store/`, `scripts/`, any `*.map`, anything from
`chrome-mv3-e2e`.

### 10. Chrome Web Store
- [ ] Switch the listing language at the top of the tab and update **both**
      English and Russian; check the summary "from package" in both.

### 12. After publish
- [ ] Listing in both languages.
- [ ] Live version: save a word on a real article, reload, see it highlighted
      with the tooltip.
- [ ] Old zips pile up in `dist/` — delete the previous ones.

---

## Project lessons

Shared lessons are in `../RELEASE.md`.

- *(add new entries here as they happen)*
