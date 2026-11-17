// @ts-check
import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_IMAGE_BYTES,
  ScanRequestError,
  parseGeminiApiKeys,
  parseJsonScanBody,
  parseScanRequest,
  recognizeMenuWithGemini,
} from './src/lib/gemini-scan';

function parseEnvValue(raw) {
  const s = raw.trim();
  if (s.length >= 2 && s[0] === "'" && s[s.length - 1] === "'") {
    return s.slice(1, -1);
  }
  if (s.length >= 2 && s[0] === '"' && s[s.length - 1] === '"') {
    const inner = s.slice(1, -1);
    if (!inner.includes('"')) return inner;
    try {
      const parsed = JSON.parse(s);
      if (typeof parsed === 'string') return parsed;
    } catch {}
  }
  return s;
}

// Load .env in dev if present
const rootDir = process.cwd();
const envFile = path.join(rootDir, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = parseEnvValue(m[2]);
  }
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

/** Dev server integration to handle /api/scan locally in astro dev */
function scanDevApiIntegration() {
  return {
    name: 'scan-dev-api',
    hooks: {
      'astro:server:setup': ({ server }) => {
        server.middlewares.use('/api/scan', async (req, res, next) => {
          if (req.method !== 'POST') return next();
          try {
            const apiKeys = parseGeminiApiKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS);
            if (!apiKeys.length) {
              return sendJson(res, 500, { error: 'GEMINI_API_KEY is not configured in .env' });
            }

            const maxBodyBytes = Math.ceil(MAX_IMAGE_BYTES * 1.4);
            const declared = Number(req.headers['content-length'] || 0);
            if (declared > maxBodyBytes) {
              return sendJson(res, 413, { error: '画像が大きすぎます（5MB まで）。' });
            }

            const chunks = [];
            let totalBytes = 0;
            for await (const chunk of req) {
              const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
              totalBytes += buf.byteLength;
              if (totalBytes > maxBodyBytes) {
                return sendJson(res, 413, { error: '画像が大きすぎます（5MB まで）。' });
              }
              chunks.push(buf);
            }

            const bodyBuffer = Buffer.concat(chunks);
            const contentType = String(req.headers['content-type'] || '');
            const input = contentType.includes('multipart/form-data')
              ? await parseScanRequest(
                  new Request('http://localhost/api/scan', {
                    method: 'POST',
                    headers: {
                      'content-type': contentType,
                      'content-length': String(bodyBuffer.byteLength),
                    },
                    body: bodyBuffer,
                  })
                )
              : parseJsonScanBody(bodyBuffer.toString('utf8'));

            const items = await recognizeMenuWithGemini(input, {
              apiKey: apiKeys,
              model: process.env.GEMINI_SCAN_MODEL,
            });
            return sendJson(res, 200, items);
          } catch (err) {
            if (err instanceof ScanRequestError) {
              return sendJson(res, err.status, {
                error: err.message,
                ...(err.details ? { details: err.details } : {}),
              });
            }
            const message = err instanceof Error ? err.message : 'Server error';
            return sendJson(res, 500, { error: message });
          }
        });
      },
    },
  };
}

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://yakikotoba.pages.dev',
  trailingSlash: 'always',
  build: { format: 'directory' },
  devToolbar: { enabled: false },
  integrations: [scanDevApiIntegration()],
});
