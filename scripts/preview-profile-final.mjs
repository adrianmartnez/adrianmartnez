/**
 * Local preview for profile-final candidates + picture element.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PORT = 8781;

const MIME = {
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.html': 'text/html; charset=utf-8',
};

function page(locale) {
  const isEs = locale === 'es';
  const base = isEs ? '/assets/profile-final/es' : '/assets/profile-final/en';
  return `<!doctype html>
<html lang="${isEs ? 'es' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Profile final candidate — ${isEs ? 'ES' : 'EN'}</title>
<style>
  html,body{margin:0;background:#0d1117;color:#c9d1d9;font:14px/1.4 ui-monospace,Consolas,monospace;}
  .wrap{max-width:900px;margin:0 auto;padding:16px 12px 48px;}
  .nav,.links{text-align:right;margin:0 0 8px;}
  .links{text-align:center;margin-top:12px;}
  a{color:#58a6ff;}
  picture,img{display:block;width:100%;background:#000;}
  .note{color:#8b949e;margin:0 0 12px;font-size:12px;}
</style>
</head>
<body>
  <div class="wrap">
    <p class="note">Candidate preview · seamless canvas · &lt;picture max-width:600px&gt;</p>
    <p class="nav"><a href="/">EN</a> · <a href="/es">ES</a></p>
    <picture>
      <source media="(max-width: 600px)" srcset="${base}/mobile.gif" />
      <img src="${base}/desktop.gif" alt="Profile canvas" width="100%" />
    </picture>
    <p class="links"><a href="https://adrianmartnez.dev">Portfolio</a> · <a href="https://www.linkedin.com/in/adrian-martinez-martin">LinkedIn</a></p>
    <pre id="diag" class="note"></pre>
  </div>
  <script>
    const img = document.querySelector('img');
    const diag = document.getElementById('diag');
    function report() {
      diag.textContent = JSON.stringify({
        viewport: window.innerWidth,
        currentSrc: img.currentSrc,
        natural: { w: img.naturalWidth, h: img.naturalHeight },
      }, null, 2);
    }
    img.addEventListener('load', report);
    window.addEventListener('resize', report);
    report();
  </script>
</body>
</html>`;
}

createServer((req, res) => {
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
  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(filePath));
}).listen(PORT, '127.0.0.1', () => {
  console.log(`READY http://127.0.0.1:${PORT} | /es`);
});
