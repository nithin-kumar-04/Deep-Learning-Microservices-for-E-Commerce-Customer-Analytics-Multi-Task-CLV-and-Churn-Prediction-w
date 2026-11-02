import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'out');
const port = Number(process.env.PORT || 3000);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

async function readIfFile(path) {
  try {
    const info = await stat(path);
    return info.isFile() ? readFile(path) : null;
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith('/')) pathname += 'index.html';
    if (!extname(pathname)) pathname += '.html';

    const filePath = resolve(join(root, normalize(pathname)));
    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }

    const body = await readIfFile(filePath);
    if (!body) {
      response.writeHead(404);
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(500);
    response.end('Internal server error');
  }
});

if (!(await readIfFile(join(root, 'index.html')))) {
  console.error('Static export not found. Run `npm run build` before `npm run test:e2e`.');
  process.exit(1);
}

server.listen(port, '127.0.0.1', () => {
  console.log(`Static export server listening on http://127.0.0.1:${port}`);
});
