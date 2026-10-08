// Generates every Chrome Web Store graphic: screenshots, promo tiles and the site card.
// Usage: npm run store:assets   (builds `wxt build --mode e2e`, then drives Chromium with Playwright)
//
// Locale: Chromium on macOS ignores --lang and -AppleLanguages for chrome.i18n, so the Russian run
// loads a temporary COPY of the e2e build whose _locales/en/messages.json is the Russian catalogue.
// Nothing in the source tree or in the production build changes.
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BUILD = path.join(ROOT, 'dist/chrome-mv3-e2e');
const TEMPLATES = path.join(ROOT, 'store/templates');
const OUT = { shots: path.join(ROOT, 'store/screenshots'), promo: path.join(ROOT, 'store/promo'), site: path.join(ROOT, 'store/site') };
const ARTICLE_URL = 'http://lexbox.test/article.html';

const LOCALES = {
  en: {
    headlines: [
      'Reread articles with <em>translations</em> right in the text',
      'Save unfamiliar words in <em>one click</em>',
      'Your <em>dictionary</em> with examples from what you read',
      'Turn highlighting <em>on or off</em> in a click',
    ],
    tagline: 'Learn English words in context',
  },
  ru: {
    headlines: [
      'Перечитывайте статьи <em>с переводом</em> прямо в тексте',
      'Сохраняйте незнакомые слова <em>в один клик</em>',
      'Ваш <em>словарь</em> с примерами из прочитанного',
      'Подсветка включается и выключается <em>в один клик</em>',
    ],
    tagline: 'Английские слова в контексте',
  },
};

const read = (p) => fs.readFileSync(p);
const dataUri = (buf, mime) => `data:${mime};base64,${buf.toString('base64')}`;
const ICON = dataUri(read(path.join(ROOT, 'store/icon/icon.svg')), 'image/svg+xml');
const fill = (name, vars) =>
  Object.entries(vars).reduce((html, [k, v]) => html.replaceAll(`{{${k}}}`, v), read(path.join(TEMPLATES, name)).toString());

// ---- demo data -------------------------------------------------------------------------------
const T0 = Date.UTC(2026, 8, 1, 10);
const ctx = (sentence, title, days) => ({ sentence, url: 'https://theslowreader.com/a-year-abroad', title, addedAt: T0 + days * 864e5 });
const TITLE = 'A Year Abroad: How I Finally Learned to Think in English';
const S = {
  reluctant: 'When I first arrived in Dublin, I was reluctant to speak.',
  putUp: 'For the first few weeks I had to put up with blank stares at the café and long silences on the phone.',
  wander: 'Things changed when I started wandering through the city with a small notebook.',
  figure: 'I wrote down every phrase I could not figure out, and in the evening I wandered through my notes again, looking for patterns.',
  came: 'I still came across plenty of unfamiliar words, but now I could usually guess their meaning.',
  gradually: 'The ones that mattered gradually became part of my everyday vocabulary.',
  fluent: 'Becoming fluent, I realised, is less about talent than about patience.',
};
// [text, translation, contexts]; createdAt grows with the index so the newest shows first in the popup.
const ENTRIES = [
  ['reluctant', 'неохотный, нерешительный', [ctx(S.reluctant, TITLE, 0)]],
  ['wander', 'бродить, блуждать', [ctx(S.figure, TITLE, 1), ctx(S.wander, TITLE, 1)]],
  ['figure out', 'разобраться, понять', [ctx(S.figure, TITLE, 2)]],
  ['gradually', 'постепенно', [ctx(S.gradually, TITLE, 3)]],
  ['fluent', 'беглый, свободно владеющий', [ctx(S.fluent, TITLE, 4)]],
  ['come across', 'натыкаться, случайно встретить', [ctx(S.came, TITLE, 5)]],
  ['put up with', 'мириться, терпеть', [
    ctx('I can not put up with this noise any longer, said the man at the next table.', 'Café Culture in Dublin', 6),
    ctx(S.putUp, TITLE, 6),
  ]],
  ['overcome', 'преодолевать', [ctx('Learners overcome the fear of speaking by talking every day.', 'Ten Habits of Fast Learners', 7)]],
  ['tedious', 'утомительный, нудный', [ctx('Memorising lists of words is tedious and rarely works.', 'Ten Habits of Fast Learners', 8)]],
  ['keep up', 'не отставать', [ctx('It is hard to keep up with a conversation at full speed.', 'Café Culture in Dublin', 9)]],
];
const slug = (s) => s.replace(/ /g, '-');
const entryItems = (skip = []) =>
  Object.fromEntries(
    ENTRIES.filter(([text]) => !skip.includes(text)).map(([text, translation, contexts], i) => {
      const createdAt = T0 + i * 1000;
      const e = { id: `id-${slug(text)}`, text, key: text.toLowerCase(), translation, contexts: [...contexts].reverse(), createdAt, updatedAt: createdAt };
      return [`entry:${e.id}`, e];
    }),
  );

