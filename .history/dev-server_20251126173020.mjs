import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = process.env.PORT || 8080;
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.mjs': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf'
};

function send(res, status, data, headers = {}) {
  res.writeHead(status, { 'Cache-Control': 'no-store', ...headers });
  res.end(data);
}

const server = http.createServer((req, res) => {
  try {
    const urlPath = decodeURIComponent(req.url.split('?')[0]);
    let filePath = path.join(root, urlPath);
    if (filePath.endsWith('/')) filePath += 'index.html';
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }
    if (!fs.existsSync(filePath)) {
      // fallback to index.html for SPA-like navigation
      const fallback = path.join(root, 'index.html');
      if (fs.existsSync(fallback)) {
        const data = fs.readFileSync(fallback);
        return send(res, 200, data, { 'Content-Type': 'text/html; charset=UTF-8' });
      }
      return send(res, 404, 'Not Found');
    }
    const ext = path.extname(filePath).toLowerCase();
    const type = mime[ext] || 'application/octet-stream';
    const data = fs.readFileSync(filePath);
    send(res, 200, data, { 'Content-Type': type });
  } catch (e) {
    send(res, 500, 'Server Error: ' + e.message);
  }
});

server.listen(PORT, () => {
  console.log(`SlideStage dev server running at http://localhost:${PORT}`);
});
