// Anatomy charts: src/maps/<map>.svg (shapes, extracted from MAFF's 部位図鑑 posters)
// + src/content/maps/<map>.yaml (numbered markers / regions → cut ids).
const svgs = import.meta.glob<string>('/src/maps/*.svg', { eager: true, query: '?raw', import: 'default' });

export type MapSvg = { viewBox: string; width: number; height: number; inner: string };

const cache = new Map<string, MapSvg | null>();

export function mapSvg(name: string): MapSvg | null {
  if (cache.has(name)) return cache.get(name)!;
  const raw = svgs[`/src/maps/${name}.svg`];
  let out: MapSvg | null = null;
  if (raw) {
    const open = raw.match(/<svg\b[^>]*>/i)?.[0] ?? '';
    const vb = open.match(/viewBox\s*=\s*["']([^"']+)["']/i)?.[1];
    const w = parseFloat(open.match(/\bwidth\s*=\s*["']?([\d.]+)/i)?.[1] ?? '0');
    const h = parseFloat(open.match(/\bheight\s*=\s*["']?([\d.]+)/i)?.[1] ?? '0');
    const viewBox = vb ?? `0 0 ${w || 100} ${h || 100}`;
    const [, , vw, vh] = viewBox.split(/[\s,]+/).map(Number);
    const inner = raw
      .replace(/<\?xml[\s\S]*?\?>/g, '')
      .replace(/<!DOCTYPE[\s\S]*?>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/^[\s\S]*?<svg\b[^>]*>/i, '')
      .replace(/<\/svg>\s*$/i, '')
      // the site styles the chart; drop the standalone <style> and fixed colours
      .replace(/<style[\s\S]*?<\/style>/gi, '');
    out = { viewBox, width: vw, height: vh, inner };
  }
  cache.set(name, out);
  return out;
}

export const hasMap = (name: string) => !!svgs[`/src/maps/${name}.svg`];

export const mapNames = () => Object.keys(svgs).map((p) => p.replace(/^\/src\/maps\/|\.svg$/g, ''));

/** Standalone SVG with the site palette baked in (light + dark), for <img> thumbnails. */
export function standaloneSvg(name: string): string | null {
  const m = mapSvg(name);
  if (!m) return null;
  const css = [
    'path,polygon,rect,circle,ellipse{vector-effect:non-scaling-stroke}',
    '.body{fill:#e3d4bf}.organ{fill:#f1e8da;stroke:#fffcf6;stroke-width:1.2}.line{fill:none;stroke:#fffcf6;stroke-width:1.4}',
    '@media (prefers-color-scheme:dark){.body{fill:#3b342c}.organ{fill:#2a2520;stroke:#1c1916}.line{stroke:#1c1916}}',
  ].join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${m.viewBox}"><style>${css}</style>${m.inner}</svg>`;
}
