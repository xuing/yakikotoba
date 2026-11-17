// Cloudflare Pages Functions endpoint for /api/scan
// Secure proxy for Gemini Multimodal API

import {
  ScanRequestError,
  parseGeminiApiKeys,
  parseScanRequest,
  recognizeMenuWithGemini,
} from '../../src/lib/gemini-scan';

export interface Env {
  GEMINI_API_KEY?: string;
  GEMINI_API_KEYS?: string;
  GEMINI_SCAN_MODEL?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

// ---------- abuse protection ----------
// Best-effort per-isolate limit: each Cloudflare edge isolate keeps its own counter,
// so this stops casual hammering; set a daily quota on the API key as the hard cap.
const RATE_LIMIT = 5;            // requests
const RATE_WINDOW_MS = 60_000;   // per minute, per IP
const hits = new Map<string, number[]>();

function rateLimited(ip: string): number {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return Math.ceil((RATE_WINDOW_MS - (now - recent[0])) / 1000);
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (!v.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return 0;
}

const jsonResponse = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extra,
    },
  });

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { request, env } = context;

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const retry = rateLimited(ip);
  if (retry) {
    return jsonResponse(
      429,
      { error: `リクエストが多すぎます。${retry}秒後にもう一度お試しください。` },
      { 'Retry-After': String(retry) }
    );
  }

  const apiKeys = parseGeminiApiKeys(env.GEMINI_API_KEY, env.GEMINI_API_KEYS);
  if (!apiKeys.length) {
    return jsonResponse(500, {
      error: 'GEMINI_API_KEY is not configured in server environment.',
    });
  }

  try {
    const input = await parseScanRequest(request);
    const items = await recognizeMenuWithGemini(input, {
      apiKey: apiKeys,
      model: env.GEMINI_SCAN_MODEL,
    });
    return jsonResponse(200, items);
  } catch (err) {
    if (err instanceof ScanRequestError) {
      return jsonResponse(err.status, {
        error: err.message,
        ...(err.details ? { details: err.details } : {}),
      });
    }
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return jsonResponse(500, { error: message });
  }
}
