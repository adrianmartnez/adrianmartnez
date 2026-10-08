import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'assets/tribal/profile-hero.svg'), 'utf8');
const tribal = readFileSync(join(root, 'assets/tribal/hero-tribal.txt'), 'utf8')
  .replace(/\r\n/g, '\n')
  .replace(/\n+$/, '');
const gif = readFileSync(join(root, 'assets/tribal/profile-hero.gif'));

const checks = {
  hasXmlns: svg.includes('xmlns="http://www.w3.org/2000/svg"'),
  noHttpLinks: !/https?:\/\/(?!www\.w3\.org)/.test(svg),
  noScript: !/<script/i.test(svg),
  noForeignObject: !/<foreignObject/i.test(svg),
  noExternalCss: !/@import|stylesheet/i.test(svg) && !/\shref="/i.test(svg),
  bgBlack: svg.includes('#000000'),
  accentCount: (svg.match(/#642a3a/g) || []).length,
  name: svg.includes('Adrián Martínez Martín'),
  role: svg.includes('Data Governance Engineer'),
  terms: [
    'governance-as-code',
    'metadata / quality / lineage',
    'python / sql',
    'collibra / microsoft purview',
  ].every((t) => svg.includes(t)),
  noOpenToWork: !svg.includes('open_to_work'),
  callouts: [
    'REFERENCE',
    'LINEAGE',
    'QUALITY CHECK',
    'METADATA',
    'TRACE PATH',
    'NODE: SOURCE',
    'EDGE: DERIVED_FROM',
    'RULE: CONSISTENCY',
    'TERM: DOCUMENTED',
    'EDGE: SUPERSEDES',
  ].every((t) => svg.includes(t)),
  viewBox: /viewBox="0 0 1100 420"/.test(svg),
  eyebrow: svg.includes('DATA GOVERNANCE · DATA QUALITY · METADATA · LINEAGE'),
};

const spans = [...svg.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)].map((m) =>
  m[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"'),
);
const tribalLines = tribal.split('\n');
const tribalSpans = spans.filter((s) => [...s].length === 109);
checks.tribalLines = tribalSpans.length;
checks.tribalMatch =
  tribalSpans.length === 34 && tribalSpans.every((l, i) => l === tribalLines[i]);

console.log(JSON.stringify({
  checks,
  svgBytes: Buffer.byteLength(svg),
  gifBytes: gif.length,
  gifMB: +(gif.length / (1024 * 1024)).toFixed(3),
  gifHeader: gif.slice(0, 6).toString('ascii'),
}, null, 2));
