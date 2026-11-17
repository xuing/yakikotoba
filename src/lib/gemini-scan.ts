// Shared Gemini multimodal menu-recognition helpers for Astro dev middleware
// and Cloudflare Pages Functions. Keep Cloudflare Workers compatible (no node:* imports).

import { buildSystemPrompt } from './gemini-prompt';

export const DEFAULT_GEMINI_SCAN_MODEL = 'gemini-3.8-flash';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const SCAN_USER_PROMPT =
  'このメニュー画像から、提供されている料理・ドリンク・一品料理を漏れなく識別し、指定のJSON形式で出力してください。';

export interface ScanImageInput {
  base64Data: string;
  mimeType: string;
}

export interface ScanItem {
  text: string;
  reading: string;
  match_id: string | null;
  desc_ja: string;
  desc_zh: string;
}

export class ScanRequestError extends Error {
  readonly status: number;
  readonly details?: string;

  constructor(status: number, message: string, details?: string) {
    super(message);
    this.name = 'ScanRequestError';
    this.status = status;
    this.details = details;
  }
}

export function resolveScanModel(envModel?: string): string {
  const trimmed = envModel?.trim();
  return trimmed ? trimmed : DEFAULT_GEMINI_SCAN_MODEL;
}

/** Estimate decoded byte size of a base64-encoded payload. */
export function estimateBase64Bytes(base64: string): number {
  const clean = base64.replace(/\s+/g, '');
  if (!clean) return 0;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((clean.length * 3) / 4) - padding);
}

/** Convert an ArrayBuffer to base64 in Web/Workers runtimes without node:buffer. */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

/** Normalize a raw base64 string or data URL and enforce MIME & byte limits. */
export function parseDataUrlOrBase64(image: string, fallbackMimeType = 'image/jpeg'): ScanImageInput {
  let base64Data = image.trim();
  let mimeType = fallbackMimeType || 'image/jpeg';

  if (base64Data.includes(',')) {
    const commaIdx = base64Data.indexOf(',');
    const header = base64Data.slice(0, commaIdx);
    base64Data = base64Data.slice(commaIdx + 1).trim();
    const match = header.match(/^data:([^;]+);base64$/i);
    if (match?.[1]) {
      mimeType = match[1].trim();
    }
  }

  base64Data = base64Data.replace(/\s+/g, '');
  if (!base64Data) {
    throw new ScanRequestError(400, 'Missing image data');
  }
  if (!mimeType.startsWith('image/')) {
    throw new ScanRequestError(400, 'Invalid image MIME type');
  }
  if (estimateBase64Bytes(base64Data) > MAX_IMAGE_BYTES) {
    throw new ScanRequestError(413, '画像が大きすぎます（5MB まで）。');
  }

  return { base64Data, mimeType };
}

/** Parse and validate a JSON scan payload string or pre-parsed object. */
export function parseJsonScanBody(rawOrBody: string | Record<string, unknown>): ScanImageInput {
  let body: Record<string, unknown>;
  if (typeof rawOrBody === 'string') {
    try {
      const parsed = JSON.parse(rawOrBody);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Expected JSON object');
      }
      body = parsed as Record<string, unknown>;
    } catch {
      throw new ScanRequestError(400, 'Invalid JSON body');
    }
  } else {
    body = rawOrBody;
  }

  const image = typeof body.image === 'string' ? body.image : '';
  const mimeType = typeof body.mimeType === 'string' && body.mimeType.trim() ? body.mimeType.trim() : 'image/jpeg';
  if (!image.trim()) {
    throw new ScanRequestError(400, 'Missing image data');
  }

  return parseDataUrlOrBase64(image, mimeType);
}

