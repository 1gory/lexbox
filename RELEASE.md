# Release runbook

Use this every time you publish a new version to the Chrome Web Store.
Going top-to-bottom guarantees nothing is forgotten. The moving parts (the
version, the locale files, the ZIP, the store listing, screenshots in two
languages, the GitHub release, and the landing and privacy pages on
ipershin.me) drift apart easily, and nothing breaks loudly when they do.

> **For the very first publication**, do `PUBLISH-CHECKLIST.md` first (it covers
> the one-time setup: GitHub repo, ipershin.me pages, developer account, listing
> creation). Use *this* file for that release and every release after.

---

## The single most important gate

🔴 **Upload only `dist/lexbox-X.Y.Z-chrome.zip` made by `npm run zip`.**

`npm run e2e` builds `dist/chrome-mv3-e2e`, which keeps the content-script
shadow root **open** so Playwright can reach the card and tooltip. In that build
any page script can read and drive the save card. It sits right next to the real
build in `dist/`, so it is easy to zip or load the wrong folder by hand. The
production build (`dist/chrome-mv3`, made by `npm run build` or `npm run zip`)
uses a closed root. Never zip a `dist/` folder by hand.

---

## Where the version lives

- **`package.json` → `"version"`** is the only place you edit. WXT writes it into
  `dist/chrome-mv3/manifest.json` at build time; there is no manifest file in the
  repo to bump.
- **`package-lock.json`** repeats it twice (top level and `packages[""]`).
  `npm version` keeps it in sync; a hand edit of `package.json` does not.

Bump with:

```bash
npm version patch --no-git-tag-version   # or minor / major
grep -m2 '"version"' package.json package-lock.json
```

`--no-git-tag-version` because the tag is made in step 8, after the release
commit.

## Semantic versioning we use

| Bump  | When                                                                  | Example       |
|-------|-----------------------------------------------------------------------|---------------|
| PATCH | Bug fix, copy tweak, a better match for a word form, no new feature   | 1.0.0 → 1.0.1 |
| MINOR | New feature, new setting, new UI language, new translation pair       | 1.0.0 → 1.1.0 |
| MAJOR | Breaking change (storage format change without migration, removed feature) | 1.0.0 → 2.0.0 |

> **Storage note:** the dictionary lives in `chrome.storage.local`, one key per
> entry (`entry:<id>`), plus `settings` (`lib/store.ts`). The JSON backup format
> is read by `parseBackup` in `lib/store-io.ts`. If a release changes the shape of
> `Entry`, `Context` or `Settings` (`lib/types.ts`), migrate the old data on
> update and keep old backups importable. Otherwise users lose their dictionary,
> and nothing can bring it back: there is no server copy.

---

## Step-by-step release checklist

Walk every line. If a step does not apply, write "n/a" in the commit notes so
future-you can see it was considered.

### 1. Version
- [ ] Decide PATCH / MINOR / MAJOR (table above)
- [ ] `npm version <patch|minor|major> --no-git-tag-version`
- [ ] `grep -m2 '"version"' package.json package-lock.json` — both say the new
      version
- [ ] Add a section for the new version to `CHANGELOG.md`

### 2. Checks
- [ ] All feature work finished and merged into the release branch
- [ ] `npm run compile` — TypeScript is clean
- [ ] `npm test` — unit tests green
- [ ] `npm run e2e` — e2e build + Playwright green
- [ ] No stray `console.log` in `entrypoints/` or `lib/`
      (`grep -rn "console.log" entrypoints lib`). The `console.warn` for a failed
      translation and the `console.error` for a failed save are intentional.
- [ ] `npm run build`, then load `dist/chrome-mv3` unpacked
      (`chrome://extensions` → Developer mode → Load unpacked) and walk a real
      loop on a real article: select a word → "+" → translation fills in → Save;
      the word is highlighted; hover shows the translation; Alt+S and the
      context menu open the card too; the popup shows the count and recent
      words; the dictionary edits, deletes, imports and exports.
- [ ] Update over an existing install, not only a fresh one: the dictionary
      from the previous version must still be there and still highlight
      (see the storage note above).
- [ ] Check once with the UI in Russian (Chrome language set to Russian):
      new strings exist in both `public/_locales/en` and `ru`.

