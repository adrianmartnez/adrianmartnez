/**
 * GitHub-faithful bilingual README preview (simplified structure).
 * Mirrors production: table + bgcolor + continuous black modules.
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
  const enHref = '/';
  const esHref = '/es';
  return `<!doctype html>
<html lang="${isEs ? 'es' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Profile README — ${isEs ? 'ES' : 'EN'}</title>
<style>
  html,body{margin:0;background:#0d1117;}
  .wrap{max-width:900px;margin:0 auto;padding:16px 12px 48px;}
  .note{max-width:900px;margin:0 auto;padding:0 12px 12px;color:#8b949e;font:12px/1.4 ui-monospace,Consolas,monospace;}
  table{border-collapse:collapse;border-spacing:0;width:100%;}
  td{padding:0;margin:0;line-height:0;font-size:0;vertical-align:top;background:#000;}
  img{display:inline-block;vertical-align:top;border:0;margin:0;padding:0;background:#000;}
  img[width="100%"]{display:block;width:100%;height:auto;}
  a{display:inline;line-height:0;text-decoration:none;}
</style>
</head>
<body>
  <p class="note">GitHub-faithful preview · simplified · table + continuous black</p>
  <div class="wrap">
    <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%">
      <tr>
        <td style="line-height:0;font-size:0;background:#000;">
          <img src="${base}/lang-pad.svg" width="92%" height="20" alt="" /><a href="${enHref}"><img src="${base}/lang-en.svg" width="4%" height="20" alt="EN" /></a><a href="${esHref}"><img src="${base}/lang-es.svg" width="4%" height="20" alt="ES" /></a><img src="${hero}" alt="Hero" width="100%" />
        </td>
      </tr>
      <tr>
        <td style="line-height:0;font-size:0;background:#000;">
          <img src="${base}/body.svg" alt="Body" width="100%" />
        </td>
      </tr>
      <tr>
        <td style="line-height:0;font-size:0;background:#000;">
          <a href="https://adrianmartnez.dev" target="_blank" rel="noopener"><img src="${base}/connect-portfolio.svg" alt="Portfolio" width="100%" /></a>
        </td>
      </tr>
      <tr>
        <td style="line-height:0;font-size:0;background:#000;">
          <a href="https://www.linkedin.com/in/adrian-martinez-martin" target="_blank" rel="noopener"><img src="${base}/connect-linkedin.svg" alt="LinkedIn" width="100%" /></a>
        </td>
      </tr>
    </table>
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
