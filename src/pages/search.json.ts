// /search.json — one compact list of every word on the site, for the client-side search.
import type { APIRoute } from 'astro';
import { getCuts, getDishes, getTerms, getChains, getPhraseScenes, sectionInfo, sectionOf } from '../lib/content';
import { stripRuby } from '../lib/ruby';

type Entry = {
  t: 'cut' | 'dish' | 'term' | 'chain' | 'item' | 'phrase';
  u: string; // path below /<lang>/
  ja: string;
  ruby?: string;
  kana?: string;
  ro?: string;
  zh?: string;
  en?: string;
  al?: string[]; // aliases & menu variants (searchable)
  sub?: string; // context label
  seg?: 1; // may be used to split compound menu words
};

const arr = (v: unknown): string[] => (Array.isArray(v) ? v : v ? [v] : []).map((x) => (typeof x === 'string' ? x : (x as { ja?: string })?.ja ?? '')).filter(Boolean);

export const GET: APIRoute = async () => {
  const out: Entry[] = [];
  for (const c of await getCuts()) {
    const d = c.data;
    out.push({
      t: 'cut', u: `cuts/${c.id}/`, ja: d.ja, ruby: d.ruby, kana: d.kana, ro: d.romaji, zh: d.name.zh, en: d.name.en,
      al: [...arr(d.aka?.ja), ...arr(d.aka?.zh), ...arr(d.aka?.en), ...arr(d.variants), ...(d.kanji ? [d.kanji] : [])],
      sub: sectionInfo(sectionOf(c))?.ja, seg: 1,
    });
  }
  for (const x of await getTerms()) {
    const d = x.data;
    out.push({ t: 'term', u: `words/#${x.id}`, ja: d.ja, ruby: d.ruby, kana: d.kana, ro: d.romaji, zh: d.name.zh, en: d.name.en, seg: 1 });
  }
  for (const x of await getDishes()) {
    const d = x.data;
    out.push({ t: 'dish', u: `dishes/#${x.id}`, ja: d.ja, ruby: d.ruby, kana: d.kana, ro: d.romaji, zh: d.name.zh, en: d.name.en, seg: 1 });
  }
  for (const ch of await getChains()) {
    const d = ch.data;
    out.push({ t: 'chain', u: `chains/${ch.id}/`, ja: d.ja, kana: d.kana, ro: d.romaji, en: d.brand, al: d.brand ? [d.brand] : [] });
    for (const it of d.items) {
      out.push({ t: 'item', u: `chains/${ch.id}/#${it.id}`, ja: it.ja, ruby: it.ruby, kana: it.kana, ro: it.romaji, zh: it.name?.zh, en: it.name?.en, sub: d.ja });
    }
  }
  for (const s of await getPhraseScenes()) {
    for (const p of s.data.phrases) {
      out.push({ t: 'phrase', u: `phrases/#${s.id}-${p.id}`, ja: stripRuby(p.ruby ?? p.ja), ruby: p.ruby, kana: p.kana, ro: p.romaji, zh: p.zh, en: p.en });
    }
  }
  for (const e of out) {
    for (const k of Object.keys(e) as (keyof Entry)[]) {
      const v = e[k];
      if (v == null || v === '' || (Array.isArray(v) && !v.length)) delete e[k];
    }
  }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
