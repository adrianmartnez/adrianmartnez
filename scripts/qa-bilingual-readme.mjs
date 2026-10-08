import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, 'capture');
mkdirSync(outDir, { recursive: true });
const require = createRequire(join(__dirname, '../../portfolio-astro/package.json'));
const puppeteer = require('puppeteer');

const widths = [900, 670, 400, 320];
const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});

const page = await browser.newPage();
const report = { links: {}, shots: [], checks: {} };

for (const locale of ['en', 'es']) {
  const url = locale === 'en' ? 'http://127.0.0.1:8780/' : 'http://127.0.0.1:8780/es';
  for (const w of widths) {
    await page.setViewport({ width: w, height: 900, deviceScaleFactor: 1 });
    await page.goto(url + '?v=final&w=' + w, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 700));
    const name = `micro-${locale}-${w}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: true });
    report.shots.push(name);
  }
  await page.setViewport({ width: 900, height: 1100, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  report.links[locale] = await page.$$eval('a', (as) => as.map((a) => a.href));
  const imgs = await page.$$eval('img', (is) =>
    is.map((i) => ({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0, nw: i.naturalWidth, nh: i.naturalHeight })),
  );
  report[`imgs_${locale}`] = imgs;
  report.checks[locale] = await page.evaluate(() => {
    return {
      hasProfileBrandText: document.documentElement.outerHTML.includes('PROFILE /'),
      hasHeaderFill: !!document.querySelector('img.fill, img[src*="header-fill"]'),
      gapBetweenHeaderHero: (() => {
        const header = document.querySelector('.header');
        const hero = document.querySelector('.stack > img');
        if (!header || !hero) return null;
        const hb = header.getBoundingClientRect();
        const hr = hero.getBoundingClientRect();
        return Math.round(hr.top - hb.bottom);
      })(),
      heroNaturalHeight: document.querySelector('.stack > img')?.naturalHeight ?? null,
    };
  });
}

await browser.close();
console.log(JSON.stringify(report, null, 2));