### 3. Store listing copy (`STORE_LISTING.md`)
- [ ] Update the **Detailed description** (English **and** Russian) if a
      feature, setting or screen was added, changed or removed.
- [ ] If the summary changed, edit `extDescription` in **both**
      `public/_locales/*/messages.json` and recount: ≤ 132 characters each. The
      dashboard takes the summary from the package; it is not typed in there.
- [ ] Re-read the **Single purpose** line — does it still match?
- [ ] If a permission was added or removed in `wxt.config.ts`, update
      **Permissions justification** and the privacy policy. Today:
      `storage`, `unlimitedStorage`, `contextMenus`, `activeTab`, plus the
      content script on `<all_urls>`.

### 4. Screenshots and promo tiles
Required size: **1280×800**, JPEG, up to 5 slots; the listing uses 4 per
language. Promo tiles: 440×280 and 1400×560, no alpha channel.

- [ ] `npm run store:assets` — regenerates
      `store/screenshots/{en,ru}/screenshot_1280x800_{1..4}.jpg` and
      `store/promo/{en,ru}/{tile_440x280,marquee_1400x560}.png` from the
      current build.
- [ ] Open **every** file, both languages, not just the obviously affected one.
      A change to the card shows up in slot 2 *and* may show in slot 1; a new
      popup row changes slot 4.
- [ ] The UI inside the `ru` shots is in Russian, the `en` shots in English.
- [ ] `sips -g pixelWidth -g pixelHeight store/screenshots/*/*.jpg` — all 1280×800.

### 5. README and CHANGELOG
- [ ] Update `README.md` for any feature, permission or privacy point this
      release touches (the Privacy section mirrors the policy).
- [ ] `CHANGELOG.md` has the new version with the user-visible changes.

### 6. Landing and privacy pages (ipershin.me)
The pages do not live in this repo. They are in
`/Users/ig/Sites/player-ready-one/pershin.me` (its own git repo,
`git@github.com:1gory/pershin.me.git`, a submodule of `player-ready-one`), and
every push to its `main` deploys the site over rsync (GitHub Actions
`deploy.yml`). Nothing here breaks when they go stale.

- [ ] Audit the feature list and tagline on `https://ipershin.me/lexbox/`
      (`pershin.me/lexbox/index.html`) against the current `STORE_LISTING.md`.
- [ ] If the privacy text changed, mirror `PRIVACY_POLICY.md` into
      `pershin.me/lexbox/privacy/index.html` and update its "Last updated" date.
- [ ] The project card: `pershin.me/projects.json` (description, descriptionRu,
      store URL, `img`) and `pershin.me/img/projects/lexbox.jpg` (copy of
      `store/site/lexbox.jpg` if slot 1 changed).
- [ ] `pershin.me/sitemap.xml` lists `/lexbox/` and `/lexbox/privacy/`.
- [ ] Commit and push in `pershin.me` (`main`), then
      `gh run list --repo 1gory/pershin.me --limit 3` — the deploy is green.
- [ ] Optional: bump the submodule pointer in `player-ready-one`
      (`git add pershin.me && git commit -m "chore: bump pershin.me"`).
- [ ] Open both URLs and confirm they show the new text.

### 7. Commit + tag
- [ ] `git status` — `git add` only files that should be tracked. `dist/`,
      `.wxt/`, `test-results/` are ignored; keep it that way.
- [ ] Commit: `Release X.Y.Z: <one-line summary>`
- [ ] Merge into `master` (the default branch) if the release was prepared on a
      feature branch.
- [ ] `git fetch --tags` **before** reasoning about which tags exist; a Release
      published from the GitHub web UI creates tags only on the remote.
- [ ] Tag: `git tag vX.Y.Z`
- [ ] Push: `git push && git push --tags`
- [ ] `gh run list --limit 3` — if the repo has workflows, the push did not turn
      one red.

### 8. Build ZIP
Run from the repo root:

```bash
npm run zip
unzip -l dist/lexbox-X.Y.Z-chrome.zip
```

`wxt zip` makes a fresh production build and packs only `dist/chrome-mv3`, so
this is the **single source of truth for packaging**: don't hand-write `zip`
commands. If `npm run preflight` is wired up, run it now; it checks the points
below mechanically.

