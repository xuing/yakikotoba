// Read-side helpers over the content collections: lookups, cross-references, URLs.
import { getCollection, type CollectionEntry } from 'astro:content';
import { href, type Locale } from '../i18n/ui';

export type Cut = CollectionEntry<'cuts'>;
export type Dish = CollectionEntry<'dishes'>;
export type Term = CollectionEntry<'terms'>;
export type PhraseScene = CollectionEntry<'phrases'>;
export type Chain = CollectionEntry<'chains'>;
export type ChainItem = Chain['data']['items'][number];
export type MapEntry = CollectionEntry<'maps'>;
export type Marker = MapEntry['data']['markers'][number];
export type Region = MapEntry['data']['regions'][number];

export const SECTIONS = [
  { id: 'beef', ja: '牛', kana: 'うし', romaji: 'ushi', zh: '牛肉', en: 'Beef', maps: ['beef', 'beef-offal'] },
  { id: 'horumon', ja: 'ホルモン', kana: 'ほるもん', romaji: 'horumon', zh: '牛内脏', en: 'Beef offal', maps: ['beef-offal'] },
  { id: 'pork', ja: '豚', kana: 'ぶた', romaji: 'buta', zh: '猪肉', en: 'Pork', maps: ['pork', 'pork-offal'] },
  { id: 'chicken', ja: '鶏', kana: 'とり', romaji: 'tori', zh: '鸡肉', en: 'Chicken', maps: ['chicken', 'chicken-offal'] },
  { id: 'more', ja: 'その他', kana: 'そのた', romaji: 'sono ta', zh: '其他', en: 'More', maps: [] as string[] },
] as const;
export type SectionId = (typeof SECTIONS)[number]['id'];
export const sectionInfo = (id: string) => SECTIONS.find((s) => s.id === id);

export const sectionOf = (cut: Cut) => cut.id.split('/')[0];
export const slugOf = (cut: Cut) => cut.id.split('/').slice(1).join('/');

const byOrder = <T extends { id: string; data: { order?: number } }>(a: T, b: T) =>
  (a.data.order ?? 999) - (b.data.order ?? 999) || a.id.localeCompare(b.id);

let cutsP: Promise<Cut[]> | undefined;
export function getCuts(): Promise<Cut[]> {
  return (cutsP ??= getCollection('cuts').then((all) => {
    const rank = (c: Cut) => SECTIONS.findIndex((s) => s.id === sectionOf(c));
    return all.sort((a, b) => rank(a) - rank(b) || byOrder(a, b));
  }));
}
export const cutsIn = async (section: string) => (await getCuts()).filter((c) => sectionOf(c) === section);

/** Resolve "beef/misuji" (or a bare "misuji" when unambiguous). */
export async function getCut(ref: string): Promise<Cut | undefined> {
  const all = await getCuts();
  const r = ref.trim().replace(/^cuts\//, '');
  return all.find((c) => c.id === r) ?? (r.includes('/') ? undefined : (() => {
    const hits = all.filter((c) => slugOf(c) === r);
    return hits.length === 1 ? hits[0] : undefined;
  })());
}

/** 1-based position inside its section — the "No." shown on cards. */
export async function cutNumber(cut: Cut): Promise<number> {
  return (await cutsIn(sectionOf(cut))).findIndex((c) => c.id === cut.id) + 1;
}

let mapsP: Promise<MapEntry[]> | undefined;
export const getMaps = () => (mapsP ??= getCollection('maps'));

export type Location = { map: string; markers: Marker[]; regions: Region[] };

/** Where a cut appears on the anatomy charts. */
export async function locateCut(cut: Cut): Promise<Location[]> {
  const maps = await getMaps();
  const slug = slugOf(cut);
  const matches = (refs: string[]) => refs.some((r) => r === cut.id || r === `cuts/${cut.id}` || (!r.includes('/') && r === slug));
  const order = [...(sectionInfo(sectionOf(cut))?.maps ?? [])] as string[];
  return maps
    .map((m) => ({ map: m.id, markers: m.data.markers.filter((k) => matches(k.cuts)), regions: m.data.regions.filter((g) => matches(g.cuts)) }))
    .filter((l) => l.markers.length || l.regions.length)
    .sort((a, b) => (order.indexOf(a.map) + 99) % 99 - (order.indexOf(b.map) + 99) % 99);
}

let chainsP: Promise<Chain[]> | undefined;
export const getChains = () =>
  (chainsP ??= getCollection('chains').then((all) =>
    all.sort((a, b) => (a.data.cuisine === b.data.cuisine ? 0 : a.data.cuisine === 'yakiniku' ? -1 : 1) || (a.data.order ?? 999) - (b.data.order ?? 999) || a.id.localeCompare(b.id)),
  ));

/** Chain menu items that are made from a given cut. */
export async function chainItemsFor(cut: Cut): Promise<{ chain: Chain; item: ChainItem }[]> {
  const slug = slugOf(cut);
  const out: { chain: Chain; item: ChainItem }[] = [];
  for (const chain of await getChains()) {
    for (const item of chain.data.items) {
      if (item.cuts.some((r) => r === cut.id || r === `cuts/${cut.id}` || (!r.includes('/') && r === slug))) out.push({ chain, item });
    }
  }
  return out.sort((a, b) => Number(b.item.signature) - Number(a.item.signature));
}

let termsP: Promise<Term[]> | undefined;
export const getTerms = () => (termsP ??= getCollection('terms').then((all) => all.sort(byOrder)));
export const getTerm = async (id: string) => (await getTerms()).find((t) => t.id === id.replace(/^terms\//, ''));

let dishesP: Promise<Dish[]> | undefined;
export const getDishes = () => (dishesP ??= getCollection('dishes').then((all) => all.sort(byOrder)));
export const getDish = async (id: string) => (await getDishes()).find((d) => d.id === id.replace(/^dishes\//, ''));

let phrasesP: Promise<PhraseScene[]> | undefined;
export const getPhraseScenes = () => (phrasesP ??= getCollection('phrases').then((all) => all.sort(byOrder)));

// ---------- URLs ----------
export const cutUrl = (l: Locale, cut: Cut | string) => href(l, `cuts/${typeof cut === 'string' ? cut : cut.id}`);
export const sectionUrl = (l: Locale, section: string) => href(l, `cuts/${section}`);
export const chainUrl = (l: Locale, chain: Chain | string) => href(l, `chains/${typeof chain === 'string' ? chain : chain.id}`);
export const termUrl = (l: Locale, id: string) => `${href(l, 'words')}#${id}`;
export const dishUrl = (l: Locale, id: string) => `${href(l, 'dishes')}#${id}`;

export const TERM_CATEGORIES = ['grade', 'cut', 'seasoning', 'cooking', 'equipment', 'format', 'counter', 'origin', 'doneness', 'other'] as const;
export const DISH_CATEGORIES = ['skewer', 'rice', 'noodles', 'soup', 'kimchi', 'salad', 'side', 'dessert', 'drink', 'other'] as const;
