/**
 * Build EN/ES README visual modules (compact polish).
 * Header = black fill + independent EN/ES link tiles (right-aligned).
 * Featured cards use compact authentic ASCII icons (76px @ 1100 source).
 */
import { mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outRoot = join(root, 'assets', 'readme');
const asciiPngDir = join(outRoot, 'ascii');

const W = 1100;
const SAFE = 40;
const CONTENT_W = W - SAFE * 2;
const HEADER_H = 28;
const LANG_W = 56;
const FILL_W = W - LANG_W * 2; // 988 — black bar left of EN/ES (no brand text)
const ASCII_BOX = 76; // ~46px @670 — accompanies text, does not dominate

/**
 * Spacing scale @1100 design (~×0.61 when README shown at 670px).
 * Card targets at ~670: padX 14–18 → 26; padY ~10 → 16; logo gap ~11 → 18;
 * title→body 6–8 → 12; body→tags ~13–14 → 22; tags→link ~11 → 18.
 */
const SPACE = { xs: 8, sm: 12, md: 16, lg: 24, xl: 32 };
const CARD = {
  outerY: SPACE.sm, // stacked cards → ~24 design (~15px @670) between borders
  padX: 26,
  padY: SPACE.md, // 16 — compact but not clipped
  logoGap: 18, // proportional to smaller ASCII box
  titleToBody: SPACE.sm,
  bodyToTags: 22, // clear air after description before keywords
  tagsToLink: 18, // clear air keywords → link
};

const C = {
  paper: '#000000',
  ink: '#ffffff',
  text: '#ececea',
  muted: '#a8a6a2',
  accent: '#642a3a',
  line: 'rgba(255,255,255,0.14)',
  border: 'rgba(255,255,255,0.10)',
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
      '6+ years working with product data integration, quality, and automation using Python, SQL/PostgreSQL, and APIs.',
      'I now apply that experience to Data Governance, focusing on metadata, data quality, lineage, and traceability.',
    ],
    workLabel: '02 / SELECTED WORK',
    collibra: {
      title: 'Collibra Governance Automation',
      body: 'Python Governance-as-Code engine with a public Provider SDK, provenance, authority, lineage and impact analysis, and safe reconciliation.',
      tags: ['Provider SDK', 'Lineage & Impact', 'Safe Reconciliation'],
      href: 'https://github.com/adrianmartnez/collibra-governance-automation',
      host: 'github.com/adrianmartnez/collibra-governance-automation',
      ascii: 'collibra',
    },
    purview: {
      title: 'Microsoft Purview Governance Automation',
      body: 'Governance-as-Code for Microsoft Purview with Scanning & Classification, Unified Catalog, deterministic planning, and controlled apply.',
      tags: ['Unified Catalog', 'Scanning & Classification', 'Controlled Apply'],
      href: 'https://github.com/adrianmartnez/purview-governance-automation',
      host: 'github.com/adrianmartnez/purview-governance-automation',
      ascii: 'purview',
    },
    provider: {
      title: 'Governance Provider Example',
      body: 'Reference third-party provider demonstrating SDK\u00A0API\u00A01 discovery and conformance.',
      href: 'https://github.com/adrianmartnez/governance-provider-example',
      host: 'github.com/adrianmartnez/governance-provider-example',
    },
    stackLabel: '03 / TECHNICAL STACK',
    stack: [
      ['LANGUAGES', 'Python · SQL'],
      ['DATA', 'PostgreSQL'],
      ['PLATFORMS', 'Collibra · Microsoft Purview'],
      ['ENGINEERING', 'APIs · Docker · CI/CD'],
    ],
    connectLabel: '04 / CONNECT',
    portfolioLabel: 'PORTFOLIO',
    linkedinLabel: 'LINKEDIN',
  },
  es: {
    dir: 'es',
    aboutLabel: '01 / PERFIL',
    about: [
      'Más de seis años trabajando con integración, calidad y automatización de datos de producto mediante Python, SQL/PostgreSQL y APIs.',
      'Actualmente enfoco esa experiencia hacia Data Governance, especialmente metadatos, calidad del dato, linaje y trazabilidad.',
    ],
    workLabel: '02 / PROYECTOS DESTACADOS',
    collibra: {
      title: 'Collibra Governance Automation',
      body: 'Motor Governance-as-Code en Python con Provider SDK público, análisis de procedencia, autoridad, linaje e impacto, y reconciliación segura.',
      tags: ['Provider SDK', 'Linaje e impacto', 'Reconciliación segura'],
      href: 'https://github.com/adrianmartnez/collibra-governance-automation',
      host: 'github.com/adrianmartnez/collibra-governance-automation',
      ascii: 'collibra',
    },
    purview: {
      title: 'Microsoft Purview Governance Automation',
      body: 'Governance-as-Code para Microsoft Purview con Scanning & Classification, Unified Catalog, planificación determinista y aplicación controlada.',
      tags: ['Unified Catalog', 'Escaneo y clasificación', 'Aplicación controlada'],
      href: 'https://github.com/adrianmartnez/purview-governance-automation',
      host: 'github.com/adrianmartnez/purview-governance-automation',
      ascii: 'purview',
    },
    provider: {
      title: 'Governance Provider Example',
      body: 'Proveedor externo de referencia para demostrar el descubrimiento y las pruebas de conformidad de SDK\u00A0API\u00A01.',
      href: 'https://github.com/adrianmartnez/governance-provider-example',
      host: 'github.com/adrianmartnez/governance-provider-example',
    },
    stackLabel: '03 / TECNOLOGÍAS',
    stack: [
      ['LENGUAJES', 'Python · SQL'],
      ['DATOS', 'PostgreSQL'],
      ['PLATAFORMAS', 'Collibra · Microsoft Purview'],
      ['INGENIERÍA', 'APIs · Docker · CI/CD'],
    ],
    connectLabel: '04 / CONTACTO',
    portfolioLabel: 'PORTFOLIO',
    linkedinLabel: 'LINKEDIN',
  },
};

