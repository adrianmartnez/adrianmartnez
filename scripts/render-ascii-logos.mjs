/**
 * Rasterize Collibra/Purview ASCII logos with local Cascadia Mono (capture only).
 * Outputs PNGs embedded later as data URIs inside README SVGs (GitHub <img> SVGs
 * cannot load external image hrefs reliably).
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const portfolio = join(root, '..', 'portfolio-astro');
const outDir = join(root, 'assets', 'readme', 'ascii');
mkdirSync(outDir, { recursive: true });

const require = createRequire(join(portfolio, 'package.json'));
const puppeteer = require('puppeteer');

const BOX = 115;
const FONT = join(
  root,
  'node_modules/@fontsource/cascadia-mono/files/cascadia-mono-latin-400-normal.woff2',
);

const OPTICAL_MIN_ROW_DENSITY = 8;
const OPTICAL_MIN_COL_DENSITY = 8;

function asciiRenderMetrics(text) {
  const lines = text.split(/\r?\n/);
  let maxCols = 0;
  const rowDens = [];
  const colDens = [];
  let rawFirstRow = -1;
  let rawLastRow = -1;
  let rawFirstCol = Infinity;
  let rawLastCol = -1;

  for (let r = 0; r < lines.length; r++) {
    const line = lines[r] ?? '';
    if (line.length > maxCols) maxCols = line.length;
    let dens = 0;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c] ?? '';
      if (ch === ' ' || ch === '\t') continue;
      dens += 1;
      colDens[c] = (colDens[c] ?? 0) + 1;
      if (rawFirstRow < 0) rawFirstRow = r;
      rawLastRow = r;
      if (c < rawFirstCol) rawFirstCol = c;
      if (c > rawLastCol) rawLastCol = c;
    }
    rowDens[r] = dens;
  }
  while (colDens.length < maxCols) colDens.push(0);
  let firstRow = -1;
  let lastRow = -1;
  for (let r = 0; r < rowDens.length; r++) {
    if ((rowDens[r] ?? 0) >= OPTICAL_MIN_ROW_DENSITY) {
      if (firstRow < 0) firstRow = r;
      lastRow = r;
    }
  }
  let firstCol = -1;
  let lastCol = -1;
  for (let c = 0; c < colDens.length; c++) {
    if ((colDens[c] ?? 0) >= OPTICAL_MIN_COL_DENSITY) {
      if (firstCol < 0) firstCol = c;
      lastCol = c;
    }
  }
  if (firstRow < 0 || firstCol < 0) {
    firstRow = rawFirstRow;
    lastRow = rawLastRow;
    firstCol = rawFirstCol;
    lastCol = rawLastCol;
  }
  return { lines, firstRow, lastRow, firstCol, lastCol, visRows: lastRow - firstRow + 1, visCols: lastCol - firstCol + 1 };
}

function cropAscii(text) {
  const m = asciiRenderMetrics(text);
  const out = [];
  for (let r = m.firstRow; r <= m.lastRow; r++) {
    out.push((m.lines[r] ?? '').slice(m.firstCol, m.lastCol + 1));
  }
  return { text: out.join('\n'), m };
}

const jobs = [
  { key: 'collibra', file: join(root, 'assets/cards/collibra-ascii.txt') },
  { key: 'purview', file: join(root, 'assets/cards/purview-ascii.txt') },
];

const fontBuf = readFileSync(FONT);
const fontB64 = fontBuf.toString('base64');

const htmlPages = {};
for (const job of jobs) {
  const raw = readFileSync(job.file, 'utf8');
  const { text, m } = cropAscii(raw);
  htmlPages[`/${job.key}.html`] = `<!doctype html>
<html><head><meta charset="utf-8">
<style>
@font-face{font-family:'CascadiaMonoCap';src:url(data:font/woff2;base64,${fontB64}) format('woff2');font-weight:400;font-style:normal;}
html,body{margin:0;background:#000;}
.box{width:${BOX}px;height:${BOX}px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:#000;}
pre{
  margin:0;padding:0;color:#b8b6b2;background:transparent;white-space:pre;
  font-family:'CascadiaMonoCap',ui-monospace,monospace;
  font-size:12px;line-height:1;letter-spacing:0;
  font-variant-ligatures:none;font-feature-settings:'liga' 0;
  transform:scale(var(--s));transform-origin:center center;
}
</style></head>
<body>
<div class="box" id="box"><pre id="art">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</pre></div>
<script>
const box=${BOX};
const visCols=${m.visCols};
const visRows=${m.visRows};
const advance=0.55;
const ref=12;
const s=Math.min(box/(visCols*advance*ref), box/(visRows*ref));
document.getElementById('art').style.setProperty('--s', String(s));
window.__ready={s, visCols, visRows};
</script>
</body></html>`;
}

const server = await new Promise((resolve) => {
  const s = createServer((req, res) => {
    const u = new URL(req.url || '/', 'http://127.0.0.1');
    const page = htmlPages[u.pathname];
    if (!page) {
      res.writeHead(404);
      res.end('no');
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(page);
  });
  s.listen(0, '127.0.0.1', () => resolve(s));
});
const port = server.address().port;

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});

const meta = {};
for (const job of jobs) {
  const page = await browser.newPage();
  await page.setViewport({ width: BOX, height: BOX, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${port}/${job.key}.html`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 80));
  const info = await page.evaluate(() => window.__ready);
  const out = join(outDir, `${job.key}.png`);
  const buf = await page.screenshot({ type: 'png', omitBackground: false });
  writeFileSync(out, buf);
  meta[job.key] = { out, bytes: buf.length, box: BOX, scale: info.s, ...info };
  await page.close();
}

await browser.close();
server.close();
writeFileSync(join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
console.log(JSON.stringify(meta, null, 2));
if (!existsSync(FONT)) console.error('missing font', FONT);
