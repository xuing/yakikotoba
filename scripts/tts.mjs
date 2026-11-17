#!/usr/bin/env node
// Generate pronunciation audio for every Japanese word/sentence in src/content with Gemini TTS.
//
//   npm run tts                    # only what is missing
//   npm run tts -- --only cut:beef # keys starting with a prefix
//   npm run tts -- --force --only term:jo
//   npm run tts -- --dry-run       # list what would be generated
//
// Needs GEMINI_API_KEY in .env and ffmpeg on PATH.
// Files are content-addressed (hash of model + voice + style + text), so editing a word
// regenerates only that word, and identical texts share one mp3.
// Output: public/audio/<hash>.mp3 and src/data/audio.json ({ key: "/audio/<hash>.mp3" }).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = path.join(ROOT, 'src/content');
const OUT_DIR = path.join(ROOT, 'public/audio');
const MANIFEST = path.join(ROOT, 'src/data/audio.json');

// ---------- config ----------
function parseEnvValue(raw) {
  const s = raw.trim();
  if (s.length >= 2 && s[0] === "'" && s[s.length - 1] === "'") return s.slice(1, -1);
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

function parseGeminiApiKeys(...sources) {
  const keys = [];
  const seen = new Set();
  const pushKey = (raw) => {
    const cleaned = raw.trim().replace(/^["']+|["']+$/g, '').trim();
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      keys.push(cleaned);
    }
  };
  for (const src of sources) {
    if (!src) continue;
    const trimmed = String(src).trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      let parsed = null;
      try { parsed = JSON.parse(trimmed); } catch {}
      if (Array.isArray(parsed)) {
        for (const item of parsed) if (typeof item === 'string') pushKey(item);
        continue;
      }
      for (const part of trimmed.slice(1, -1).split(/[,;\r\n]+/)) pushKey(part);
      continue;
    }
    for (const part of trimmed.split(/[,;\r\n]+/)) pushKey(part);
  }
  return keys;
}

for (const line of fs.existsSync(path.join(ROOT, '.env')) ? fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/) : []) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = parseEnvValue(m[2]);
}
const API_KEYS = parseGeminiApiKeys(process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEYS);
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const MODEL = opt('--model', process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-lite-tts');
const VOICE = opt('--voice', process.env.GEMINI_TTS_VOICE || 'Kore');
const CONCURRENCY = Number(opt('--concurrency', 4));
const ONLY = opt('--only', '');
const LIMIT = Number(opt('--limit', Infinity));
const STYLE =
  'Read exactly the Japanese text given, nothing else. Natural standard Japanese (Tokyo accent), ' +
  'clear and slightly slow, like a Japanese teacher pronouncing a word or sentence for a learner.';

// ---------- collect texts ----------
const RUBY = /\{([^|{}]+)\|([^{}]+)\}/g;
const hasKanji = (s) => /[㐀-鿿豈-﫿々〆ヶ]/.test(s);
/** Text to read: kanji replaced by their kana (avoids misreadings like 上 → うえ), katakana kept. */
function speakable(x) {
  if (!x) return '';
  if (x.tts) return x.tts;
  if (x.ruby) return x.ruby.replace(RUBY, '$2');
  if (x.ja && !hasKanji(x.ja)) return x.ja;
  return x.kana || x.ja || '';
}
const clean = (s) => s.replace(/[〜~～]/g, ' ').replace(/[【】［］\[\]「」]/g, '').replace(/\s+/g, ' ').trim();

function readYaml(file) {
  try {
    return YAML.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.warn(`! ${path.relative(ROOT, file)}: ${e.message.split('\n')[0]}`);
    return null;
  }
}
function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? walk(p) : /\.ya?ml$/.test(d.name) && !d.name.startsWith('_') ? [p] : [];
  });
}
const idOf = (base, file) => path.relative(base, file).replace(/\\/g, '/').replace(/\.ya?ml$/, '');

const jobs = new Map(); // key → text
const add = (key, x) => {
  const text = clean(typeof x === 'string' ? x : speakable(x));
  if (text) jobs.set(key, text);
};
for (const f of walk(path.join(CONTENT, 'groups'))) {
  const d = readYaml(f), group = path.basename(f).replace(/\.ya?ml$/, '');
  for (const it of d?.items ?? []) if (it?.id) add(`row:${group}/${it.id}`, it);
}
for (const f of walk(path.join(CONTENT, 'chains'))) {
  const d = readYaml(f), chain = idOf(path.join(CONTENT, 'chains'), f);
  if (!d) continue;
  add(`chain:${chain}`, d);
  for (const it of d.items ?? []) if (it?.id) add(`chain-item:${chain}/${it.id}`, it);
}

// ---------- plan ----------
const hashOf = (text) => crypto.createHash('sha1').update(`${MODEL}|${VOICE}|${STYLE}|${text}`).digest('hex').slice(0, 16);
const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
fs.mkdirSync(OUT_DIR, { recursive: true });

const byText = new Map(); // text → keys
for (const [key, text] of jobs) {
  if (ONLY && !key.startsWith(ONLY)) continue;
  byText.set(text, [...(byText.get(text) ?? []), key]);
}
const existingAudioFor = (text, keys) => {
  const currentFile = `${hashOf(text)}.mp3`;
  if (fs.existsSync(path.join(OUT_DIR, currentFile))) return `/audio/${currentFile}`;
  for (const k of keys) {
    const entry = manifest[k];
    const rel = typeof entry === 'string' ? entry : entry?.file;
    if (rel && fs.existsSync(path.join(ROOT, 'public', rel.replace(/^\/+/, '')))) return rel;
  }
  return null;
};

