/**
 * Build EN/ES README visual modules (simplified).
 * Structure: lang tiles → hero GIF → body (About + Stack + Connect header)
 *            → portfolio link → LinkedIn link.
 * No Selected Work / project cards.
 */
import { mkdirSync, writeFileSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outRoot = join(root, 'assets', 'readme');

const W = 1100;
const SAFE = 40;
const CONTENT_W = W - SAFE * 2;
/** Minimal chrome for EN/ES — must not read as a floating empty band. */
const HEADER_H = 20;
const LANG_W = 44;

const SPACE = { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 };

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

const LINKEDIN = 'https://www.linkedin.com/in/adrian-martinez-martin';
const PORTFOLIO = 'https://adrianmartnez.dev';

const copy = {
  en: {
    dir: 'en',
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
    connectLabel: '03 / CONNECT',
    portfolioLabel: 'PORTFOLIO',
    linkedinLabel: 'LINKEDIN',
  },
  es: {
    dir: 'es',
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
    connectLabel: '03 / CONTACTO',
    portfolioLabel: 'PORTFOLIO',
    linkedinLabel: 'LINKEDIN',
  },
};

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapText(text, maxWidth, fontSize, avg = 0.54) {
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
  if (lines.length >= 2 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    const prev = lines.pop().split(/\s+/);
    if (prev.length > 1) {
      const moved = prev.pop();
      lines.push(prev.join(' '));
      lines.push(`${moved} ${last}`);
    } else {
      lines.push(prev.join(' '), last);
    }
  }
  return lines;
}

function shell(h, body, aria) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${escapeXml(aria)}">
  <title>${escapeXml(aria)}</title>
  <rect width="${W}" height="${h}" fill="${C.paper}"/>
  ${body}
</svg>
`;
}

function write(dir, name, svg) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), svg, 'utf8');
}

function buildLangTile(code, active) {
  const fill = active ? C.ink : C.muted;
  const weight = active ? '600' : '400';
  const underline = active
    ? `<line x1="8" y1="${HEADER_H - 3}" x2="${LANG_W - 8}" y2="${HEADER_H - 3}" stroke="${C.accent}" stroke-width="2"/>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${LANG_W}" height="${HEADER_H}" viewBox="0 0 ${LANG_W} ${HEADER_H}" role="img" aria-label="${code}">
  <rect width="${LANG_W}" height="${HEADER_H}" fill="${C.paper}"/>
  <text x="${LANG_W / 2}" y="14" text-anchor="middle" fill="${fill}" font-family="${FONT_MONO}" font-size="11" font-weight="${weight}" letter-spacing="0.12em">${code}</text>
  ${underline}
</svg>
`;
}

/** Full-width black pad left of EN/ES (same cell as hero; height = HEADER_H only). */
function buildLangPad() {
  const padW = W - LANG_W * 2;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${padW}" height="${HEADER_H}" viewBox="0 0 ${padW} ${HEADER_H}" aria-hidden="true">
  <rect width="${padW}" height="${HEADER_H}" fill="${C.paper}"/>
</svg>
`;
}

/** Single continuous surface: About → Stack → Connect header. */
function buildBody(c) {
  const parts = [];
  let y = SPACE.lg;

  // 01 / ABOUT
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12" letter-spacing="0.08em">${escapeXml(c.aboutLabel)}</text>`,
  );
  y += SPACE.lg + SPACE.xs;
  const bodyFs = 18;
  const lh = 28;
  for (const para of c.about) {
    for (const line of wrapText(para, CONTENT_W, bodyFs, 0.51)) {
      parts.push(
        `<text x="${SAFE}" y="${y}" fill="${C.text}" font-family="${FONT_SANS}" font-size="${bodyFs}" letter-spacing="-0.012em">${escapeXml(line)}</text>`,
      );
      y += lh;
    }
    y += SPACE.sm;
  }
  y += SPACE.md;

  // Divider before stack
  parts.push(
    `<line x1="${SAFE}" y1="${y}" x2="${W - SAFE}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`,
  );
  y += SPACE.lg + SPACE.xs;

  // 02 / STACK
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
  y += SPACE.lg + SPACE.md + SPACE.sm;

  // Divider before connect
  parts.push(
    `<line x1="${SAFE}" y1="${y}" x2="${W - SAFE}" y2="${y}" stroke="${C.line}" stroke-width="1"/>`,
  );
  y += SPACE.lg + SPACE.xs;

  // 03 / CONNECT header (links are separate clickable SVGs below)
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12" letter-spacing="0.08em">${escapeXml(c.connectLabel)}</text>`,
  );
  y += SPACE.lg;

  return shell(y, parts.join('\n  '), `${c.aboutLabel} | ${c.stackLabel} | ${c.connectLabel}`);
}

function buildConnectRow(label, value, aria, { bottomPad = SPACE.sm } = {}) {
  const labelY = SPACE.sm;
  const valueY = SPACE.sm + SPACE.lg;
  const h = valueY + bottomPad;
  const body = `
  <text x="${SAFE}" y="${labelY}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12" letter-spacing="0.08em">${escapeXml(label)}</text>
  <text x="${SAFE}" y="${valueY}" fill="${C.ink}" font-family="${FONT_SANS}" font-size="16">${escapeXml(value)}</text>
`;
  return shell(h, body, aria);
}

/** Assets that must not remain after simplify. */
const OBSOLETE = [
  'header-fill.svg',
  'header-brand.svg',
  'about.svg',
  'stack.svg',
  'work-header.svg',
  'project-collibra.svg',
  'project-purview.svg',
  'project-provider.svg',
  'connect-header.svg',
  'focus-tooling.svg',
  'links.svg',
];

const manifest = {
  width: W,
  header: { langW: LANG_W, height: HEADER_H, padW: W - LANG_W * 2 },
  locales: {},
  structure: ['lang-pad', 'lang-en', 'lang-es', 'hero', 'body', 'connect-portfolio', 'connect-linkedin'],
};

for (const locale of ['en', 'es']) {
  const c = copy[locale];
  const dir = join(outRoot, c.dir);
  mkdirSync(dir, { recursive: true });

  for (const name of OBSOLETE) {
    try {
      rmSync(join(dir, name), { force: true });
    } catch {}
  }

  write(dir, 'lang-pad.svg', buildLangPad());
  write(dir, 'lang-en.svg', buildLangTile('EN', locale === 'en'));
  write(dir, 'lang-es.svg', buildLangTile('ES', locale === 'es'));
  write(dir, 'body.svg', buildBody(c));
  write(dir, 'connect-portfolio.svg', buildConnectRow(c.portfolioLabel, 'adrianmartnez.dev', 'Portfolio'));
  write(
    dir,
    'connect-linkedin.svg',
    buildConnectRow(c.linkedinLabel, 'linkedin.com/in/adrian-martinez-martin', 'LinkedIn', {
      bottomPad: SPACE.xl + SPACE.lg, // 56 — air under LinkedIn
    }),
  );

  // Remove any leftover unexpected svgs that are obsolete
  if (existsSync(dir)) {
    for (const f of readdirSync(dir)) {
      if (
        OBSOLETE.includes(f) ||
        f.startsWith('project-') ||
        f === 'work-header.svg' ||
        f === 'header-fill.svg'
      ) {
        try {
          rmSync(join(dir, f), { force: true });
        } catch {}
      }
    }
  }

  manifest.locales[locale] = {
    dir: `assets/readme/${c.dir}`,
    portfolio: PORTFOLIO,
    linkedin: LINKEDIN,
  };
}

writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
