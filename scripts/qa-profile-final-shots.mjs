import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../evidence/profile-final');
mkdirSync(outDir, { recursive: true });
const require = createRequire(join(__dirname, '../../portfolio-astro/package.json'));
const puppeteer = require('puppeteer');

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const page = await browser.newPage();
const shots = [];

for (const locale of ['en', 'es']) {
  const url = locale === 'en' ? 'http://127.0.0.1:8781/' : 'http://127.0.0.1:8781/es';
  for (const [label, w] of [
    ['desktop-900', 900],
    ['desktop-670', 670],
    ['mobile-400', 400],
    ['mobile-320', 320],
  ]) {
    await page.setViewport({ width: w, height: 1100, deviceScaleFactor: 1 });
    await page.goto(url + '?w=' + w, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 800));
    const diag = await page.evaluate(() => {
      const img = document.querySelector('img');
      return {
        viewport: window.innerWidth,
        currentSrc: img?.currentSrc || null,
        nw: img?.naturalWidth || 0,
        nh: img?.naturalHeight || 0,
      };
    });
    const name = `${locale}-${label}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: true });
    shots.push({ name, ...diag });
  }
}

await browser.close();
console.log(JSON.stringify(shots, null, 2));
