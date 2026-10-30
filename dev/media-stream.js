import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const TYPES = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.mp4': 'video/mp4' };

async function resolveFile(root, url) {
  const rel = decodeURIComponent((url || '').split('?')[0]).replace(/^\/+/, '');
  const file = path.resolve(root, rel);
  if (!file.startsWith(root + path.sep)) throw Object.assign(new Error('forbidden'), { code: 'EACCES' });
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) throw Object.assign(new Error('unsupported'), { code: 'EACCES' });
  const info = await stat(file);
  return { file, type, size: info.size };
}

function respond(file, type, size, req, res) {
  res.setHeader('Content-Type', type);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || end >= size) {
      res.statusCode = 416;
      res.setHeader('Content-Range', `bytes */${size}`);
      return res.end();
    }
    res.statusCode = 206;
    res.setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
    res.setHeader('Content-Length', end - start + 1);
    if (req.method === 'HEAD') return res.end();
    return createReadStream(file, { start, end }).pipe(res);
  }

  res.setHeader('Content-Length', size);
  if (req.method === 'HEAD') return res.end();
  return createReadStream(file).pipe(res);
}

/**
 * Dev stand-in for the streaming route the Express backend will own. Serves the
 * repo-root media/ folder over /media with byte-range support, so nothing
 * playable is ever copied into client/public or the Vite build.
 */
export function mediaStream(mediaRoot) {
  const root = path.resolve(mediaRoot);
  return {
    name: 'cft-media-stream',
    configureServer(server) {
      server.middlewares.use('/media', (req, res) => {
        if (req.method !== 'GET' && req.method !== 'HEAD') {
          res.statusCode = 405;
          return res.end();
        }
        return resolveFile(root, req.url)
          .then(({ file, type, size }) => respond(file, type, size, req, res))
          .catch((err) => {
            res.statusCode = err.code === 'EACCES' ? 403 : 404;
            res.end();
          });
      });
    },
  };
}