const todo = [];
for (const [text, keys] of byText) {
  const existing = flag('--force') ? null : existingAudioFor(text, keys);
  if (existing) {
    for (const k of keys) manifest[k] = existing;
  } else if (todo.length < LIMIT) {
    todo.push({ text, keys, file: `${hashOf(text)}.mp3` });
  }
}
console.log(`${jobs.size} keys · ${byText.size} distinct texts · ${todo.length} to generate · ${MODEL} / ${VOICE} · ${API_KEYS.length} key(s)`);
if (flag('--dry-run')) {
  for (const j of todo.slice(0, 50)) console.log(`  ${j.keys[0]}${j.keys.length > 1 ? ` (+${j.keys.length - 1})` : ''}  ${j.text}`);
  process.exit(0);
}
if (todo.length && !API_KEYS.length) {
  console.error('GEMINI_API_KEY is missing — put it in .env (see .env.example).');
  process.exit(1);
}

// ---------- synthesis ----------
const exhaustedKeys = new Set();
let keyCursor = 0;
function nextApiKey() {
  if (exhaustedKeys.size >= API_KEYS.length) return null;
  for (let i = 0; i < API_KEYS.length; i++) {
    const candidate = API_KEYS[(keyCursor + i) % API_KEYS.length];
    if (!exhaustedKeys.has(candidate)) {
      keyCursor = (keyCursor + i + 1) % API_KEYS.length;
      return candidate;
    }
  }
  return null;
}

async function synth(text) {
  const body = {
    contents: [{ parts: [{ text, speech_metadata: { style: STYLE } }] }],
    generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
  };
  for (let attempt = 1; ; ) {
    const apiKey = nextApiKey();
    if (!apiKey) {
      quotaExhausted = true;
      throw new Error(`daily quota for ${MODEL} is used up on all ${API_KEYS.length} key(s) — run npm run tts again after it resets`);
    }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    }).catch((e) => ({ ok: false, status: 599, text: async () => String(e) }));
    if (r.ok) {
      const j = await r.json();
      const part = j.candidates?.[0]?.content?.parts?.find((p) => p.inlineData || p.inline_data);
      const blob = part?.inlineData ?? part?.inline_data;
      if (blob?.data) return { data: Buffer.from(blob.data, 'base64'), mime: blob.mimeType ?? blob.mime_type ?? '' };
      if (attempt >= 4) throw new Error(`no audio in response: ${JSON.stringify(j).slice(0, 200)}`);
    } else {
      const msg = await r.text();
      // daily quota used up on this key: fail over to another key if available
      if (r.status === 429 && /per_?day|PerDay/i.test(msg)) {
        exhaustedKeys.add(apiKey);
        if (exhaustedKeys.size < API_KEYS.length) continue;
        quotaExhausted = true;
        throw new Error(`daily quota for ${MODEL} is used up on all ${API_KEYS.length} key(s) — run npm run tts again after it resets`);
      }
      if (attempt >= 5 || ![429, 500, 502, 503, 504, 599].includes(r.status)) throw new Error(`HTTP ${r.status}: ${msg.slice(0, 200)}`);
    }
    await new Promise((res) => setTimeout(res, 1500 * 2 ** attempt));
    attempt++;
  }
}

/** WAV (or raw 24 kHz PCM) → trimmed, loudness-normalised mono mp3. */
function encode({ data, mime }, outFile) {
  const tmp = path.join(OUT_DIR, `.tmp-${crypto.randomUUID()}.wav`);
  const isWav = data.subarray(0, 4).toString() === 'RIFF' || /wav/i.test(mime);
  fs.writeFileSync(tmp, data);
  const input = isWav ? ['-i', tmp] : ['-f', 's16le', '-ar', '24000', '-ac', '1', '-i', tmp];
  try {
    execFileSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', ...input,
      '-af', 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse,loudnorm=I=-16:TP=-1.5:LRA=11',
      '-ac', '1', '-ar', '24000', '-b:a', '48k', outFile,
    ]);
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

let done = 0, failed = 0, quotaExhausted = false;
const queue = [...todo];
async function worker() {
  while (queue.length && !quotaExhausted) {
    const job = queue.shift();
    try {
      encode(await synth(job.text), path.join(OUT_DIR, job.file));
      for (const k of job.keys) manifest[k] = `/audio/${job.file}`;
      done++;
      if (done % 10 === 0 || done === todo.length) {
        fs.writeFileSync(MANIFEST, JSON.stringify(sortKeys(manifest), null, 1));
        console.log(`  ${done}/${todo.length}`);
      }
    } catch (e) {
      failed++;
      console.warn(`  ✗ ${job.keys[0]}  ${job.text}  — ${e.message}`);
    }
  }
}
const sortKeys = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length || 1) }, worker));

// drop manifest entries whose key no longer exists in the content
for (const k of Object.keys(manifest)) if (!jobs.has(k)) delete manifest[k];
fs.writeFileSync(MANIFEST, JSON.stringify(sortKeys(manifest), null, 1));
console.log(`done: ${done} generated, ${failed} failed, ${Object.keys(manifest).length} keys with audio${quotaExhausted ? ` — stopped: daily quota for ${MODEL} used up on all ${API_KEYS.length} key(s), ${queue.length + failed} left` : ''}`);
