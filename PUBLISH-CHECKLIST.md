# First publication checklist

One-time steps to get **Lexbox** from "code on disk" to "live on the Chrome Web
Store". Do this once. Every release *after* the first uses `RELEASE.md` instead.

> **Status:** code, icons, version 1.0.0 and the license are done. Nothing is
> published yet: no GitHub repo, no ipershin.me pages, no store listing.

Work top to bottom — later steps depend on earlier ones (the GitHub repo must
exist before the GitHub Release, the privacy policy must be live before you can
paste its URL into the store form).

---

## 0. Pre-submission audit (run first)

Mechanical compliance check — catches the most common Chrome Web Store
rejection reasons before you upload:

```bash
npm run zip
npm run preflight   # if wired up: node scripts/preflight.mjs
```

It must end with **no `[FAIL]`** before you proceed. It verifies: the
permissions are exactly `storage`, `unlimitedStorage`, `contextMenus`,
`activeTab` with no host permissions, no remote code, no `console.log` in the
built JS, the manifest version matches `package.json` and `package-lock.json`,
the icons are present, the summaries fit 132 characters, the content-script
shadow root is closed (not the e2e build), and the ZIP has no tests, `*.md` or
source maps.

**Manual policy review (not auto-checkable):**

- [ ] **Single purpose** is clear and matches the listing (learning English
      words in context while reading).
