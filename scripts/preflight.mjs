#!/usr/bin/env node
//
// Pre-publication check for common Chrome Web Store violations.
// Mechanical checks on the production build and the store ZIP. It does NOT replace the manual
// review in PUBLISH-CHECKLIST.md, but catches what most often leads to rejection.
//
//   npm run zip && node scripts/preflight.mjs
//
// Codes: [PASS] ok · [WARN] inspect manually · [FAIL] publication blocker.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = join(ROOT, 'dist', 'chrome-mv3');
const EXPECTED_PERMISSIONS = ['storage', 'unlimitedStorage', 'contextMenus', 'activeTab'];
const LOCALES = ['en', 'ru'];

let fails = 0;
let warns = 0;
const pass = (msg) => console.log(`  [PASS] ${msg}`);
const warn = (msg) => {
  console.log(`  [WARN] ${msg}`);
  warns++;
};
const fail = (msg) => {
  console.log(`  [FAIL] ${msg}`);
  fails++;
};
const detail = (lines) => lines.slice(0, 10).forEach((line) => console.log(`        ${line}`));

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

console.log(`Preflight: ${ROOT}\n`);

if (!existsSync(join(BUILD, 'manifest.json'))) {
  console.log('  [FAIL] dist/chrome-mv3/manifest.json not found: run `npm run zip` first.');
  process.exit(1);
}

const manifest = readJson(join(BUILD, 'manifest.json'));
const pkg = readJson(join(ROOT, 'package.json'));
const lock = readJson(join(ROOT, 'package-lock.json'));
const files = walk(BUILD);
const jsFiles = files.filter((f) => f.endsWith('.js'));
const rel = (f) => relative(BUILD, f);

// 1. Permissions: exactly the justified list, no extra host access.
console.log('1) Permissions');
const perms = manifest.permissions ?? [];
const missing = EXPECTED_PERMISSIONS.filter((p) => !perms.includes(p));
const extra = perms.filter((p) => !EXPECTED_PERMISSIONS.includes(p));
if (missing.length === 0 && extra.length === 0) pass(`exactly ${JSON.stringify(EXPECTED_PERMISSIONS)}`);
else fail(`permissions differ from the justified list: missing ${JSON.stringify(missing)}, extra ${JSON.stringify(extra)}`);
for (const key of ['host_permissions', 'optional_permissions', 'optional_host_permissions']) {
  if (manifest[key]?.length) fail(`${key} is set: ${JSON.stringify(manifest[key])} (no justification written for it)`);
}
const scripts = manifest.content_scripts ?? [];
if (scripts.some((cs) => cs.all_frames)) fail('a content script has all_frames: true (the listing says main frame only)');
else pass(`content scripts, main frame only: ${JSON.stringify(scripts.flatMap((cs) => cs.matches))}`);

