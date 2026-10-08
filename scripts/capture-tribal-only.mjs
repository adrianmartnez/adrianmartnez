/**
 * Capture isolated animated tribal GIF (no callouts / connectors / labels).
 * Source: assets/tribal/hero-tribal.txt + portfolio braille Dijkstra schedule
 * via scripts/capture/tribal-build.json (run hero:prepare first).
 * One-shot GIF; last frame persists.
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const captureDir = join(__dirname, 'capture');
const framesDir = join(captureDir, 'tribal-only-frames');
const outGif = join(root, 'assets/tribal/tribal-only.gif');
const capturePage = 'tribal-only-capture.html';
const portfolio = join(root, '..', 'portfolio-astro');

const WIDTH = 480;
const HEIGHT = 340;
const FPS = 16;
const HOLD_MS = 450;
const MAX_WAIT_MS = 12000;

const require = createRequire(join(portfolio, 'package.json'));
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const gifencMod = await import('gifenc');
const gifenc = gifencMod.default ?? gifencMod;
const { GIFEncoder, quantize, applyPalette } = gifenc;

const FONT_MAP = {
  '/fonts/cascadia-mono-latin-400-normal.woff2': join(
    root,
    'node_modules/@fontsource/cascadia-mono/files/cascadia-mono-latin-400-normal.woff2',
  ),
};

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
};

function startStaticServer(dir) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const pathname = url.pathname;

      if (FONT_MAP[pathname]) {
        const file = FONT_MAP[pathname];
        if (!existsSync(file)) {
          res.writeHead(404);
          res.end(`missing font ${pathname}`);
          return;
        }
        res.writeHead(200, {
          'Content-Type': 'font/woff2',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache',
        });
        res.end(readFileSync(file));
        return;
      }

      const rel = pathname === '/' ? `/${capturePage}` : pathname;
      const file = join(dir, decodeURIComponent(rel));
      if (!file.startsWith(dir)) {
        res.writeHead(403);
        res.end('forbidden');
        return;
      }
      try {
        const body = readFileSync(file);
        res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404);
        res.end('not found');
      }
    });
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({ server, port });
    });
  });
}

async function encodeGif(framePaths, delayCs) {
  const gif = GIFEncoder();
  for (let i = 0; i < framePaths.length; i += 1) {
    const { data, info } = await sharp(framePaths[i]).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    const isLast = i === framePaths.length - 1;
    gif.writeFrame(index, info.width, info.height, {
      palette,
      delay: isLast ? Math.max(delayCs, Math.round(HOLD_MS / 10)) : delayCs,
      dispose: 1,
      ...(i === 0 ? { repeat: -1 } : {}),
    });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

function hasNetscapeLoop(buf) {
  return buf.includes(Buffer.from('NETSCAPE2.0'));
}

async function main() {
  const buildJson = join(captureDir, 'tribal-build.json');
  if (!existsSync(buildJson)) {
    throw new Error('Missing scripts/capture/tribal-build.json — run: npm run hero:prepare');
  }
  for (const [url, file] of Object.entries(FONT_MAP)) {
    if (!existsSync(file)) throw new Error(`Missing capture font ${url} → ${file}`);
  }

  mkdirSync(framesDir, { recursive: true });
  for (const f of readdirSync(framesDir)) rmSync(join(framesDir, f), { force: true });

  const { server, port } = await startStaticServer(captureDir);
  const url = `http://127.0.0.1:${port}/${capturePage}`;
  console.log('Serving', url, '→', outGif);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath:
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', `--window-size=${WIDTH},${HEIGHT}`],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction(() => document.documentElement.dataset.captureReady === '1', {
      timeout: 15000,
    });

    const framePaths = [];
    const interval = Math.round(1000 / FPS);
    const started = Date.now();
    let i = 0;
    let doneAt = null;

    while (Date.now() - started < MAX_WAIT_MS) {
      const fp = join(framesDir, `frame-${String(i).padStart(4, '0')}.png`);
      const el = await page.$('[data-capture-root]');
      await el.screenshot({ path: fp, type: 'png', omitBackground: false });
      framePaths.push(fp);
      i += 1;

      const done = await page.evaluate(() => document.documentElement.dataset.captureDone === '1');
      if (done) {
        if (doneAt == null) doneAt = Date.now();
        if (Date.now() - doneAt >= HOLD_MS) break;
      }
      await new Promise((r) => setTimeout(r, interval));
    }

    const meta = await page.evaluate(() => window.__heroCapture || null);
    console.log('capture meta', meta);
    console.log('frames', framePaths.length);
    if (!framePaths.length) throw new Error('No frames captured');

    const delayCs = Math.max(2, Math.round(100 / FPS));
    const gifBuf = await encodeGif(framePaths, delayCs);
    mkdirSync(dirname(outGif), { recursive: true });
    writeFileSync(outGif, gifBuf);

    const report = {
      out: outGif,
      bytes: gifBuf.length,
      mb: +(gifBuf.length / (1024 * 1024)).toFixed(3),
      width: WIDTH,
      height: HEIGHT,
      frames: framePaths.length,
      fps: FPS,
      holdMs: HOLD_MS,
      loop: 'once (gifenc repeat=-1)',
      hasNetscapeLoop: hasNetscapeLoop(gifBuf),
      heroMeta: meta,
      excludes: ['callouts', 'connectors', 'labels', 'identity chrome'],
    };
    writeFileSync(join(captureDir, 'tribal-only-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));

    if (hasNetscapeLoop(gifBuf)) {
      throw new Error('GIF unexpectedly contains NETSCAPE loop extension');
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
