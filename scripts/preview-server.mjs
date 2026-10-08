import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.html': 'text/html; charset=utf-8',
  '.md': 'text/html; charset=utf-8',
};

const html = `<!doctype html><meta charset="utf-8"><title>Hero preview</title>
<body style="margin:0;background:#111;color:#eee;font:14px system-ui">
<div style="padding:16px">
<h1 style="font-size:16px">SVG</h1>
<img src="/assets/tribal/profile-hero.svg" width="900" style="background:#000;display:block">
<h1 style="font-size:16px;margin-top:24px">GIF</h1>
<img src="/assets/tribal/profile-hero.gif" width="900" style="background:#000;display:block">
</div>`;

const server = createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }
  const file = join(root, decodeURIComponent(url.pathname));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  try {
    const body = readFileSync(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (e) {
    res.writeHead(404);
    res.end(String(e));
  }
});

server.listen(8765, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8765');
});
