/**
 * Capture GitHub-rendered branch README at multiple viewports + measure widths/currentSrc.
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../evidence/profile-final/github-v2');
mkdirSync(outDir, { recursive: true });
const require = createRequire(join(__dirname, '../../portfolio-astro/package.json'));
const puppeteer = require('puppeteer');

const URL =
  'https://github.com/adrianmartnez/adrianmartnez/blob/fix/seamless-responsive-profile/README.md';
const widths = [320, 375, 400, 600, 670, 768, 900];

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const page = await browser.newPage();
const report = [];

for (const w of widths) {
  await page.setViewport({ width: w, height: 1400, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1200));

  const data = await page.evaluate(() => {
    const root = document.querySelector('#readme, article, .markdown-body');
    const picture = root?.querySelector('picture');
    const source = picture?.querySelector('source');
    const img = picture?.querySelector('img') || root?.querySelector('img');
    const imgRect = img?.getBoundingClientRect();
    return {
      viewport: window.innerWidth,
      match768: window.matchMedia('(max-width: 768px)').matches,
      match600: window.matchMedia('(max-width: 600px)').matches,
      sourceMedia: source?.getAttribute('media') || null,
      currentSrc: img?.currentSrc || null,
      naturalWidth: img?.naturalWidth || 0,
      naturalHeight: img?.naturalHeight || 0,
      displayedWidth: imgRect ? Math.round(imgRect.width) : null,
      displayedHeight: imgRect ? Math.round(imgRect.height) : null,
      scale: img && imgRect && img.naturalWidth ? +(imgRect.width / img.naturalWidth).toFixed(3) : null,
    };
  });

  const name = `readme-${w}.png`;
  await page.screenshot({ path: join(outDir, name), fullPage: true });
  report.push({ shot: name, ...data });
  console.log(JSON.stringify(report[report.length - 1]));
}

writeFileSync(join(outDir, 'width-report.json'), JSON.stringify(report, null, 2));
await browser.close();
console.log('wrote', join(outDir, 'width-report.json'));
