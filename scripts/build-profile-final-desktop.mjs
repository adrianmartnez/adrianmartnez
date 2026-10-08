/**
 * Build seamless desktop profile GIFs: existing one-shot hero frames + About/Stack
 * on one black canvas (no GitHub image seams between sections).
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const portfolio = join(root, '..', 'portfolio-astro');
const require = createRequire(join(portfolio, 'package.json'));
const sharp = require('sharp');

const gifencMod = await import('gifenc');
const gifenc = gifencMod.default ?? gifencMod;
const { GIFEncoder, quantize, applyPalette } = gifenc;

const W = 1100;
const HERO_H = 380;
const SAFE = 40;
const CONTENT_W = W - SAFE * 2;
const SPACE = { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 };
const C = {
  paper: '#000000',
  ink: '#ffffff',
  text: '#ececea',
  muted: '#a8a6a2',
  line: 'rgba(255,255,255,0.14)',
};
const FONT_SANS = 'system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
const FONT_MONO =
  'ui-monospace, SFMono-Regular, Cascadia Mono, Consolas, Liberation Mono, monospace';

const copy = {
  en: {
    hero: 'assets/tribal/profile-hero.gif',
    out: 'assets/profile-final/en/desktop.gif',
    aboutLabel: '01 / ABOUT',
    about: [
      '7 years working with product data integration, quality, and automation using Python, SQL/PostgreSQL, and APIs.',
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
    out: 'assets/profile-final/es/desktop.gif',
    aboutLabel: '01 / PERFIL',
    about: [
      'Siete años trabajando con integración, calidad y automatización de datos de producto mediante Python, SQL/PostgreSQL y APIs.',
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

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, maxWidth, fontSize, avg = 0.51) {
  const maxChars = Math.max(10, Math.floor(maxWidth / (fontSize * avg)));
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

/** About + Stack only (no Connect) — appended under hero on one canvas. */
function buildContentSvg(c) {
  const parts = [];
  let y = SPACE.lg;
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12" letter-spacing="0.08em">${escapeXml(c.aboutLabel)}</text>`,
  );
  y += SPACE.lg + SPACE.xs;
  const bodyFs = 18;
  const lh = 28;
  for (const para of c.about) {
    for (const line of wrapText(para, CONTENT_W, bodyFs)) {
      parts.push(
        `<text x="${SAFE}" y="${y}" fill="${C.text}" font-family="${FONT_SANS}" font-size="${bodyFs}" letter-spacing="-0.012em">${escapeXml(line)}</text>`,
      );
      y += lh;
    }
    y += SPACE.sm;
  }
  y += SPACE.md;
  parts.push(
    `<line x1="${SAFE}" y1="${y}" x2="${W - SAFE}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`,
  );
  y += SPACE.lg + SPACE.xs;
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12" letter-spacing="0.08em">${escapeXml(c.stackLabel)}</text>`,
  );
  y += SPACE.xl;
  const colW = CONTENT_W / 4;
  c.stack.forEach(([label, value], i) => {
    const x = SAFE + i * colW;
    parts.push(
      `<text x="${x}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12" letter-spacing="0.06em">${escapeXml(label)}</text>`,
    );
    parts.push(
      `<text x="${x}" y="${y + SPACE.lg}" fill="${C.text}" font-family="${FONT_SANS}" font-size="15">${escapeXml(value)}</text>`,
    );
  });
  y += SPACE.lg + SPACE.md + SPACE.lg;
  return {
    height: y,
    svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y}" viewBox="0 0 ${W} ${y}">
  <rect width="${W}" height="${y}" fill="${C.paper}"/>
  ${parts.join('\n  ')}
</svg>`,
  };
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

async function extractFrames(gifPath, outDir) {
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
  const delayCs = delays.length
    ? Math.max(2, Math.round((delays[0] || 62) / 10))
    : 6;
  return { paths, delayCs, pages };
}

async function buildLocale(locale) {
  const c = copy[locale];
  const heroPath = join(root, c.hero);
  if (!existsSync(heroPath)) throw new Error(`Missing hero ${heroPath}`);

  const { height: contentH, svg } = buildContentSvg(c);
  const contentPng = await sharp(Buffer.from(svg)).png().toBuffer();
  const totalH = HERO_H + contentH;

  const workDir = join(root, 'scripts/capture/profile-final-desktop', locale);
  const { paths, delayCs } = await extractFrames(heroPath, join(workDir, 'hero-frames'));
  const composedDir = join(workDir, 'composed');
  mkdirSync(composedDir, { recursive: true });
  for (const f of readdirSync(composedDir)) rmSync(join(composedDir, f), { force: true });

  const composed = [];
  for (let i = 0; i < paths.length; i += 1) {
    const out = join(composedDir, `frame-${String(i).padStart(4, '0')}.png`);
    await sharp({
      create: { width: W, height: totalH, channels: 3, background: { r: 0, g: 0, b: 0 } },
    })
      .composite([
        { input: paths[i], top: 0, left: 0 },
        { input: contentPng, top: HERO_H, left: 0 },
      ])
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
    height: totalH,
    heroHeight: HERO_H,
    contentHeight: contentH,
    frames: composed.length,
    hasNetscapeLoop: hasNetscapeLoop(gifBuf),
  };
  writeFileSync(join(dirname(outPath), 'desktop-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (hasNetscapeLoop(gifBuf)) throw new Error('Desktop GIF unexpectedly loops');
  return report;
}

const reports = {
  en: await buildLocale('en'),
  es: await buildLocale('es'),
};
writeFileSync(
  join(root, 'assets/profile-final/desktop-build-report.json'),
  JSON.stringify(reports, null, 2),
);
