import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3000);
const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.mp4': 'video/mp4', '.webm': 'video/webm'
};
function safePath(urlPath) {
  const decoded = decodeURIComponent((urlPath || '/').split('?')[0]);
  const normalized = path.normalize(decoded).replace(/^([.][.][\\/])+/, '');
  return path.join(root, normalized.replace(/^[/\\]+/, ''));
}
function resolveFile(urlPath) {
  const file = safePath(urlPath);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  const dirIndex = path.join(file, 'index.html');
  if (fs.existsSync(dirIndex)) return dirIndex;
  return path.join(root, '404.html');
}
http.createServer((req, res) => {
  try {
    const file = resolveFile(req.url || '/');
    const is404 = file === path.join(root, '404.html') && !(req.url || '/').startsWith('/404.html');
    res.statusCode = is404 ? 404 : 200;
    res.setHeader('Content-Type', mime[path.extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(file).pipe(res);
  } catch {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Server error');
  }
}).listen(port, () => console.log(`Markipie Studio running at http://localhost:${port}`));
