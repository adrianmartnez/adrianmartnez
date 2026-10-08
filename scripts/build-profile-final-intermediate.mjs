/**
 * Intermediate seamless profile GIF (~680px).
 * For tablet / mid viewports where mobile-v2 would upscale >~1.1×.
 * Does NOT modify mobile-v2 or desktop assets.
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync, rmSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const portfolio = join(root, '..', 'portfolio-astro');
const require = createRequire(join(portfolio, 'package.json'));
const sharp = require('sharp');
const puppeteer = require('puppeteer');

const gifencMod = await import('gifenc');
const gifenc = gifencMod.default ?? gifencMod;
const { GIFEncoder, quantize, applyPalette } = gifenc;

const W = 680;
const SAFE = 28;
const TRIBAL_W = 520;
const CROP = { left: 520, top: 36, width: 420, height: 300 };

const TYPE = {
  name: 34,
  role: 24,
  gac: 18,
  section: 16,
  about: 22,
  stackLabel: 15,
  stackValue: 20,
};

const C = {
  paper: '#000000',
  ink: '#ffffff',
  text: '#ececea',
  muted: '#a8a6a2',
  accent: '#642a3a',
  line: 'rgba(255,255,255,0.14)',
};

const FONT_MAP = {
  '/fonts/inter-latin-wght-normal.woff2': join(
    portfolio,
    'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  ),
  '/fonts/cascadia-mono-latin-400-normal.woff2': join(
    root,
    'node_modules/@fontsource/cascadia-mono/files/cascadia-mono-latin-400-normal.woff2',
  ),
};

const copy = {
  en: {
    hero: 'assets/tribal/profile-hero.gif',
    out: 'assets/profile-final/en/intermediate.gif',
    name: 'Adrián Martínez Martín',
    role: 'Data Governance Engineer',
    gac: 'governance-as-code',
    aboutLabel: '01 / ABOUT',
    about: [
      '6+ years working with product data integration, quality, and automation using Python, SQL/PostgreSQL, and APIs.',
      'I now apply that experience to Data Governance, focusing on metadata, data quality, lineage, and traceability.',
    ],
    stackLabel: '02 / TECHNICAL STACK',
    stack: [
      ['LANGUAGES', 'Python · SQL'],
      ['DATA', 'PostgreSQL'],
      ['PLATFORMS', 'Collibra · Microsoft Purview'],
      ['ENGINEERING', 'APIs · Docker · CI/CD'],
    ],
  },
  es: {
    hero: 'assets/tribal/profile-hero.es.gif',
    out: 'assets/profile-final/es/intermediate.gif',
    name: 'Adrián Martínez Martín',
    role: 'Data Governance Engineer',
    gac: 'governance-as-code',
    aboutLabel: '01 / PERFIL',
    about: [
      'Más de seis años trabajando con integración, calidad y automatización de datos de producto mediante Python, SQL/PostgreSQL y APIs.',
      'Actualmente enfoco esa experiencia hacia Data Governance, especialmente metadatos, calidad del dato, linaje y trazabilidad.',
    ],
    stackLabel: '02 / TECNOLOGÍAS',
    stack: [
      ['LENGUAJES', 'Python · SQL'],
      ['DATOS', 'PostgreSQL'],
      ['PLATAFORMAS', 'Collibra · Microsoft Purview'],
      ['INGENIERÍA', 'APIs · Docker · CI/CD'],
    ],
  },
};

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function chromeHtml(c, tribalSlotH) {
  const aboutHtml = c.about.map((p) => `<p class="about">${escapeHtml(p)}</p>`).join('');
  const stackHtml = c.stack
    .map(
      ([label, value]) =>
        `<div class="stack-row"><div class="stack-label">${escapeHtml(label)}</div><div class="stack-value">${escapeHtml(value)}</div></div>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'Inter Variable';
    font-style: normal;
    font-weight: 100 900;
    src: url('/fonts/inter-latin-wght-normal.woff2') format('woff2-variations');
  }
  @font-face {
    font-family: 'Cascadia Mono';
    font-style: normal;
    font-weight: 400;
    src: url('/fonts/cascadia-mono-latin-400-normal.woff2') format('woff2');
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: ${C.paper}; }
  #root {
    width: ${W}px;
    background: ${C.paper};
    color: ${C.text};
    padding: 32px ${SAFE}px 40px;
    font-family: 'Inter Variable', Inter, system-ui, sans-serif;
  }
  .name {
    color: ${C.ink};
    font-size: ${TYPE.name}px;
    font-weight: 650;
    letter-spacing: -0.03em;
    line-height: 1.12;
  }
  .role {
    margin-top: 10px;
    color: ${C.text};
    font-size: ${TYPE.role}px;
    font-weight: 500;
    letter-spacing: -0.01em;
    line-height: 1.25;
  }
  .gac {
    margin-top: 14px;
    color: ${C.muted};
    font-family: 'Cascadia Mono', ui-monospace, monospace;
    font-size: ${TYPE.gac}px;
    line-height: 1.35;
  }
  .gac .prompt { color: ${C.accent}; margin-right: 6px; }
  .tribal {
    margin: 24px auto 0;
    width: ${TRIBAL_W}px;
    height: ${tribalSlotH}px;
    background: ${C.paper};
  }
  .rule {
    margin: 28px 0 0;
    height: 1px;
    background: ${C.line};
    border: 0;
  }
  .section {
    margin-top: 22px;
    color: ${C.muted};
    font-family: 'Cascadia Mono', ui-monospace, monospace;
    font-size: ${TYPE.section}px;
    letter-spacing: 0.06em;
    line-height: 1.3;
  }
  .about {
    margin-top: 14px;
    color: ${C.text};
    font-size: ${TYPE.about}px;
    letter-spacing: -0.012em;
    line-height: 1.4;
    text-wrap: pretty;
    max-width: 620px;
  }
  .about + .about { margin-top: 12px; }
  .stack-grid {
    margin-top: 8px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 28px;
    row-gap: 4px;
  }
  .stack-row { margin-top: 14px; }
  .stack-label {
    color: ${C.muted};
    font-family: 'Cascadia Mono', ui-monospace, monospace;
    font-size: ${TYPE.stackLabel}px;
    letter-spacing: 0.05em;
    line-height: 1.3;
  }
  .stack-value {
    margin-top: 5px;
    color: ${C.text};
    font-size: ${TYPE.stackValue}px;
    letter-spacing: -0.01em;
    line-height: 1.3;
    text-wrap: pretty;
  }
</style></head>
<body>
  <div id="root" data-capture-root>
    <div class="name">${escapeHtml(c.name)}</div>
    <div class="role">${escapeHtml(c.role)}</div>
    <div class="gac"><span class="prompt">&gt;</span>${escapeHtml(c.gac)}</div>
    <div class="tribal" data-tribal-slot></div>
    <hr class="rule" />
    <div class="section">${escapeHtml(c.aboutLabel)}</div>
    ${aboutHtml}
    <hr class="rule" />
    <div class="section">${escapeHtml(c.stackLabel)}</div>
    <div class="stack-grid">${stackHtml}</div>
  </div>
</body></html>`;
}

function startFontServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      if (FONT_MAP[url.pathname]) {
        const file = FONT_MAP[url.pathname];
        if (!existsSync(file)) {
          res.writeHead(404);
          res.end('missing');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'font/woff2', 'Access-Control-Allow-Origin': '*' });
        res.end(readFileSync(file));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function hasNetscapeLoop(buf) {
  return buf.includes(Buffer.from('NETSCAPE2.0'));
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
      delay: isLast ? Math.max(delayCs, 45) : delayCs,
      dispose: 1,
      ...(i === 0 ? { repeat: -1 } : {}),
    });
  }
  gif.finish();
  return Buffer.from(gif.bytes());
}

async function extractHeroFrames(gifPath, outDir) {
  mkdirSync(outDir, { recursive: true });
  for (const f of readdirSync(outDir)) rmSync(join(outDir, f), { force: true });
  const meta = await sharp(gifPath, { animated: true, pages: -1 }).metadata();
  const pages = meta.pages || 1;
  const delays = meta.delay || [];
  const paths = [];
  for (let i = 0; i < pages; i += 1) {
    const fp = join(outDir, `frame-${String(i).padStart(4, '0')}.png`);
    await sharp(gifPath, { page: i, animated: false }).png().toFile(fp);
    paths.push(fp);
  }
  const delayCs = delays.length ? Math.max(2, Math.round((delays[0] || 62) / 10)) : 6;
  return { paths, delayCs };
}

async function renderChrome(browser, port, c, tribalSlotH, outPng) {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: 2200, deviceScaleFactor: 1 });
  const html = chromeHtml(c, tribalSlotH).replaceAll(
    "url('/fonts/",
    `url('http://127.0.0.1:${port}/fonts/`,
  );
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluateHandle('document.fonts.ready');
  await new Promise((r) => setTimeout(r, 120));
  const metrics = await page.evaluate(() => {
    const root = document.querySelector('#root');
    const tribal = document.querySelector('[data-tribal-slot]');
    return {
      rootH: Math.ceil(root.getBoundingClientRect().height),
      tribalTop: Math.round(tribal.getBoundingClientRect().top - root.getBoundingClientRect().top),
      tribalLeft: Math.round(tribal.getBoundingClientRect().left - root.getBoundingClientRect().left),
    };
  });
  const el = await page.$('#root');
  await el.screenshot({ path: outPng, type: 'png', omitBackground: false });
  await page.close();
  return metrics;
}

async function buildLocale(browser, port, locale) {
  const c = copy[locale];
  const heroPath = join(root, c.hero);
  if (!existsSync(heroPath)) throw new Error(`Missing ${heroPath}`);

  const tribalSlotH = Math.round((TRIBAL_W / CROP.width) * CROP.height);
  const workDir = join(root, 'scripts/capture/profile-final-intermediate', locale);
  mkdirSync(workDir, { recursive: true });
  const chromePng = join(workDir, 'chrome.png');
  const metrics = await renderChrome(browser, port, c, tribalSlotH, chromePng);

  const { paths, delayCs } = await extractHeroFrames(heroPath, join(workDir, 'hero-frames'));
  const composedDir = join(workDir, 'composed');
  mkdirSync(composedDir, { recursive: true });
  for (const f of readdirSync(composedDir)) rmSync(join(composedDir, f), { force: true });

  const chromeMeta = await sharp(chromePng).metadata();
  const composed = [];
  for (let i = 0; i < paths.length; i += 1) {
    const tribal = await sharp(paths[i])
      .extract(CROP)
      .resize(TRIBAL_W, tribalSlotH, { fit: 'fill' })
      .png()
      .toBuffer();
    const out = join(composedDir, `frame-${String(i).padStart(4, '0')}.png`);
    await sharp(chromePng)
      .composite([{ input: tribal, top: metrics.tribalTop, left: metrics.tribalLeft }])
      .png()
      .toFile(out);
    composed.push(out);
  }

  const gifBuf = await encodeGif(composed, delayCs);
  const outPath = join(root, c.out);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, gifBuf);

  const report = {
    locale,
    out: c.out,
    bytes: gifBuf.length,
    mb: +(gifBuf.length / (1024 * 1024)).toFixed(3),
    width: W,
    height: chromeMeta.height,
    type: TYPE,
    metrics,
    frames: composed.length,
    hasNetscapeLoop: hasNetscapeLoop(gifBuf),
  };
  writeFileSync(join(dirname(outPath), 'intermediate-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (hasNetscapeLoop(gifBuf)) throw new Error('Intermediate GIF unexpectedly loops');
  return report;
}

for (const [url, file] of Object.entries(FONT_MAP)) {
  if (!existsSync(file)) throw new Error(`Missing font ${url} → ${file}`);
}

const { server, port } = await startFontServer();
const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
});

try {
  const reports = {
    en: await buildLocale(browser, port, 'en'),
    es: await buildLocale(browser, port, 'es'),
  };
  writeFileSync(
    join(root, 'assets/profile-final/intermediate-build-report.json'),
    JSON.stringify(reports, null, 2),
  );
} finally {
  await browser.close();
  server.close();
}