**Must be inside:** `manifest.json` with `"version": "X.Y.Z"`, `background.js`,
`content-scripts/content.js` and `content.css`, `popup.html`, `dictionary.html`,
`chunks/`, `assets/`, `icon/16.png` … `icon/128.png`,
`_locales/en/messages.json` and `_locales/ru/messages.json`.

**Must NOT be inside:** `tests/`, `node_modules/`, `package.json`, `store/`,
`scripts/`, any `*.md`, any `*.map`, `.DS_Store`, or anything from
`chrome-mv3-e2e`.

```bash
unzip -p dist/lexbox-X.Y.Z-chrome.zip manifest.json | grep -o '"version":"[^"]*"'
unzip -p dist/lexbox-X.Y.Z-chrome.zip manifest.json | grep -o '"permissions":\[[^]]*\]'
```

The version must be the new one; the permissions must be exactly
`["storage","unlimitedStorage","contextMenus","activeTab"]`.

### 9. Chrome Web Store dashboard
- [ ] Upload `dist/lexbox-X.Y.Z-chrome.zip` under "Package".
- [ ] Store listing, **English** and **Russian** (switch the language at the top
      of the tab): update the description if `STORE_LISTING.md` changed; replace
      **every** stale screenshot and promo tile with the matching language set.
- [ ] Check that the summary shown "from package" is the new `extDescription`
      in both languages.
- [ ] Fill the **What's new in this version** field (1–3 sentences, from
      `CHANGELOG.md`).
- [ ] Confirm Privacy practices (same answers as last time unless permissions
      changed — today: no data collected, remote code: No).
- [ ] **Submit for review.**

### 10. GitHub Release
- [ ] Open `https://github.com/1gory/lexbox/releases/new`.
- [ ] Choose the existing tag `vX.Y.Z` (do not create a new one).
- [ ] Title: `vX.Y.Z — <one-line summary>`.
- [ ] Body: highlights / what changed (from `CHANGELOG.md`) / install
      instructions (store link; or unzip and "Load unpacked").
- [ ] Attach `dist/lexbox-X.Y.Z-chrome.zip` for sideloading.
- [ ] Tick **Set as the latest release**. Publish.

Or from the terminal:

```bash
gh release create vX.Y.Z dist/lexbox-X.Y.Z-chrome.zip \
  --title "vX.Y.Z — <one-line summary>" --notes-file <notes.md> --latest
```

### 11. After publish
- [ ] Wait for the email that the CWS update is live (hours to a couple of days).
- [ ] Open the listing in both languages and verify version, summary,
      screenshots and description.
- [ ] Install the **live** version (not your unpacked dev build), save a word on
      a real article, reload, and see it highlighted with the tooltip.
- [ ] Old zips pile up in `dist/`; delete the previous ones so the wrong file
      cannot be uploaded next time.

---

## Things to never forget again

A running log of mistakes from this and the sibling extensions. Read before each
release, add to it after.

- **Sibling, 1.5.1** — the manifest shipped one version while `package.json` had
  another. Here the manifest version is generated from `package.json`, so that
  one cannot happen, but its cousin can: `package-lock.json` sat at an old
  version for six releases in the sibling repo because it does not ship and
  nothing complained. Lesson: bump with `npm version`, step 1 greps both files.
- **Sibling, pre-1.5** — the landing page was never updated after the early
  releases and advertised only the first features. Lesson: step 6 audits
  `ipershin.me/lexbox/` against `STORE_LISTING.md` every release.
- **Sibling, 1.5.2 → 1.6.0** — after a folder was deleted, the README and this
  runbook kept pointing at it. Lesson: when a path or URL changes, grep the repo
  for it *and* re-read this file; the checklist is one of the things that
  drifts.
- **Sibling, 1.6.0** — "the tag does not exist" was concluded from `git tag -l`
  without fetching; GitHub had created it on the remote. Lesson: `git fetch
  --tags` first (step 7).
- **Sibling, 1.6.1** — reordering buttons was a *screenshot* change, not only a
  code change. Lesson: any visible UI change re-runs step 4, in both languages.
- *(add new entries here as they happen)*