// ---- browser helpers ---------------------------------------------------------------------------
function extensionFor(locale, tmp) {
  const dir = path.join(tmp, locale);
  fs.cpSync(BUILD, dir, { recursive: true });
  if (locale !== 'en') {
    fs.copyFileSync(path.join(ROOT, `public/_locales/${locale}/messages.json`), path.join(dir, '_locales/en/messages.json'));
  }
  return dir;
}

async function launch(extDir) {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    viewport: { width: 1280, height: 690 },
    deviceScaleFactor: 1,
    args: [`--disable-extensions-except=${extDir}`, `--load-extension=${extDir}`],
  });
  await context.route(/^http:\/\/lexbox\.test\//, (route) => {
    const file = path.join(TEMPLATES, new URL(route.request().url()).pathname.slice(1));
    if (!fs.existsSync(file)) return route.fulfill({ status: 404, body: 'not found' });
    return route.fulfill({ contentType: 'text/html; charset=utf-8', body: read(file) });
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
  return { context, worker, extensionId: new URL(worker.url()).host };
}

const seed = (worker, items) => worker.evaluate((items) => chrome.storage.local.set(items), items);
const clearStorage = (worker) => worker.evaluate(() => chrome.storage.local.clear());
const highlightedCount = (page) => page.evaluate(() => [...(CSS.highlights.get('lexbox') ?? [])].length);

async function openArticle(context, worker, skip) {
  await clearStorage(worker);
  await seed(worker, entryItems(skip));
  const page = await context.newPage();
  await page.goto(ARTICLE_URL);
  await page.locator('lexbox-ui').waitFor({ state: 'attached' });
  // Highlights appear after the content script reads storage.
  const expected = skip.length ? 6 : 7;
  for (let i = 0; i < 50 && (await highlightedCount(page)) < expected; i++) await page.waitForTimeout(100);
  return page;
}

/** Viewport centre of the highlight (or text) `needle`. */
function centreOf(page, needle) {
  return page.evaluate((needle) => {
    const ranges = [...(CSS.highlights.get('lexbox') ?? [])].filter((r) => r.toString().toLowerCase() === needle);
    // A phrase may wrap over two lines: aim at its widest line box.
    const rect = [...(ranges[0]?.getClientRects() ?? [])].sort((a, b) => b.width - a.width)[0];
    if (!rect) throw new Error(`no highlight ${needle}`);
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, needle);
}

async function compose(browser, { headline, shot, popup }) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  await page.setContent(
    fill('compose.html', {
      ICON,
      HEADLINE: headline,
      SHOT: dataUri(shot, 'image/png'),
      POPUP: popup ? `<img class="popup" src="${dataUri(popup, 'image/png')}">` : '',
    }),
  );
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  const jpeg = await page.screenshot({ type: 'jpeg', quality: 88 });
  await page.close();
  return jpeg;
}

async function renderPng(browser, template, vars, width, height) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(fill(template, vars));
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  const png = await page.screenshot({ type: 'png' });
  await page.close();
  return png;
}

