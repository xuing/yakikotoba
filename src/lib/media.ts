// Photos & logos live in src/assets/media/<folder>/ with a meta.yaml that credits every file.
// Folders: cuts/<section>/<id> · dishes/<id> · chains/<chain>
import YAML from 'yaml';
import type { ImageMetadata } from 'astro';

export type Credit = { title?: string; url?: string; license?: string; author?: string };
export type MediaItem = {
  path: string; // e.g. cuts/beef/misuji/maff.jpg
  file: string;
  folder: string;
  image: ImageMetadata;
  isSvg: boolean;
  kind: string; // raw | cooked | dish | logo | other
  caption?: { zh?: string; en?: string };
  source?: Credit;
};

const ROOT = '/src/assets/media/';
const images = import.meta.glob<{ default: ImageMetadata }>('/src/assets/media/**/*.{jpg,jpeg,png,webp,avif,gif,svg,JPG,JPEG,PNG}', { eager: true });
const metas = import.meta.glob<string>('/src/assets/media/**/meta.{yaml,yml}', { eager: true, query: '?raw', import: 'default' });

type MetaRow = { file?: string; kind?: string; caption?: MediaItem['caption']; source?: Credit | string; [k: string]: unknown };

function readMeta(folder: string): MetaRow[] {
  const raw = metas[`${ROOT}${folder}/meta.yaml`] ?? metas[`${ROOT}${folder}/meta.yml`];
  if (!raw) return [];
  try {
    const parsed = YAML.parse(raw);
    const rows: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.images) ? parsed.images : Array.isArray(parsed?.files) ? parsed.files : [];
    return rows.filter((r): r is MetaRow => !!r && typeof r === 'object');
  } catch {
    return [];
  }
}

function normalizeCredit(src: MetaRow['source'], row: MetaRow): Credit | undefined {
  if (typeof src === 'string') return { title: src, url: src };
  const c: Credit = { ...(src ?? {}) };
  for (const k of ['title', 'url', 'license', 'author'] as const) {
    if (!c[k] && typeof row[k] === 'string') c[k] = row[k] as string;
  }
  return c.title || c.url ? c : undefined;
}

const KIND_ORDER: Record<string, number> = { logo: 0, raw: 1, dish: 1, cooked: 2 };

const cache = new Map<string, MediaItem[]>();

/** All images in a media folder, credited, logos first, then raw, then cooked. */
export function mediaFor(folder: string): MediaItem[] {
  if (cache.has(folder)) return cache.get(folder)!;
  const prefix = `${ROOT}${folder}/`;
  const rows = readMeta(folder);
  const items: MediaItem[] = [];
  for (const [p, mod] of Object.entries(images)) {
    if (!p.startsWith(prefix)) continue;
    const file = p.slice(prefix.length);
    if (file.includes('/')) continue; // only direct children
    const row = rows.find((r) => r.file === file || r.file?.split('/').pop() === file);
    const kind = (row?.kind as string) ?? (/^logo\./i.test(file) ? 'logo' : /cook/i.test(file) ? 'cooked' : 'raw');
    items.push({
      path: `${folder}/${file}`,
      file,
      folder,
      image: mod.default,
      isSvg: /\.svg$/i.test(file),
      kind,
      caption: row?.caption,
      source: row ? normalizeCredit(row.source, row) : undefined,
    });
  }
  items.sort((a, b) => (KIND_ORDER[a.kind] ?? 3) - (KIND_ORDER[b.kind] ?? 3) || a.file.localeCompare(b.file));
  cache.set(folder, items);
  return items;
}

export const photosFor = (folder: string) => mediaFor(folder).filter((m) => m.kind !== 'logo');
export const logoFor = (folder: string) => mediaFor(folder).find((m) => m.kind === 'logo');
export function imageByName(folder: string, name?: string): MediaItem | undefined {
  if (!name) return undefined;
  const base = name.split('/').pop()!;
  return mediaFor(folder).find((m) => m.file === base) ?? mediaFor(folder).find((m) => m.file.replace(/\.\w+$/, '') === base.replace(/\.\w+$/, ''));
}

/** Every credited image on the site (for the credits page). */
export function allMedia(): MediaItem[] {
  const folders = new Set(Object.keys(images).map((p) => p.slice(ROOT.length).split('/').slice(0, -1).join('/')));
  return [...folders].sort().flatMap((f) => mediaFor(f));
}
