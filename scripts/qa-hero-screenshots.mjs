/**
 * QA final-frame GIF at ~900 / 670 / 400 px widths.
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(__dirname, 'capture');
const portfolio = join(root, '..', 'portfolio-astro');
const require = createRequire(join(portfolio, 'package.json'));
const puppeteer = require('puppeteer');

mkdirSync(outDir, { recursive: true });

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const file = join(root, decodeURIComponent(url.pathname));
      if (!file.startsWith(root)) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      try {
        const body = readFileSync(file);
        const ext = extname(file);
        const type =
          ext === '.gif'
            ? 'image/gif'
            : ext === '.svg'
              ? 'image/svg+xml'
              : 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': type });
        res.end(body);
      } catch (e) {
        res.writeHead(404);
        res.end(String(e));
      }
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function shoot(page, port, width, outName) {
  const height = Math.round((width * 420) / 1100) + 48;
  await page.setViewport({ width: width + 48, height, deviceScaleFactor: 2 });
  const html = `<!doctype html><html><body style="margin:0;background:#111;display:flex;justify-content:center;padding:16px">
      <img id="h" src="http://127.0.0.1:${port}/assets/tribal/profile-hero.gif" width="${width}" style="display:block;background:#000"/>
    </body></html>`;
  await page.setContent(html, { waitUntil: 'load', timeout: 15000 });
  await page.waitForFunction(() => {
    const img = document.getElementById('h');
    return img && img.complete && img.naturalWidth > 0;
  }, { timeout: 15000 });
  // Wait for animation to finish (~5s) so QA shows final persistent frame.
  await new Promise((r) => setTimeout(r, 6200));
  const el = await page.$('#h');
  const out = join(outDir, outName);
  await el.screenshot({ path: out, type: 'png' });
  console.log('Wrote', out);
  return out;
}

const { server, port } = await startServer();
const browser = await puppeteer.launch({
  headless: true,
  executablePath:
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});

try {
  const page = await browser.newPage();
  const widths = [
    [900, 'qa-gif-900.png'],
    [670, 'qa-gif-670.png'],
    [400, 'qa-gif-400.png'],
  ];
  const outs = {};
  for (const [w, name] of widths) {
    outs[w] = await shoot(page, port, w, name);
  }

  // SVG connector gap check (auxiliary asset)
  await page.goto(`http://127.0.0.1:${port}/assets/tribal/profile-hero.svg`, {
    waitUntil: 'load',
    timeout: 15000,
  });
  const svgQa = await page.evaluate(() => {
    const svg = document.querySelector('svg');
    const vb = svg.viewBox.baseVal;
    const name = [...document.querySelectorAll('text')].find((t) =>
      t.textContent.includes('Adrián'),
    );
    const eyebrow = [...document.querySelectorAll('text')].find((t) =>
      t.textContent.includes('DATA GOVERNANCE · DATA QUALITY'),
    );
    const nameBox = name.getBBox();
    const eyebrowBox = eyebrow ? eyebrow.getBBox() : null;
    const callouts = [...document.querySelectorAll('[data-callout]')].map((g) => {
      const b = g.getBBox();
      return { id: g.getAttribute('data-callout'), x: b.x, y: b.y, r: b.x + b.width, b: b.y + b.height };
    });
    const paths = [...document.querySelectorAll('#connectors path')].map((p, i) => {
      const b = p.getBBox();
      return { i, x: b.x, y: b.y, r: b.x + b.width, b: b.y + b.height };
    });
    const pad = 28;
    const inBox = (x, y, r, btm) =>
      x >= pad - 1 && y >= pad - 1 && r <= vb.width - pad + 1 && btm <= vb.height - pad + 1;
    const clips = [];
    for (const c of callouts) {
      if (!inBox(c.x, c.y, c.r, c.b)) clips.push({ type: 'callout', id: c.id });
    }
    for (const p of paths) {
      if (!inBox(p.x, p.y, p.r, p.b)) clips.push({ type: 'path', i: p.i });
    }
    const overlaps = [];
    for (const c of callouts) {
      for (const p of paths) {
        const ix = Math.max(c.x, p.x);
        const iy = Math.max(c.y, p.y);
        const ir = Math.min(c.r, p.r);
        const ib = Math.min(c.b, p.b);
        const w = ir - ix;
        const h = ib - iy;
        if (w > 8 && h > 6) overlaps.push({ callout: c.id, path: p.i, w, h });
      }
    }
    const leftMax = 32 + Math.round((1100 - 64) * 0.37);
    const overlapsLeft = callouts.filter((c) => c.x < leftMax - 8);
    return {
      viewBox: { w: vb.width, h: vb.height },
      nameSingleLine: nameBox.height < 40,
      eyebrowSingleLine: eyebrowBox ? eyebrowBox.height < 20 : false,
      eyebrowWidth: eyebrowBox?.width ?? null,
      nameWidth: nameBox.width,
      pathTextOverlaps: overlaps,
      zeroPathTextOverlap: overlaps.length === 0,
      clips,
      zeroClipping: clips.length === 0,
      zeroOverlapLeft: overlapsLeft.length === 0,
      openToWork: document.documentElement.innerHTML.includes('open_to_work'),
    };
  });

  const gif = readFileSync(join(root, 'assets/tribal/profile-hero.gif'));
  const report = {
    outs,
    svgQa,
    gif: {
      bytes: gif.length,
      hasNetscapeLoop: gif.includes(Buffer.from('NETSCAPE2.0')),
      dims: `${gif.readUInt16LE(6)}x${gif.readUInt16LE(8)}`,
    },
  };
  writeFileSync(join(outDir, 'qa-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
  server.close();
}