// ---- main --------------------------------------------------------------------------------------
console.log('Building e2e extension...');
execFileSync('npx', ['wxt', 'build', '--mode', 'e2e'], { cwd: ROOT, stdio: 'inherit' });

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lexbox-assets-'));
const plain = await chromium.launch({ channel: 'chromium' });
const write = (file, buf) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  console.log('wrote', path.relative(ROOT, file));
};

try {
  for (const [locale, cfg] of Object.entries(LOCALES)) {
    const { context, worker, extensionId } = await launch(extensionFor(locale, tmp));
    const shots = [];
    const raw = [];
    const take = async (page, popup) => {
      const buf = await page.screenshot({ type: 'png' });
      raw.push(buf);
      shots.push(await compose(plain, { headline: cfg.headlines[shots.length], shot: buf, popup }));
    };

    // 1. Highlights + hover tooltip.
    let page = await openArticle(context, worker, []);
    const at = await centreOf(page, 'put up with');
    await page.mouse.move(at.x - 120, at.y + 60);
    await page.mouse.move(at.x, at.y, { steps: 8 });
    await page.locator('lexbox-ui .lx-tooltip').waitFor({ state: 'visible' });
    await page.mouse.move(at.x + 1, at.y, { steps: 2 });
    await page.waitForTimeout(300);
    await take(page);
    await page.close();

    // 2. Selection + save card (the Translator API is absent here, so fill the translation).
    page = await openArticle(context, worker, ['reluctant']);
    const box = await page.locator('#reluctant').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 1, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 1, y, { steps: 5 });
    await page.mouse.up();
    await page.locator('lexbox-ui .lx-fab').click();
    const card = page.locator('lexbox-ui .lx-card');
    await card.locator('.lx-translation').fill('неохотный, нерешительный');
    // Without the Translator API the card shows a "type the translation" hint; it would look like a bug.
    await card.locator('.lx-hint:not(.lx-existing):not(.lx-error)').evaluateAll((els) => els.forEach((el) => el.remove()));
    await page.mouse.move(640, 650);
    await page.waitForTimeout(300);
    await take(page);
    await page.close();

    // 3. Dictionary with one entry's contexts expanded.
    await clearStorage(worker);
    await seed(worker, entryItems());
    page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/dictionary.html`);
    await page.locator('.entry').first().waitFor();
    await page.locator('.entry', { hasText: 'put up with' }).locator('.toggle-contexts').click();
    await page.mouse.move(1270, 680);
    await page.waitForTimeout(300);
    await take(page);
    await page.close();

    // 4. Popup composited over the article.
    page = await openArticle(context, worker, []);
    const popupPage = await context.newPage();
    await popupPage.setViewportSize({ width: 300, height: 400 });
    await popupPage.addInitScript(() => {
      chrome.tabs.query = async () => [{ id: 4242, url: 'https://theslowreader.com/a-year-abroad' }];
      chrome.tabs.sendMessage = async () => ({ host: 'theslowreader.com' });
    });
    await popupPage.goto(`chrome-extension://${extensionId}/popup.html`);
    await popupPage.locator('.site-toggle').waitFor();
    const popup = await popupPage.locator('main.popup').screenshot({ type: 'png' });
    await popupPage.close();
    await take(page, popup);
    await page.close();
    await context.close();

    shots.forEach((jpeg, i) => write(path.join(OUT.shots, locale, `screenshot_1280x800_${i + 1}.jpg`), jpeg));
    if (locale === 'en') write(path.join(OUT.site, 'lexbox.jpg'), shots[0]);

    const shotUri = dataUri(raw[0], 'image/png');
    write(path.join(OUT.promo, locale, 'tile_440x280.png'), await renderPng(plain, 'promo-tile.html', { ICON, TAGLINE: cfg.tagline }, 440, 280));
    write(
      path.join(OUT.promo, locale, 'marquee_1400x560.png'),
      await renderPng(plain, 'promo-marquee.html', { ICON, TAGLINE: cfg.tagline, SHOT: shotUri }, 1400, 560),
    );
  }
} finally {
  await plain.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
