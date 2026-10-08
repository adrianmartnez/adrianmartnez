/**
 * Export tribal build schedule from portfolio-astro (read-only) for capture HTML.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const portfolio = join(root, '..', 'portfolio-astro');
const outDir = join(__dirname, 'capture');
mkdirSync(outDir, { recursive: true });

const brailleUrl = pathToFileURL(join(portfolio, 'src/lib/ascii/brailleBuild.ts')).href;
const { trimTribalExterior, buildTribalPlan } = await import(brailleUrl);

const tribalPath = join(root, 'assets/tribal/hero-tribal.txt');
const tribalSource = readFileSync(tribalPath, 'utf8');
const { grid, meta, normalizedSource } = trimTribalExterior(tribalSource);
const plan = buildTribalPlan(grid);

const events = plan.events.map((e) => [e.time, e.glyphIndex, e.resultingMask]);

const payload = {
  rows: meta.rowsAfter,
  cols: meta.colsAfter,
  propagationMs: plan.propagationMs,
  normalizedSource,
  grid,
  events,
  inkCount: plan.ink.length,
  scheduler: {
    schedulerType: plan.meta.schedulerType,
    rootCell: plan.meta.rootCell,
    opticalCenter: plan.meta.opticalCenter,
    logicalDotEvents: plan.meta.logicalDotEvents,
    firstEventMs: plan.meta.firstEventMs,
    lastEventMs: plan.meta.lastEventMs,
  },
};

writeFileSync(join(outDir, 'tribal-build.json'), JSON.stringify(payload), 'utf8');
console.log(
  JSON.stringify(
    {
      out: 'scripts/capture/tribal-build.json',
      rows: payload.rows,
      cols: payload.cols,
      ink: payload.inkCount,
      events: events.length,
      propagationMs: payload.propagationMs,
    },
    null,
    2,
  ),
);