/** Parse a Web Fetch Request (application/json or multipart/form-data) into ScanImageInput. */
export async function parseScanRequest(request: Request): Promise<ScanImageInput> {
  const declared = Number(request.headers.get('content-length') || 0);
  // Base64 JSON is ~4/3 of binary size; allow header/multipart framing overhead.
  if (declared > MAX_IMAGE_BYTES * 1.4) {
    throw new ScanRequestError(413, '画像が大きすぎます（5MB まで）。');
  }

  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const raw = await request.text();
    if (raw.length > MAX_IMAGE_BYTES * 1.4) {
      throw new ScanRequestError(413, '画像が大きすぎます（5MB まで）。');
    }
    return parseJsonScanBody(raw);
  }

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new ScanRequestError(400, 'No image file provided in form data');
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ScanRequestError(413, '画像が大きすぎます（5MB まで）。');
    }
    const mimeType = file.type || 'image/jpeg';
    if (!mimeType.startsWith('image/')) {
      throw new ScanRequestError(400, 'Invalid image MIME type');
    }
    const base64Data = arrayBufferToBase64(await file.arrayBuffer());
    if (!base64Data) {
      throw new ScanRequestError(400, 'Missing image data');
    }
    return { base64Data, mimeType };
  }

  throw new ScanRequestError(400, 'Unsupported Content-Type. Use application/json or multipart/form-data');
}

/** Build a Gemini 3.8 Flash generateContent payload (without deprecated sampling params). */
export function buildGeminiScanPayload({ base64Data, mimeType }: ScanImageInput) {
  return {
    systemInstruction: {
      parts: [{ text: buildSystemPrompt() }],
    },
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
          {
            text: SCAN_USER_PROMPT,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            text: { type: 'STRING' },
            reading: { type: 'STRING' },
            match_id: { type: 'STRING', nullable: true },
            desc_ja: { type: 'STRING' },
            desc_zh: { type: 'STRING' },
          },
          required: ['text', 'reading', 'desc_ja', 'desc_zh'],
        },
      },
    },
  };
}

/** Extract and normalize the structured menu item array from a Gemini API response. */
export function normalizeGeminiScanResponse(result: unknown): ScanItem[] {
  const candidates = (result as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })?.candidates;
  const parts = candidates?.[0]?.content?.parts;
  const textOutput = parts?.find((p) => typeof p?.text === 'string' && p.text.trim().length > 0)?.text;

  if (!textOutput) {
    throw new ScanRequestError(502, 'No output generated from Gemini');
  }

  const cleaned = textOutput
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new ScanRequestError(502, 'Invalid JSON returned from Gemini');
  }

  let rawList: unknown[];
  if (Array.isArray(parsed)) {
    rawList = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const arrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    rawList = arrayKey ? (obj[arrayKey] as unknown[]) : [obj];
  } else {
    return [];
  }

  const normalized: ScanItem[] = [];
  for (const entry of rawList) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const text = typeof item.text === 'string' ? item.text.trim() : '';
    if (!text) continue;

    const reading = typeof item.reading === 'string' ? item.reading.trim() : '';
    const rawMatchId = typeof item.match_id === 'string' ? item.match_id.trim() : '';
    const match_id = rawMatchId && rawMatchId.toLowerCase() !== 'null' ? rawMatchId : null;
    const desc_ja = typeof item.desc_ja === 'string' ? item.desc_ja.trim() : '';
    const desc_zh = typeof item.desc_zh === 'string' ? item.desc_zh.trim() : '';

    normalized.push({ text, reading, match_id, desc_ja, desc_zh });
  }

  return normalized;
}

export interface RecognizeMenuOptions {
  apiKey: string;
  model?: string;
  fetchFn?: typeof fetch;
}

/** Call Gemini generateContent using x-goog-api-key header and return normalized items. */
export async function recognizeMenuWithGemini(
  input: ScanImageInput,
  { apiKey, model, fetchFn = fetch }: RecognizeMenuOptions
): Promise<ScanItem[]> {
  const resolvedModel = resolveScanModel(model);
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(resolvedModel)}:generateContent`;

  const resp = await fetchFn(geminiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify(buildGeminiScanPayload(input)),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    const status = resp.status === 429 ? 429 : 502;
    throw new ScanRequestError(status, `Gemini API returned error (${resp.status})`, errText);
  }

  const data = await resp.json();
  return normalizeGeminiScanResponse(data);
}
