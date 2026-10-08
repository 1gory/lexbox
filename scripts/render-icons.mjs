// Renders store/icon/*.svg into the PNG sizes the extension and the Chrome Web Store need.
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const jobs = [
  // Store icon: 96px artwork with 16px transparent padding, per Chrome Web Store guidelines.
  { svg: 'store/icon/icon.svg', sizes: [128, 96], dir: 'public/icon' },
  // Toolbar sizes: full-bleed so the mark stays legible at 16px.
  { svg: 'store/icon/icon-small.svg', sizes: [48, 32, 16], dir: 'public/icon' },
  { svg: 'store/icon/icon.svg', sizes: [1024], dir: 'store/icon', name: 'icon-1024.png' },
];

const browser = await chromium.launch();
for (const job of jobs) {
  const svg = fs.readFileSync(path.join(root, job.svg), 'utf8');
  for (const size of job.sizes) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    await page.setContent(`<html><body style="margin:0">${svg.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
    const out = path.join(root, job.dir, job.name ?? `${size}.png`);
    await page.screenshot({ path: out, omitBackground: true });
    await page.close();
    console.log('wrote', path.relative(root, out));
  }
}
await browser.close();