function loadAsciiDataUri(key) {
  const p = join(asciiPngDir, `${key}.png`);
  if (!existsSync(p)) {
    throw new Error(`Missing ASCII PNG ${p}. Run: node scripts/render-ascii-logos.mjs`);
  }
  return `data:image/png;base64,${readFileSync(p).toString('base64')}`;
}

const asciiDataUri = {
  collibra: null,
  purview: null,
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
  // Avoid orphan short last line (e.g. single digit) by pulling previous word down
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

function shell(h, body, aria, { topRule = false } = {}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${h}" viewBox="0 0 ${W} ${h}" role="img" aria-label="${escapeXml(aria)}">
  <title>${escapeXml(aria)}</title>
  <rect width="${W}" height="${h}" fill="${C.paper}"/>
  ${topRule ? `<line x1="${SAFE}" y1="0.5" x2="${W - SAFE}" y2="0.5" stroke="${C.line}" stroke-width="1"/>` : ''}
  ${body}
</svg>
`;
}

function tagsRow(tags, x, y) {
  return `<text x="${x}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="13" letter-spacing="0.02em">${escapeXml(tags.join(' · '))}</text>`;
}

function write(dir, name, svg) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, name), svg, 'utf8');
}

/** Full-width black fill (no brand text) so EN/ES sit on the right of one black bar. */
function buildHeaderFill() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${FILL_W}" height="${HEADER_H}" viewBox="0 0 ${FILL_W} ${HEADER_H}" role="img" aria-hidden="true">
  <rect width="${FILL_W}" height="${HEADER_H}" fill="${C.paper}"/>
</svg>
`;
}

function buildLangTile(code, active) {
  const fill = active ? C.ink : C.muted;
  const weight = active ? '600' : '400';
  const underline = active
    ? `<line x1="12" y1="24" x2="${LANG_W - 12}" y2="24" stroke="${C.accent}" stroke-width="2"/>`
    : '';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${LANG_W}" height="${HEADER_H}" viewBox="0 0 ${LANG_W} ${HEADER_H}" role="img" aria-label="${code}">
  <rect width="${LANG_W}" height="${HEADER_H}" fill="${C.paper}"/>
  <text x="${LANG_W / 2}" y="17" text-anchor="middle" fill="${fill}" font-family="${FONT_MONO}" font-size="12" font-weight="${weight}" letter-spacing="0.12em">${code}</text>
  ${underline}
</svg>
`;
}

