import { chromium } from '@playwright/test';
const [, , input, output, w, h] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
await page.goto('file://' + input);
await page.screenshot({ path: output, fullPage: true });
await browser.close();