- [ ] **Every permission is justified and used:** `storage` and
      `unlimitedStorage` (the dictionary), `contextMenus` ("Add to Lexbox"),
      `activeTab` (the popup's reload hint), the content script on `<all_urls>`
      (highlighting on any page). Texts in `STORE_LISTING.md`.
- [x] **No data collection** — nothing is sent anywhere; the privacy policy
      says so and also discloses the CSS Custom Highlight API caveat.
- [x] **No remote code** — all JS and CSS are bundled; translation is Chrome's
      built-in API, not a remote service (`remote code: No`).
- [ ] **No trademarked / third-party IP in shipped assets** — the Lx icon is
      original. The listing mentions Anki only as a CSV export target.
- [x] **Screenshots reflect the real current extension** (made from the real
      build by `npm run store:assets`). No mockups passed off as the product.
- [ ] **Metadata is not misleading** — the listing says translation is English →
      Russian only and needs Chrome 138+ for the automatic part.

---

## A. Code readiness

- [x] Features for 1.0.0 implemented (save, translate, context, highlight,
      tooltip, popup, dictionary, import/export, settings, en/ru UI)
- [x] Version `1.0.0` in `package.json` and `package-lock.json`; WXT writes it
      into the manifest
- [x] Icons present: `public/icon/16.png`, `32.png`, `48.png`, `96.png`,
      `128.png` (source `store/icon/icon.svg`)
- [x] `LICENSE` (MIT) in the repo root
- [x] `homepage_url` and `author` set in `wxt.config.ts`
- [x] `npm run compile`, `npm test`, `npm run e2e` green on the final commit
- [ ] Loaded `dist/chrome-mv3` unpacked and walked the full loop on a real
      article (see `RELEASE.md` step 2), with the UI in English and in Russian

## B. Assets

- [x] `npm run store:assets` produced 4 screenshots at 1280×800 per language:
      `store/screenshots/{en,ru}/screenshot_1280x800_{1..4}.jpg`
- [x] Small promo tile 440×280: `store/promo/{en,ru}/tile_440x280.png`
- [x] (Optional) Marquee 1400×560: `store/promo/{en,ru}/marquee_1400x560.png` —
      only for featured placement; not required to publish
- [x] Promo PNGs have no alpha channel (`sips -g hasAlpha store/promo/*/*.png`)
- [x] Every image opened and checked: legible, right language inside the UI

## C. GitHub repository

- [x] Create the repo `1gory/lexbox` (public). `homepage_url` in
      `wxt.config.ts` already points at `https://github.com/1gory/lexbox`;
      keep the name or update that URL and the README.
- [x] Add the remote and push: `git remote add origin
      git@github.com:1gory/lexbox.git`, merge `feat/lexbox-v1` into `master`,
      `git push -u origin master`
- [x] Repo description + website `https://ipershin.me/lexbox/` + topics
      (`chrome-extension`, `manifest-v3`, `english`, `vocabulary`,
      `language-learning`, `wxt`)

## D. ipershin.me pages (the privacy policy needs a public URL)

The site is `/Users/ig/Sites/player-ready-one/pershin.me`
(`git@github.com:1gory/pershin.me.git`); a push to `main` deploys it. Use the
`my-little-plant/` pages there as the model.

- [x] `pershin.me/lexbox/index.html` — landing page: tagline, features, the
      privacy note, "Chrome Web Store: coming soon" until the listing is live,
      GitHub link
- [x] `pershin.me/lexbox/privacy/index.html` — `PRIVACY_POLICY.md` as HTML,
      canonical `https://ipershin.me/lexbox/privacy/`
- [x] `pershin.me/lexbox/icon.png` (from `public/icon/128.png`)
- [x] `pershin.me/img/projects/lexbox.jpg` (from `store/site/lexbox.jpg`)
- [x] Project card in `pershin.me/projects.json` (`description` and
      `descriptionRu`; leave `url` empty or point it at the landing until the
      store URL exists)
- [x] `/lexbox/` and `/lexbox/privacy/` in `pershin.me/sitemap.xml`; a link in
      the projects list of `pershin.me/index.html` if the others have one
- [x] Push `main`, wait for the deploy, then open
      `https://ipershin.me/lexbox/` and `https://ipershin.me/lexbox/privacy/` —
      both must load
- [x] The privacy URL is what you paste into the store form (step F)

## E. Chrome Web Store developer account

- [ ] Sign in to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
      with the account that publishes the other extensions (the one-time $5
      registration fee is per developer account, not per extension)
- [ ] The developer contact email is verified (required before publishing)

## F. Build and create the listing

- [ ] `npm run zip` → `dist/lexbox-1.0.0-chrome.zip`; preflight clean;
      `unzip -l` checked per `RELEASE.md` step 8
- [ ] Dashboard → **New item** → upload the ZIP
- [ ] **Store listing tab, English:**
  - [ ] Name and summary come from the package (`Lexbox`, `extDescription`);
        confirm they show
  - [ ] Detailed description: English block from `STORE_LISTING.md`
  - [ ] Category: **Education**
  - [ ] Language: **English**
  - [ ] Screenshots: `store/screenshots/en/` 1–4 in order
  - [ ] Small promo tile (and marquee, if used) from `store/promo/en/`
  - [ ] Icon 128×128 (pulled from the package, but confirm it shows)
  - [ ] Homepage URL `https://ipershin.me/lexbox/`, support URL
        `https://github.com/1gory/lexbox/issues`
- [ ] **Store listing tab, Russian** (add the language):
  - [ ] Detailed description: Russian block from `STORE_LISTING.md`
  - [ ] Screenshots: `store/screenshots/ru/` 1–4; promo tiles from
        `store/promo/ru/`
  - [ ] Summary shows the Russian `extDescription`
- [ ] **Privacy tab:**
  - [ ] Single purpose: paste from `STORE_LISTING.md`
  - [ ] Permission justifications for `storage`, `unlimitedStorage`,
        `contextMenus`, `activeTab` and host access: paste from
        `STORE_LISTING.md`
  - [ ] Remote code: **No**
  - [ ] Data usage: **does not collect user data** — tick no data types; tick
        the three certifications
  - [ ] Privacy policy URL: `https://ipershin.me/lexbox/privacy/`
- [ ] **Distribution:** Public (or Unlisted for a soft launch first), all regions

## G. Submit

- [ ] Re-read the listing preview once more, in both languages
- [ ] **Submit for review**. The first review can take longer than updates,
      anywhere from hours to a few days; the `<all_urls>` content script
      makes an in-depth review likely.

## H. After it goes live

- [ ] Copy the live listing URL and add it to:
  - [ ] `README.md` — replace "Chrome Web Store: coming soon" with the link
        (and a badge, as in the sibling repos)
  - [ ] `pershin.me/lexbox/index.html` — store badge with the URL
  - [ ] `pershin.me/projects.json` — the `url` of the Lexbox card
- [ ] Create the matching **GitHub Release** (`RELEASE.md` step 10) for tag
      `v1.0.0` with `lexbox-1.0.0-chrome.zip` attached
- [ ] Install the live version and save one word on a real article to confirm
