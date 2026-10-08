import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFileSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const portfolio = join(root, '..', 'portfolio-astro');
const require = createRequire(join(portfolio, 'package.json'));
const puppeteer = require('puppeteer');

const url = process.argv[2] || 'http://127.0.0.1:8765/assets/tribal/profile-hero.svg';
const out = process.argv[3] || join(root, 'scripts/capture/preview-svg.png');

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const page = await browser.newPage();
await page.setViewport({ width: 960, height: 620, deviceScaleFactor: 1 });
await page.goto(url, { waitUntil: 'networkidle0' });
await page.screenshot({ path: out, fullPage: true });
await browser.close();
console.log('Wrote', out);
