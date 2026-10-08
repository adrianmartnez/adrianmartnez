/**
 * Capture profile-hero.gif (official README hero).
 * Fonts loaded only for local rasterization (not shipped for GitHub).
 * GIF is one-shot (repeat=-1): plays once, last frame persists.
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const captureDir = join(__dirname, 'capture');
const framesDir = join(captureDir, 'frames');
const locale = process.argv.includes('--es') ? 'es' : 'en';
const outGif = join(
  root,
  'assets/tribal',
  locale === 'es' ? 'profile-hero.es.gif' : 'profile-hero.gif',
);
const capturePage = locale === 'es' ? 'hero-capture.es.html' : 'hero-capture.html';
const portfolio = join(root, '..', 'portfolio-astro');

const WIDTH = 1100;
const HEIGHT = 380;
const FPS = 16;
/** Short natural settle after choreography; last frame persists (no infinite loop). */
const HOLD_MS = 450;
const MAX_WAIT_MS = 20000;

const require = createRequire(join(portfolio, 'package.json'));
const puppeteer = require('puppeteer');
const sharp = require('sharp');

const gifencMod = await import('gifenc');
const gifenc = gifencMod.default ?? gifencMod;
const { GIFEncoder, quantize, applyPalette } = gifenc;

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

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
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

      const rel = pathname === '/' ? '/hero-capture.html' : pathname;
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

/**
 * One-shot GIF: gifenc repeat=-1 omits Netscape loop extension → play once, hold last frame.
 */
async function encodeGif(framePaths, delayCs) {
  const gif = GIFEncoder();
  for (let i = 0; i < framePaths.length; i += 1) {
    const fp = framePaths[i];
    const { data, info } = await sharp(fp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    const isLast = i === framePaths.length - 1;
    gif.writeFrame(index, info.width, info.height, {
      palette,
      delay: isLast ? Math.max(delayCs, Math.round(HOLD_MS / 10)) : delayCs,
      dispose: 1,
      // First frame carries loop policy: -1 = once (no infinite loop).
      ...(i === 0 ? { repeat: -1 } : {}),
    });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

function hasNetscapeLoop(buf) {
  // NETSCAPE2.0 application extension
  const sig = Buffer.from('NETSCAPE2.0');
  return buf.includes(sig);
}

async function main() {
  for (const [url, file] of Object.entries(FONT_MAP)) {
    if (!existsSync(file)) throw new Error(`Missing capture font ${url} → ${file}`);
  }

  mkdirSync(framesDir, { recursive: true });
  for (const f of readdirSync(framesDir)) {
    rmSync(join(framesDir, f), { force: true });
  }

  const { server, port } = await startStaticServer(captureDir);
  const url = `http://127.0.0.1:${port}/${capturePage}`;
  console.log('Serving', url, '→', outGif);

  const chromePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
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
    writeFileSync(outGif, gifBuf);

    const animOnlyMs = meta?.totalDurationMs ?? (framePaths.length - 1) * (1000 / FPS);
    const report = {
      out: outGif,
      bytes: gifBuf.length,
      mb: +(gifBuf.length / (1024 * 1024)).toFixed(3),
      width: WIDTH,
      height: HEIGHT,
      frames: framePaths.length,
      fps: FPS,
      holdMs: HOLD_MS,
      animatedDurationMs: animOnlyMs,
      approxTotalMs: Math.round(animOnlyMs + HOLD_MS),
      loop: 'once (gifenc repeat=-1, no NETSCAPE2.0 extension)',
      hasNetscapeLoop: hasNetscapeLoop(gifBuf),
      heroMeta: meta,
      fonts: {
        sans: meta?.fontSans || null,
        mono: meta?.fontMono || null,
        sources: Object.keys(FONT_MAP),
      },
    };
    writeFileSync(join(captureDir, 'capture-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));

    if (hasNetscapeLoop(gifBuf)) {
      throw new Error('GIF unexpectedly contains NETSCAPE loop extension');
    }
    if (gifBuf.length > 5 * 1024 * 1024) {
      console.warn('WARNING: GIF exceeds 5MB target');
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
