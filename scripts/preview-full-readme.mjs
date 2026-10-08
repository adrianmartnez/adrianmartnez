/**
 * GitHub-faithful bilingual README preview (compact header + modules).
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
  return `<!doctype html>
<html lang="${isEs ? 'es' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Profile README — ${isEs ? 'ES' : 'EN'}</title>
<style>
  html,body{margin:0;background:#0d1117;}
  .wrap{max-width:900px;margin:0 auto;padding:16px 12px 48px;}
  .stack{line-height:0;font-size:0;}
  .stack img{display:block;width:100%;height:auto;background:#000;border:0;margin:0;padding:0;}
  .stack a{display:block;line-height:0;text-decoration:none;}
  .header{line-height:0;font-size:0;display:flex;width:100%;background:#000;margin:0;padding:0;}
  .header img{display:block;height:auto;background:#000;border:0;margin:0;padding:0;}
  .header .fill{width:calc(988 / 1100 * 100%);flex:0 0 auto;}
  .header a{display:block;line-height:0;width:calc(56 / 1100 * 100%);flex:0 0 auto;}
  .header a img{width:100%;}
  .note{max-width:900px;margin:0 auto;padding:0 12px 12px;color:#8b949e;font:12px/1.4 ui-monospace,Consolas,monospace;}
</style>
</head>
<body>
  <p class="note">GitHub-faithful preview · compact header (EN/ES only) · width:100% scaling</p>
  <div class="wrap">
    <div class="header">
      <img class="fill" src="${base}/header-fill.svg" alt="" width="988" height="28" />
      <a href="/"><img src="${base}/lang-en.svg" alt="EN" width="56" height="28" /></a>
      <a href="/es"><img src="${base}/lang-es.svg" alt="ES" width="56" height="28" /></a>
    </div>
    <div class="stack">
      <img src="${hero}" alt="Hero" width="1100" />
      <img src="${base}/about.svg" alt="About" width="1100" />
      <img src="${base}/work-header.svg" alt="Selected work" width="1100" />
      <a href="https://github.com/adrianmartnez/collibra-governance-automation" target="_blank" rel="noopener"><img src="${base}/project-collibra.svg" alt="Collibra" width="1100" /></a>
      <a href="https://github.com/adrianmartnez/purview-governance-automation" target="_blank" rel="noopener"><img src="${base}/project-purview.svg" alt="Purview" width="1100" /></a>
      <a href="https://github.com/adrianmartnez/governance-provider-example" target="_blank" rel="noopener"><img src="${base}/project-provider.svg" alt="Provider Example" width="1100" /></a>
      <img src="${base}/stack.svg" alt="Stack" width="1100" />
      <img src="${base}/connect-header.svg" alt="Connect" width="1100" />
      <a href="https://adrianmartnez.dev" target="_blank" rel="noopener"><img src="${base}/connect-portfolio.svg" alt="Portfolio" width="1100" /></a>
      <a href="https://www.linkedin.com/in/adrian-martinez-martin" target="_blank" rel="noopener"><img src="${base}/connect-linkedin.svg" alt="LinkedIn" width="1100" /></a>
    </div>
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
