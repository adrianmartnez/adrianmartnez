/**
 * Capture GitHub-rendered branch README at multiple viewports + measure widths/currentSrc.
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../evidence/profile-final/github-v3');
mkdirSync(outDir, { recursive: true });
const require = createRequire(join(__dirname, '../../portfolio-astro/package.json'));
const puppeteer = require('puppeteer');

const URL =
  'https://github.com/adrianmartnez/adrianmartnez/blob/fix/seamless-responsive-profile/README.md';
const widths = [320, 375, 400, 480, 520, 600, 670, 768, 900, 1200];

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});
const page = await browser.newPage();
const report = [];

for (const w of widths) {
  await page.setViewport({ width: w, height: 1600, deviceScaleFactor: 1 });
  await page.goto(URL + '?v=v3&w=' + w, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1400));

  const data = await page.evaluate(() => {
    const root = document.querySelector('#readme, article, .markdown-body');
    const picture = root?.querySelector('picture');
    const sources = [...(picture?.querySelectorAll('source') || [])].map((s) => ({
      media: s.getAttribute('media'),
      srcset: s.getAttribute('srcset'),
    }));
    const img = picture?.querySelector('img') || root?.querySelector('img');
    const imgRect = img?.getBoundingClientRect();
    const src = img?.currentSrc || '';
    let variant = 'unknown';
    if (src.includes('mobile')) variant = 'mobile';
    else if (src.includes('intermediate')) variant = 'intermediate';
    else if (src.includes('desktop')) variant = 'desktop';
    return {
      viewport: window.innerWidth,
      match520: window.matchMedia('(max-width: 520px)').matches,
      match900: window.matchMedia('(max-width: 900px)').matches,
      sources,
      variant,
      currentSrc: src,
      naturalWidth: img?.naturalWidth || 0,
      naturalHeight: img?.naturalHeight || 0,
      displayedWidth: imgRect ? Math.round(imgRect.width) : null,
      displayedHeight: imgRect ? Math.round(imgRect.height) : null,
      scale:
        img && imgRect && img.naturalWidth ? +(imgRect.width / img.naturalWidth).toFixed(3) : null,
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
