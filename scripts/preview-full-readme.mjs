/**
 * GitHub-faithful bilingual README preview.
 * Mirrors production HTML: one centered <p>, % widths for header row (no CSS flex).
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PORT = 8780;

const MIME = {
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/markdown; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json',
};

function page(locale) {
  const isEs = locale === 'es';
  const base = isEs ? '/assets/readme/es' : '/assets/readme/en';
  const heroFile = isEs ? 'profile-hero.es.gif' : 'profile-hero.gif';
  const heroPath = join(root, 'assets/tribal', heroFile);
  const heroVer = existsSync(heroPath) ? String(readFileSync(heroPath).byteLength) : '0';
  const hero = `/assets/tribal/${heroFile}?v=${heroVer}`;
  const other = isEs ? '/' : '/es';
  return `<!doctype html>
<html lang="${isEs ? 'es' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Profile README — ${isEs ? 'ES' : 'EN'}</title>
<style>
  html,body{margin:0;background:#0d1117;}
  .wrap{max-width:900px;margin:0 auto;padding:16px 12px 48px;}
  /* GitHub markdown: images in <p align=center> sit inline; width % of container */
  .gh p{margin:0;padding:0;text-align:center;line-height:0;font-size:0;}
  .gh img{vertical-align:top;background:#000;border:0;margin:0;padding:0;}
  .note{max-width:900px;margin:0 auto;padding:0 12px 12px;color:#8b949e;font:12px/1.4 ui-monospace,Consolas,monospace;}
</style>
</head>
<body>
  <p class="note">GitHub-faithful preview · % header row · width:100% modules · max 900px</p>
  <div class="wrap gh">
    <p align="center">
      <img src="${base}/header-fill.svg" width="89.818%" height="28" alt="" /><a href="/"><img src="${base}/lang-en.svg" width="5.091%" height="28" alt="EN" /></a><a href="${other}"><img src="${base}/lang-es.svg" width="5.091%" height="28" alt="ES" /></a><img src="${hero}" alt="Hero" width="100%" /><img src="${base}/about.svg" alt="About" width="100%" /><img src="${base}/work-header.svg" alt="Selected work" width="100%" /><a href="https://github.com/adrianmartnez/collibra-governance-automation" target="_blank" rel="noopener"><img src="${base}/project-collibra.svg" alt="Collibra" width="100%" /></a><a href="https://github.com/adrianmartnez/purview-governance-automation" target="_blank" rel="noopener"><img src="${base}/project-purview.svg" alt="Purview" width="100%" /></a><a href="https://github.com/adrianmartnez/governance-provider-example" target="_blank" rel="noopener"><img src="${base}/project-provider.svg" alt="Provider Example" width="100%" /></a><img src="${base}/stack.svg" alt="Stack" width="100%" /><img src="${base}/connect-header.svg" alt="Connect" width="100%" /><a href="https://adrianmartnez.dev" target="_blank" rel="noopener"><img src="${base}/connect-portfolio.svg" alt="Portfolio" width="100%" /></a><a href="https://www.linkedin.com/in/adrian-martinez-martin" target="_blank" rel="noopener"><img src="${base}/connect-linkedin.svg" alt="LinkedIn" width="100%" /></a>
    </p>
  </div>
</body>
</html>`;
}

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/' || url.pathname === '/en') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(page('en'));
    return;
  }
  if (url.pathname === '/es') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(page('es'));
    return;
  }
  const filePath = join(root, decodeURIComponent(url.pathname.replace(/^\//, '')));
  if (!filePath.startsWith(root) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('not found');
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(filePath));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`READY http://127.0.0.1:${PORT}  (EN)  |  http://127.0.0.1:${PORT}/es  (ES)`);
});
