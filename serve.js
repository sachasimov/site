// Local preview server for dist/ (no dependencies). Usage: npm run serve [-- port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = path.join(path.dirname(fileURLToPath(import.meta.url)), 'dist');
const PORT = Number(process.argv[2] || process.env.PORT || 4000);
const { url: siteUrl = '' } = JSON.parse(fs.readFileSync(path.join(DIST, '..', 'site.json'), 'utf8'));
const BASE = siteUrl ? new URL(siteUrl).pathname.replace(/\/+$/, '') : '';
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.xml': 'application/rss+xml; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

http
  .createServer((req, res) => {
    let urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    // Mirror the live base path (e.g. /site) so local preview matches production.
    if (BASE && (urlPath === BASE || urlPath.startsWith(BASE + '/'))) urlPath = urlPath.slice(BASE.length) || '/';
    else if (BASE) return res.writeHead(302, { Location: BASE + '/' }).end();
    let file = path.normalize(path.join(DIST, urlPath));
    if (!file.startsWith(DIST)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!urlPath.endsWith('/')) return res.writeHead(301, { Location: urlPath + '/' }).end();
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      return fs.createReadStream(path.join(DIST, '404.html')).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`Serving dist/ at http://localhost:${PORT}`));
