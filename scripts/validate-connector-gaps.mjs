/**
 * Measure horizontal gap between connector path end and callout label bbox (EN + ES).
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const captureDir = join(__dirname, 'capture');
const portfolio = join(root, '..', 'portfolio-astro');
const require = createRequire(join(portfolio, 'package.json'));
const puppeteer = require('puppeteer');

const FONT_MAP = {
  '/fonts/inter-latin-wght-normal.woff2': join(
    portfolio,
    'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  ),
  '/fonts/cascadia-mono-latin-400-normal.woff2': join(
    root,
    'node_modules/@fontsource/cascadia-mono/files/cascadia-mono-latin-400-normal.woff2',
  ),
  '/fonts/cascadia-mono-latin-500-normal.woff2': join(
    root,
    'node_modules/@fontsource/cascadia-mono/files/cascadia-mono-latin-500-normal.woff2',
  ),
};

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const u = new URL(req.url || '/', 'http://127.0.0.1');
      if (FONT_MAP[u.pathname]) {
        res.writeHead(200, { 'Content-Type': 'font/woff2', 'Access-Control-Allow-Origin': '*' });
        res.end(readFileSync(FONT_MAP[u.pathname]));
        return;
      }
      const file = join(captureDir, u.pathname === '/' ? 'hero-capture.html' : u.pathname.slice(1));
      if (!existsSync(file)) {
        res.writeHead(404);
        res.end('no');
        return;
      }
      const ext = extname(file);
      const mime =
        ext === '.html'
          ? 'text/html; charset=utf-8'
          : ext === '.json'
            ? 'application/json'
            : 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      res.end(readFileSync(file));
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const server = await startServer();
const port = server.address().port;
const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});

const report = {};
for (const pageName of ['hero-capture.html', 'hero-capture.es.html']) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 380, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/${pageName}`, { waitUntil: 'networkidle0', timeout: 30000 });
  await page.waitForFunction(() => document.documentElement.dataset.captureDone === '1', {
    timeout: 20000,
  });
  await new Promise((r) => setTimeout(r, 200));

  report[pageName] = await page.evaluate(() => {
    const root = document.querySelector('[data-hero-gov]');
    const svg = root.querySelector('.hero-gov__connectors');
    const vb = svg.viewBox.baseVal;
    const svgRect = svg.getBoundingClientRect();
    const out = [];
    for (const path of svg.querySelectorAll('path')) {
      const id = [...path.classList].find((c) => c.startsWith('hero-gov__line--'))?.replace(
        'hero-gov__line--',
        '',
      );
      const d = path.getAttribute('d') || '';
      const m = d.match(/L\s+([\d.]+)\s+([\d.]+)\s*$/);
      if (!m) continue;
      const endXpct = +m[1];
      const endYpct = +m[2];
      const endX = svgRect.left + (endXpct / 100) * svgRect.width;
      const endY = svgRect.top + (endYpct / 100) * svgRect.height;
      const callout = root.querySelector(`[data-hero-gov-id="${id}"]`);
      const label = callout?.querySelector('.hero-gov__label');
      const lines = [...(label?.querySelectorAll('[data-hero-gov-line]') || [])];
      if (!lines.length) continue;
      // Ink bbox from glyph ranges (paragraphs are full label width)
      let inkLeft = Infinity;
      let inkRight = -Infinity;
      let inkTop = Infinity;
      let inkBottom = -Infinity;
      for (const el of lines) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const r = range.getBoundingClientRect();
        if (!r.width && !r.height) continue;
        inkLeft = Math.min(inkLeft, r.left);
        inkRight = Math.max(inkRight, r.right);
        inkTop = Math.min(inkTop, r.top);
        inkBottom = Math.max(inkBottom, r.bottom);
      }
      const side = callout.classList.contains('hero-gov__callout--side-right') ? 'right' : 'left';
      const gap = side === 'right' ? inkLeft - endX : endX - inkRight;
      out.push({
        id,
        side,
        endXpct,
        endYpct,
        gapPx: +gap.toFixed(1),
        ink: {
          left: +inkLeft.toFixed(1),
          right: +inkRight.toFixed(1),
          top: +inkTop.toFixed(1),
          bottom: +inkBottom.toFixed(1),
        },
        lineThroughInkBand: endY >= inkTop && endY <= inkBottom,
      });
    }
    return out;
  });

  const shot = join(captureDir, `connector-final-${pageName.includes('.es') ? 'es' : 'en'}.png`);
  await page.screenshot({ path: shot, type: 'png' });
  await page.close();
}

await browser.close();
server.close();
console.log(JSON.stringify(report, null, 2));