// 2. No remote code: no scripts or modules loaded from http(s), no remote sources in the CSP.
console.log('2) Remote code');
const remote = [];
const REMOTE_JS = /(?:import\s*\(\s*|importScripts\s*\(\s*|\bfrom\s*|\.src\s*=\s*)["'`]https?:\/\//g;
for (const f of jsFiles) {
  for (const m of readFileSync(f, 'utf8').matchAll(REMOTE_JS)) remote.push(`${rel(f)}: ${m[0]}`);
}
for (const f of files.filter((x) => x.endsWith('.html'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/<(?:script|link)\b[^>]*\b(?:src|href)\s*=\s*["']?https?:\/\/[^"'\s>]*/gi)) {
    remote.push(`${rel(f)}: ${m[0]}`);
  }
}
const csp = JSON.stringify(manifest.content_security_policy ?? '');
if (/https?:\/\//.test(csp)) remote.push(`manifest CSP: ${csp}`);
if (remote.length) {
  fail('remote script sources found:');
  detail(remote);
} else pass('no remote scripts, modules or CSP sources (remote code = No)');

// 3. No stray console.log. console.warn / console.error for failed translation and save are intended.
console.log('3) Debug output');
const logs = jsFiles.filter((f) => /console\.log\s*\(/.test(readFileSync(f, 'utf8'))).map(rel);
if (logs.length) {
  fail('console.log in the built js:');
  detail(logs);
} else pass('no console.log in the built js');

// 4. Production build, not the e2e one: the content-script shadow root must be closed.
console.log('4) Production build');
const content = join(BUILD, 'content-scripts', 'content.js');
if (!existsSync(content)) fail('content-scripts/content.js is missing');
else if (/mode\s*:\s*["'`]closed["'`]/.test(readFileSync(content, 'utf8'))) pass('content-script shadow root is closed');
else fail('content-script shadow root is not closed: is this the e2e build? Rebuild with `npm run zip`.');

// 5. Versions: manifest (written by WXT) = package.json = package-lock.json.
console.log('5) Versions');
const versions = { manifest: manifest.version, 'package.json': pkg.version, 'package-lock': lock.version, 'package-lock root': lock.packages?.['']?.version };
if (new Set(Object.values(versions)).size === 1 && manifest.version) pass(`all at ${manifest.version}`);
else fail(`versions differ: ${JSON.stringify(versions)} (rebuild, or bump with npm version)`);

// 6. Icons referenced by the manifest exist; 16, 48 and 128 are required by the store.
console.log('6) Icons');
const icons = manifest.icons ?? {};
const missingIcons = Object.values(icons).filter((p) => !existsSync(join(BUILD, p)));
const missingSizes = ['16', '48', '128'].filter((s) => !icons[s]);
if (missingIcons.length || missingSizes.length) fail(`icons missing: files ${JSON.stringify(missingIcons)}, sizes ${JSON.stringify(missingSizes)}`);
else pass(`icons ${Object.keys(icons).join('/')} in place`);

// 7. Locales: name and summary present and within the store limits.
console.log('7) Locales');
for (const locale of LOCALES) {
  const path = join(BUILD, '_locales', locale, 'messages.json');
  if (!existsSync(path)) {
    fail(`_locales/${locale}/messages.json is missing`);
    continue;
  }
  const messages = readJson(path);
  const name = messages.extName?.message ?? '';
  const description = messages.extDescription?.message ?? '';
  const nameLength = [...name].length;
  const descriptionLength = [...description].length;
  if (!name || nameLength > 75) fail(`${locale}: extName is empty or over 75 characters (${nameLength})`);
  if (!description || descriptionLength > 132) fail(`${locale}: extDescription is empty or over 132 characters (${descriptionLength})`);
  else pass(`${locale}: "${name}", summary ${descriptionLength}/132`);
}

// 8. The ZIP: right name, the same manifest, nothing that should not ship.
console.log('8) ZIP');
const zip = join(ROOT, 'dist', `${pkg.name}-${pkg.version}-chrome.zip`);
if (!existsSync(zip)) fail(`${relative(ROOT, zip)} not found: run \`npm run zip\``);
else {
  const entries = execFileSync('unzip', ['-Z1', zip], { encoding: 'utf8' }).split('\n').filter(Boolean);
  const stray = entries.filter((e) => /(^|\/)(tests?|node_modules|e2e)\//.test(e) || /\.(md|map)$|(^|\/)\.DS_Store$|\.(spec|test)\.[jt]s$/.test(e));
  if (stray.length) {
    fail('files that must not ship:');
    detail(stray);
  } else pass(`${relative(ROOT, zip)}: ${entries.length} files, no tests, *.md or maps`);
  const built = new Set(files.map(rel));
  const notInBuild = entries.filter((e) => !e.endsWith('/') && !built.has(e));
  const notInZip = [...built].filter((f) => !entries.includes(f));
  if (notInBuild.length || notInZip.length) {
    warn('the ZIP and dist/chrome-mv3 differ (stale zip? run `npm run zip` again):');
    detail([...notInBuild.map((e) => `only in zip: ${e}`), ...notInZip.map((e) => `only in build: ${e}`)]);
  }
  const zipped = JSON.parse(execFileSync('unzip', ['-p', zip, 'manifest.json'], { encoding: 'utf8' }));
  if (zipped.version !== pkg.version) fail(`manifest in the ZIP is ${zipped.version}, package.json is ${pkg.version}`);
  else if (JSON.stringify(zipped) !== JSON.stringify(manifest)) warn('manifest in the ZIP differs from dist/chrome-mv3/manifest.json');
  else pass(`manifest in the ZIP matches the build (${zipped.version})`);
}

console.log();
if (fails > 0) console.log(`RESULT: ${fails} blocker(s), ${warns} warning(s) — DO NOT publish while there are [FAIL].`);
else if (warns > 0) console.log(`RESULT: no blockers, ${warns} warning(s) — inspect [WARN] manually.`);
else console.log('RESULT: all clean.');
process.exit(fails > 0 ? 1 : 0);
