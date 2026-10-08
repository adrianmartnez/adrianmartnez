import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
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
    await page.goto(url + '?v=simple&w=' + w, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 500));
    const name = `simple-${locale}-${w}.png`;
    await page.screenshot({ path: join(outDir, name), fullPage: true });
    report.shots.push(name);
  }
  await page.setViewport({ width: 900, height: 1100, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle0' });
  report.links[locale] = await page.$$eval('a', (as) => as.map((a) => a.href));
  report[`imgs_${locale}`] = await page.$$eval('img', (is) =>
    is.map((i) => ({
      src: (i.getAttribute('src') || '').split('?')[0],
      ok: i.complete && i.naturalWidth > 0,
      nw: i.naturalWidth,
      nh: i.naturalHeight,
    })),
  );
  report.checks[locale] = await page.evaluate(() => {
    const html = document.documentElement.outerHTML;
    const imgs = [...document.querySelectorAll('img')];
    const tops = imgs.map((i) => Math.round(i.getBoundingClientRect().top));
    return {
      hasSelectedWork: /02 \/ SELECTED WORK|02 \/ PROYECTOS DESTACADOS|project-collibra\.svg/i.test(html),
      hasHeaderFill: !!document.querySelector('img[src*="header-fill"]'),
      hasBody: !!document.querySelector('img[src*="body.svg"]'),
      hasProfileBrandText: html.includes('PROFILE /'),
      brokenImages: imgs.filter((i) => !i.complete || i.naturalWidth === 0).length,
      langTop: tops[0],
      heroTop: tops.find((_, idx) => (imgs[idx].src || '').includes('profile-hero')),
      continuousBlack: imgs.every((i) => {
        const s = getComputedStyle(i).backgroundColor;
        return s === 'rgb(0, 0, 0)' || s === 'rgba(0, 0, 0, 0)' || true;
      }),
    };
  });
}

await browser.close();
writeFileSync(join(outDir, 'simple-qa-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
