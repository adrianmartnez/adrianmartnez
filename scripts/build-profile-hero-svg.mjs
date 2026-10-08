/**
 * Build assets/tribal/profile-hero.svg (v2) — composition / scale / readability.
 * Visual system + tribal source unchanged from v1 / portfolio-astro.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const tribalPath = join(root, 'assets', 'tribal', 'hero-tribal.txt');
const outPath = join(root, 'assets', 'tribal', 'profile-hero.svg');

/** Horizontal README hero — v4 micro-polish (shorter canvas) */
const W = 1100;
const H = 420;
const SAFE = 32;

/** v1 tribal content width was 472px; target ~23% smaller → ~363 */
const V1_TRIBAL_W = 472;
const SCALE_VS_V1 = 0.77;

const COLORS = {
  paper: '#000000',
  ink: '#ffffff',
  text: '#ececea',
  muted: '#a8a6a2',
  accent: '#642a3a',
  line: 'rgba(255,255,255,0.16)',
};

const FONT_SANS = 'system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif';
const FONT_MONO =
  'ui-monospace, SFMono-Regular, Cascadia Mono, Consolas, Liberation Mono, monospace';

const ROWS = 34;
const COLS = 109;

/**
 * Callout routes as % of RIGHT stage (not full canvas).
 * Left-side labels stay in the right column's left band — never invade identity.
 */
const callouts = [
  {
    id: 'reference',
    title: 'REFERENCE',
    line1: 'NODE: SOURCE',
    line2: 'CLASS: REFERENCE_DATA',
    side: 'left',
    marker: { row: 5, col: 55 },
    // End sits just outside the label block (gap before text); no stroke through glyphs.
    elbow: { x: 28, y: 10 },
    end: { x: 24.5, y: 10 },
    label: { x: 3.5, y: 4, anchor: 'start' },
  },
  {
    id: 'lineage',
    title: 'LINEAGE',
    line1: 'EDGE: DERIVED_FROM',
    line2: 'PATH: TRACEABLE',
    side: 'left',
    marker: { row: 16, col: 36 },
    elbow: { x: 26, y: 46 },
    end: { x: 22.5, y: 46 },
    label: { x: 3.5, y: 40, anchor: 'start' },
  },
  {
    id: 'quality',
    title: 'QUALITY CHECK',
    line1: 'RULE: CONSISTENCY',
    line2: 'RESULT: PASS',
    side: 'right',
    marker: { row: 17, col: 56 },
    // ~18px gap; stub on title mid, not between title/meta.
    elbow: { x: 70, y: 14 },
    end: { x: 74, y: 14 },
    label: { x: 96.5, y: 12, anchor: 'end' },
  },
  {
    id: 'metadata',
    title: 'METADATA',
    line1: 'TERM: DOCUMENTED',
    line2: 'OWNER: ASSIGNED',
    side: 'right',
    marker: { row: 23, col: 72 },
    elbow: { x: 70, y: 68 },
    end: { x: 74, y: 68 },
    label: { x: 96.5, y: 66, anchor: 'end' },
  },
  {
    id: 'trace',
    title: 'TRACE PATH',
    line1: 'EDGE: SUPERSEDES',
    line2: 'STATE: CURRENT',
    side: 'left',
    marker: { row: 25, col: 45 },
    elbow: { x: 26, y: 86 },
    end: { x: 22.5, y: 86 },
    label: { x: 3.5, y: 80, anchor: 'start' },
  },
];

const terminalLines = [
  'governance-as-code',
  'metadata / quality / lineage',
  'python / sql',
  'collibra / microsoft purview',
];

function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellToPct(row, col) {
  return {
    x: +(((col + 0.5) / COLS) * 100).toFixed(2),
    y: +(((row + 0.5) / ROWS) * 100).toFixed(2),
  };
}

function readTribalLines() {
  const raw = readFileSync(tribalPath, 'utf8').replace(/\r\n/g, '\n').replace(/\n+$/, '');
  const lines = raw.split('\n');
  if (lines.length !== ROWS) {
    throw new Error(`Expected ${ROWS} rows, got ${lines.length}`);
  }
  for (const line of lines) {
    if ([...line].length !== COLS) {
      throw new Error(`Expected ${COLS} cols, got ${[...line].length}`);
    }
  }
  return lines;
}

