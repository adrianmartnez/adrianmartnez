/**
 * Build mobile-specific seamless profile GIFs (not a scaled desktop canvas).
 * Layout @400px: identity → centered tribal crop (animated) → callout chips → About → Stack.
 */
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
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

const W = 400;
const SAFE = 20;
const CONTENT_W = W - SAFE * 2;
const TRIBAL_W = 340;
/** Crop of tribal art from desktop 1100×380 hero (excludes side callout columns). */
const CROP = { left: 520, top: 36, width: 420, height: 300 };
const C = {
  paper: '#000000',
  ink: '#ffffff',
  text: '#ececea',
  muted: '#a8a6a2',
  accent: '#642a3a',
  line: 'rgba(255,255,255,0.14)',
};
const FONT_SANS = 'system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
const FONT_MONO =
  'ui-monospace, SFMono-Regular, Cascadia Mono, Consolas, Liberation Mono, monospace';

const copy = {
  en: {
    hero: 'assets/tribal/profile-hero.gif',
    out: 'assets/profile-final/en/mobile.gif',
    eyebrow: 'DATA GOVERNANCE · DATA QUALITY · METADATA · LINEAGE',
    name: 'Adrián Martínez Martín',
    role: 'Data Governance Engineer',
    terms: [
      'governance-as-code',
      'metadata / quality / lineage',
      'python / sql',
      'collibra / microsoft purview',
    ],
    callouts: ['REFERENCE', 'LINEAGE', 'TRACE PATH', 'QUALITY CHECK', 'METADATA'],
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
    out: 'assets/profile-final/es/mobile.gif',
    eyebrow: 'DATA GOVERNANCE · CALIDAD · METADATOS · LINAJE',
    name: 'Adrián Martínez Martín',
    role: 'Data Governance Engineer',
    terms: [
      'governance-as-code',
      'metadatos / calidad / linaje',
      'python / sql',
      'collibra / microsoft purview',
    ],
    callouts: ['REFERENCIA', 'LINAJE', 'TRAZA', 'CALIDAD', 'METADATOS'],
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

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, maxWidth, fontSize, avg = 0.52) {
  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * avg)));
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

function buildChromeSvg(c, tribalSlotH) {
  const parts = [];
  let y = 22;

  // Identity
  for (const line of wrapText(c.eyebrow, CONTENT_W, 9, 0.48)) {
    parts.push(
      `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="9" letter-spacing="0.04em">${escapeXml(line)}</text>`,
    );
    y += 12;
  }
  y += 6;
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.ink}" font-family="${FONT_SANS}" font-size="22" font-weight="650" letter-spacing="-0.03em">${escapeXml(c.name)}</text>`,
  );
  y += 26;
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.text}" font-family="${FONT_SANS}" font-size="14" font-weight="500">${escapeXml(c.role)}</text>`,
  );
  y += 18;
  parts.push(`<rect x="${SAFE}" y="${y}" width="120" height="1" fill="${C.line}"/>`);
  y += 18;
  for (const t of c.terms) {
    parts.push(
      `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12"><tspan fill="${C.accent}">&gt;</tspan><tspan dx="6">${escapeXml(t)}</tspan></text>`,
    );
    y += 18;
  }
  y += 10;

  const tribalTop = y;
  const tribalLeft = Math.round((W - TRIBAL_W) / 2);
  // Placeholder black region; tribal frames composited later
  parts.push(
    `<rect x="${tribalLeft}" y="${tribalTop}" width="${TRIBAL_W}" height="${tribalSlotH}" fill="${C.paper}"/>`,
  );
  y = tribalTop + tribalSlotH + 14;

  // Callout chips (simplified — readable on 320–400px)
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="10" letter-spacing="0.06em">${escapeXml(c.callouts.join(' · '))}</text>`,
  );
  y += 22;
  parts.push(`<line x1="${SAFE}" y1="${y}" x2="${W - SAFE}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`);
  y += 22;

  // About
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="11" letter-spacing="0.08em">${escapeXml(c.aboutLabel)}</text>`,
  );
  y += 20;
  for (const para of c.about) {
    for (const line of wrapText(para, CONTENT_W, 14, 0.52)) {
      parts.push(
        `<text x="${SAFE}" y="${y}" fill="${C.text}" font-family="${FONT_SANS}" font-size="14" letter-spacing="-0.01em">${escapeXml(line)}</text>`,
      );
      y += 20;
    }
    y += 8;
  }
  y += 6;
  parts.push(`<line x1="${SAFE}" y1="${y}" x2="${W - SAFE}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`);
  y += 22;

  // Stack — stacked rows for mobile
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="11" letter-spacing="0.08em">${escapeXml(c.stackLabel)}</text>`,
  );
  y += 22;
  for (const [label, value] of c.stack) {
    parts.push(
      `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="10" letter-spacing="0.06em">${escapeXml(label)}</text>`,
    );
    y += 16;
    parts.push(
      `<text x="${SAFE}" y="${y}" fill="${C.text}" font-family="${FONT_SANS}" font-size="14">${escapeXml(value)}</text>`,
    );
    y += 22;
  }
  y += 16;

  return {
    height: y,
    tribalTop,
    tribalLeft,
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

async function buildLocale(locale) {
  const c = copy[locale];
  const heroPath = join(root, c.hero);
  if (!existsSync(heroPath)) throw new Error(`Missing ${heroPath}`);

  const tribalSlotH = Math.round((TRIBAL_W / CROP.width) * CROP.height);
  const chrome = buildChromeSvg(c, tribalSlotH);
  const chromePng = await sharp(Buffer.from(chrome.svg)).png().toBuffer();

  const workDir = join(root, 'scripts/capture/profile-final-mobile', locale);
  const { paths, delayCs } = await extractHeroFrames(heroPath, join(workDir, 'hero-frames'));
  const composedDir = join(workDir, 'composed');
  mkdirSync(composedDir, { recursive: true });
  for (const f of readdirSync(composedDir)) rmSync(join(composedDir, f), { force: true });

  const composed = [];
  for (let i = 0; i < paths.length; i += 1) {
    const tribal = await sharp(paths[i])
      .extract(CROP)
      .resize(TRIBAL_W, tribalSlotH, { fit: 'fill' })
      .png()
      .toBuffer();

    const out = join(composedDir, `frame-${String(i).padStart(4, '0')}.png`);
    await sharp(chromePng)
      .composite([{ input: tribal, top: chrome.tribalTop, left: chrome.tribalLeft }])
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
    height: chrome.height,
    tribalSlot: { width: TRIBAL_W, height: tribalSlotH, crop: CROP },
    frames: composed.length,
    hasNetscapeLoop: hasNetscapeLoop(gifBuf),
    note: 'Mobile-specific vertical layout; tribal cropped from desktop hero frames (animation algorithm unchanged); callouts shown as compact chip row for legibility.',
  };
  writeFileSync(join(dirname(outPath), 'mobile-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (hasNetscapeLoop(gifBuf)) throw new Error('Mobile GIF unexpectedly loops');
  return report;
}

const reports = {
  en: await buildLocale('en'),
  es: await buildLocale('es'),
};
writeFileSync(
  join(root, 'assets/profile-final/mobile-build-report.json'),
  JSON.stringify(reports, null, 2),
);
