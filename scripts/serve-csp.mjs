// Sirve dist/ con la política de contenido real (security/csp.js) para probarla en un navegador: node scripts/serve-csp.mjs [puerto]
// El puerto por defecto es 8080 (origen permitido por el backend). La API se permite en localhost:3000 solo para esta prueba.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { buildCsp, PERMISSIONS_POLICY } from '../src/security/csp.js';

const port = Number(process.argv[2]) || 8080;
const root = join(process.cwd(), 'dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
const csp = buildCsp({ extraConnect: ['http://localhost:3000'] });

http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^[\\/]+/, '');
  let file = join(root, path);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  let body;
  try { body = await readFile(file); } catch { file = join(root, 'index.html'); body = await readFile(file); }
  res.writeHead(200, {
    'Content-Type': types[extname(file)] || 'application/octet-stream',
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': PERMISSIONS_POLICY,
  });
  res.end(body);
}).listen(port, () => console.log(`CSP en http://localhost:${port}`));