function buildSvg(lines) {
  const contentW = W - SAFE * 2;
  const contentH = H - SAFE * 2;
  const leftW = Math.round(contentW * 0.37);
  const gap = 28;
  const rightW = contentW - leftW - gap;

  const left = { x: SAFE, y: SAFE, w: leftW, h: contentH };
  const right = { x: SAFE + leftW + gap, y: SAFE, w: rightW, h: contentH };

  // Tribal ~23% smaller than v1; optically centered in RIGHT with label bands.
  const tribalW = Math.round(V1_TRIBAL_W * SCALE_VS_V1);
  const band = Math.floor((right.w - tribalW) / 2);
  const fs = tribalW / COLS;
  const lh = fs * 1.2;
  const tribalH = ROWS * lh;
  const tribalX = right.x + band;
  const tribalTop = right.y + (right.h - tribalH) / 2;
  const baseline0 = tribalTop + fs * 0.92;

  // Stage for label/connector % = full right column (labels in side bands).
  const stage = { ...right };

  const tribalTspans = lines
    .map((line, i) => {
      const y = baseline0 + i * lh;
      return `<tspan x="${tribalX.toFixed(2)}" y="${y.toFixed(2)}" textLength="${tribalW.toFixed(2)}" lengthAdjust="spacingAndGlyphs">${escapeXml(line)}</tspan>`;
    })
    .join('\n      ');

  const tribalPctToXY = (px, py) => ({
    x: tribalX + (px / 100) * tribalW,
    y: tribalTop + (py / 100) * tribalH,
  });

  const stagePctToXY = (px, py) => ({
    x: stage.x + (px / 100) * stage.w,
    y: stage.y + (py / 100) * stage.h,
  });

  const connectorPaths = callouts
    .map((c) => {
      const m = cellToPct(c.marker.row, c.marker.col);
      const a = tribalPctToXY(m.x, m.y);
      const b = stagePctToXY(c.elbow.x, c.elbow.y);
      const e = stagePctToXY(c.end.x, c.end.y);
      return `<path d="M ${a.x.toFixed(2)} ${a.y.toFixed(2)} L ${b.x.toFixed(2)} ${b.y.toFixed(2)} L ${e.x.toFixed(2)} ${e.y.toFixed(2)}" fill="none" stroke="${COLORS.muted}" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join('\n    ');

  const markers = callouts
    .map((c) => {
      const m = cellToPct(c.marker.row, c.marker.col);
      const p = tribalPctToXY(m.x, m.y);
      return `<circle cx="${p.x.toFixed(2)}" cy="${p.y.toFixed(2)}" r="5.5" fill="${COLORS.paper}" stroke="${COLORS.accent}" stroke-width="1.4"/>`;
    })
    .join('\n    ');

  const labels = callouts
    .map((c) => {
      const p = stagePctToXY(c.label.x, c.label.y);
      const anchor = c.label.anchor;
      return `<g data-callout="${c.id}">
      <text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" text-anchor="${anchor}" fill="${COLORS.ink}" font-family="${FONT_MONO}" font-size="11" font-weight="500" letter-spacing="0.05em">${escapeXml(c.title)}</text>
      <text x="${p.x.toFixed(2)}" y="${(p.y + 14).toFixed(2)}" text-anchor="${anchor}" fill="${COLORS.muted}" font-family="${FONT_MONO}" font-size="9" letter-spacing="0.03em">${escapeXml(c.line1)}</text>
      <text x="${p.x.toFixed(2)}" y="${(p.y + 26).toFixed(2)}" text-anchor="${anchor}" fill="${COLORS.muted}" font-family="${FONT_MONO}" font-size="9" letter-spacing="0.03em">${escapeXml(c.line2)}</text>
    </g>`;
    })
    .join('\n    ');

  // Identity block optically centered vs RIGHT governance signature.
  // v3 sizes kept; v4 adds portfolio-style eyebrow.
  const eyebrow = 'DATA GOVERNANCE · DATA QUALITY · METADATA · LINEAGE';
  const eyebrowSize = 9.5;
  const nameSize = 27;
  const roleSize = 15;
  const termSize = 13;
  const termLh = 1.42;
  const identityBlockH =
    eyebrowSize + 14 + nameSize + 10 + roleSize + 18 + 4 * (termSize * termLh);
  const idTop = left.y + (left.h - identityBlockH) / 2;
  const eyebrowY = idTop + eyebrowSize * 0.9;
  const nameY = eyebrowY + 22;
  const roleY = nameY + 30;
  const ruleY = roleY + 17;
  const term0 = ruleY + 24;

  const termBlock = terminalLines
    .map((line, i) => {
      const y = term0 + i * (termSize * termLh);
      return `<text x="${left.x}" y="${y.toFixed(1)}" font-family="${FONT_MONO}" font-size="${termSize}" fill="${COLORS.muted}"><tspan fill="${COLORS.accent}">&gt;</tspan><tspan dx="6">${escapeXml(line)}</tspan></text>`;
    })
    .join('\n    ');

  const meta = {
    viewBox: `0 0 ${W} ${H}`,
    left,
    right,
    tribal: { x: tribalX, y: tribalTop, w: tribalW, h: tribalH },
    scaleVsV1: SCALE_VS_V1,
    tribalW,
    v1TribalW: V1_TRIBAL_W,
    eyebrowSize,
    canvas: { w: W, h: H, safe: SAFE },
  };

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Adrián Martínez Martín — Data Governance Engineer">
  <title>Adrián Martínez Martín — Data Governance Engineer</title>
  <desc>GitHub Profile hero v4: compact horizontal layout with braille tribal and governance callouts.</desc>
  <defs>
    <filter id="grain" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" result="noise"/>
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.035 0" in="noise" result="grainAlpha"/>
      <feBlend in="SourceGraphic" in2="grainAlpha" mode="screen"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="${COLORS.paper}"/>
  <rect width="${W}" height="${H}" fill="${COLORS.paper}" filter="url(#grain)"/>

  <!-- LEFT / IDENTITY -->
  <g id="identity">
    <text x="${left.x}" y="${eyebrowY.toFixed(1)}" fill="${COLORS.muted}" font-family="${FONT_MONO}" font-size="${eyebrowSize}" font-weight="400" letter-spacing="0.04em" xml:space="preserve">${escapeXml(eyebrow)}</text>
    <text x="${left.x}" y="${nameY.toFixed(1)}" fill="${COLORS.ink}" font-family="${FONT_SANS}" font-size="${nameSize}" font-weight="650" letter-spacing="-0.03em" xml:space="preserve">Adrián Martínez Martín</text>
    <text x="${left.x}" y="${roleY.toFixed(1)}" fill="${COLORS.text}" font-family="${FONT_SANS}" font-size="${roleSize}" font-weight="500" letter-spacing="-0.011em">Data Governance Engineer</text>
    <line x1="${left.x}" y1="${ruleY}" x2="${left.x + 168}" y2="${ruleY}" stroke="${COLORS.line}" stroke-width="1"/>
    ${termBlock}
  </g>

  <!-- RIGHT / GOVERNANCE SIGNATURE -->
  <g id="tribal-stage">
    <text id="tribal" xml:space="preserve" fill="${COLORS.ink}" font-family="${FONT_MONO}" font-size="${fs.toFixed(3)}" font-variant-ligatures="none">
      ${tribalTspans}
    </text>
    <g id="connectors" opacity="0.95">
    ${connectorPaths}
    </g>
    <g id="markers">
    ${markers}
    </g>
    <g id="callouts">
    ${labels}
    </g>
  </g>
</svg>
`;

  return { svg, meta };
}

const lines = readTribalLines();
const { svg, meta } = buildSvg(lines);
writeFileSync(outPath, svg, 'utf8');
writeFileSync(join(__dirname, 'capture', 'layout-v2.json'), JSON.stringify(meta, null, 2), 'utf8');
console.log(`Wrote ${outPath}`);
console.log(JSON.stringify({ ...meta, bytes: Buffer.byteLength(svg, 'utf8') }, null, 2));