function buildAbout(c) {
  let y = SPACE.lg;
  const parts = [];
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
  return shell(y, parts.join('\n  '), c.aboutLabel, { topRule: true });
}

function buildWorkHeader(label) {
  const h = SPACE.xl + SPACE.sm; // 44 — label + air before first card
  const body = `
  <text x="${SAFE}" y="${SPACE.lg}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12" letter-spacing="0.08em">${escapeXml(label)}</text>
`;
  return shell(h, body, label, { topRule: true });
}

/**
 * Shared Collibra/Purview card geometry — identical boxes, textX, padding.
 * Logo optically centered vs text block; height grows with content + padding.
 */
function buildFeaturedProject(p) {
  const asciiBox = ASCII_BOX;
  const titleFs = 22;
  const bodyFs = 16;
  const bodyLh = 26;

  const frameX = SAFE;
  const frameW = CONTENT_W;
  const logoX = frameX + CARD.padX;
  const textX = logoX + asciiBox + CARD.logoGap;
  const textW = frameX + frameW - CARD.padX - textX;

  const bodyLines = wrapText(p.body, textW, bodyFs, 0.505);

  // Text block height matches draw order (baselines only; tags sit on one line).
  const linkBlock = 12;
  const textInnerH =
    titleFs * 0.85 +
    CARD.titleToBody +
    bodyFs +
    (Math.max(bodyLines.length, 1) - 1) * bodyLh +
    CARD.bodyToTags +
    CARD.tagsToLink +
    linkBlock +
    4;

  const contentH = Math.max(asciiBox, textInnerH);
  const frameH = CARD.padY * 2 + contentH;
  const frameY = CARD.outerY;
  const svgH = frameY + frameH + CARD.outerY;

  const contentTop = frameY + CARD.padY;
  const logoY = contentTop + (contentH - asciiBox) / 2;
  const textTop = contentTop + (contentH - textInnerH) / 2;

  const parts = [];
  parts.push(
    `<rect x="${frameX}" y="${frameY}" width="${frameW}" height="${frameH}" fill="none" stroke="${C.border}" stroke-width="1"/>`,
  );
  parts.push(
    `<image href="${asciiDataUri[p.ascii]}" xlink:href="${asciiDataUri[p.ascii]}" x="${logoX}" y="${logoY.toFixed(1)}" width="${asciiBox}" height="${asciiBox}" preserveAspectRatio="xMidYMid meet"/>`,
  );

  let y = textTop + titleFs * 0.85;
  parts.push(
    `<text x="${textX}" y="${y.toFixed(1)}" fill="${C.ink}" font-family="${FONT_SANS}" font-size="${titleFs}" font-weight="650" letter-spacing="-0.03em">${escapeXml(p.title)}</text>`,
  );

  y += CARD.titleToBody + bodyFs;
  bodyLines.forEach((line, i) => {
    if (i > 0) y += bodyLh;
    parts.push(
      `<text x="${textX}" y="${y.toFixed(1)}" fill="${C.text}" font-family="${FONT_SANS}" font-size="${bodyFs}">${escapeXml(line)}</text>`,
    );
  });

  y += CARD.bodyToTags;
  parts.push(tagsRow(p.tags, textX, y));
  y += CARD.tagsToLink + 12;
  parts.push(
    `<text x="${textX}" y="${y.toFixed(1)}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12"><tspan fill="${C.accent}">→</tspan><tspan dx="8">${escapeXml(p.host)}</tspan></text>`,
  );

  return shell(svgH, parts.join('\n  '), p.title, { topRule: false });
}

function buildProviderSecondary(p) {
  let y = SPACE.lg; // air after Purview card (section rhythm)
  const parts = [];
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.ink}" font-family="${FONT_SANS}" font-size="17" font-weight="600" letter-spacing="-0.02em">${escapeXml(p.title)}</text>`,
  );
  y += SPACE.lg;
  const bodyFs = 15;
  const lh = 24;
  for (const line of wrapText(p.body, CONTENT_W * 0.96, bodyFs, 0.52)) {
    parts.push(
      `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_SANS}" font-size="${bodyFs}">${escapeXml(line)}</text>`,
    );
    y += lh;
  }
  y += SPACE.sm;
  parts.push(
    `<text x="${SAFE}" y="${y}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12"><tspan fill="${C.accent}">→</tspan><tspan dx="8">${escapeXml(p.host)}</tspan></text>`,
  );
  y += SPACE.md;
  return shell(y, parts.join('\n  '), p.title, { topRule: false });
}

function buildStack(c) {
  let y = SPACE.lg;
  const parts = [];
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
  return shell(y, parts.join('\n  '), c.stackLabel, { topRule: true });
}

function buildConnectRow(label, value, aria, { bottomPad = SPACE.sm } = {}) {
  const labelY = SPACE.md;
  const valueY = SPACE.md + SPACE.lg;
  const h = valueY + bottomPad;
  const body = `
  <text x="${SAFE}" y="${labelY}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12" letter-spacing="0.08em">${escapeXml(label)}</text>
  <text x="${SAFE}" y="${valueY}" fill="${C.ink}" font-family="${FONT_SANS}" font-size="16">${escapeXml(value)}</text>
`;
  return shell(h, body, aria, { topRule: false });
}

function buildConnectHeader(c) {
  const h = SPACE.xl;
  const body = `
  <text x="${SAFE}" y="${SPACE.lg}" fill="${C.muted}" font-family="${FONT_MONO}" font-size="12" letter-spacing="0.08em">${escapeXml(c.connectLabel)}</text>
`;
  return shell(h, body, c.connectLabel, { topRule: true });
}

for (const stale of ['header-brand.svg', 'about.svg', 'focus-tooling.svg', 'links.svg']) {
  try {
    rmSync(join(outRoot, stale), { force: true });
  } catch {}
}

asciiDataUri.collibra = loadAsciiDataUri('collibra');
asciiDataUri.purview = loadAsciiDataUri('purview');

const manifest = {
  width: W,
  header: { fillW: FILL_W, langW: LANG_W, height: HEADER_H },
  asciiBox: ASCII_BOX,
  asciiSource: {
    collibra: 'assets/cards/collibra-ascii.txt',
    purview: 'assets/cards/purview-ascii.txt',
  },
  locales: {},
  typography: {
    aboutBody: 18,
    projectTitle: 22,
    projectBody: 16,
    tags: 13,
    sectionLabel: 12,
  },
  spacing: { SPACE, CARD },
};

const fillSvg = buildHeaderFill();

for (const locale of ['en', 'es']) {
  const c = copy[locale];
  const dir = join(outRoot, c.dir);
  mkdirSync(dir, { recursive: true });

  // Remove obsolete brand asset if present
  try {
    rmSync(join(dir, 'header-brand.svg'), { force: true });
  } catch {}

  write(dir, 'header-fill.svg', fillSvg);
  write(dir, 'lang-en.svg', buildLangTile('EN', locale === 'en'));
  write(dir, 'lang-es.svg', buildLangTile('ES', locale === 'es'));
  write(dir, 'about.svg', buildAbout(c));
  write(dir, 'work-header.svg', buildWorkHeader(c.workLabel));
  write(dir, 'project-collibra.svg', buildFeaturedProject(c.collibra));
  write(dir, 'project-purview.svg', buildFeaturedProject(c.purview));
  write(dir, 'project-provider.svg', buildProviderSecondary(c.provider));
  write(dir, 'stack.svg', buildStack(c));
  write(dir, 'connect-header.svg', buildConnectHeader(c));
  write(dir, 'connect-portfolio.svg', buildConnectRow(c.portfolioLabel, 'adrianmartnez.dev', 'Portfolio'));
  write(
    dir,
    'connect-linkedin.svg',
    buildConnectRow(c.linkedinLabel, 'linkedin.com/in/adrian-martinez-martin', 'LinkedIn', {
      bottomPad: SPACE.xl + SPACE.lg, // 56 — enough air under LinkedIn before canvas end
    }),
  );

  manifest.locales[locale] = {
    dir: `assets/readme/${c.dir}`,
    portfolio: PORTFOLIO,
    linkedin: LINKEDIN,
    projects: [c.collibra.href, c.purview.href, c.provider.href],
  };
}

writeFileSync(join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify(manifest, null, 2));
