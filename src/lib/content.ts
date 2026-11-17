// Builds the page model: tabs → groups → rows, and which chains serve which rows.
import { getCollection, type CollectionEntry } from 'astro:content';
import { photosFor, imageByName, logoFor, type MediaItem } from './media';

type Group = CollectionEntry<'groups'>;
type Chain = CollectionEntry<'chains'>;
export type Tri = { ja?: string; zh?: string; en?: string };
export type Item = Group['data']['items'][number];

export type ChainHit = {
  chain: string;
  chainJa: string;
  ja: string;
  ruby?: string;
  kana?: string;
  romaji?: string;
  tts?: string;
  mean?: Tri;
  signature: boolean;
  image?: MediaItem;
  audioKey: string;
};
export type Row = { ref: string; item: Item; photo?: MediaItem; example?: boolean; chains: ChainHit[] };
export type GroupModel = { id: string; ja: string; zh?: string; en?: string; note?: Tri; rows: Row[] };
export type ChainModel = { id: string; ja: string; ruby?: string; kana?: string; romaji?: string; url?: string; note?: Tri; cuisine: string; logo?: MediaItem; count: number };
export type TabModel = { id: string; ja: string; ruby?: string; romaji?: string; zh?: string; en?: string; groups: GroupModel[]; chains: ChainModel[] };

const order = <T extends { id: string; data: { order?: number } }>(a: T, b: T) => (a.data.order ?? 99) - (b.data.order ?? 99) || a.id.localeCompare(b.id);

export async function getModel(): Promise<TabModel[]> {
  const tabs = (await getCollection('tabs')).sort(order);
  const groups = (await getCollection('groups')).sort(order);
  const chains = (await getCollection('chains')).sort(order);

  // row ref → chain menu items that are that row
  const hits = new Map<string, ChainHit[]>();
  const chainRows = new Map<string, Set<string>>();
  for (const ch of chains) {
    for (const it of ch.data.items) {
      const refs = it.rows ?? it.cuts ?? [];
      for (const ref of refs) {
        const hit: ChainHit = {
          chain: ch.id, chainJa: ch.data.ja, ja: it.ja, ruby: it.ruby, kana: it.kana, romaji: it.romaji, tts: it.tts,
          mean: it.mean ?? it.name, signature: it.signature, image: imageByName(`chains/${ch.id}`, it.image),
          audioKey: `chain-item:${ch.id}/${it.id}`,
        };
        hits.set(ref, [...(hits.get(ref) ?? []), hit]);
        chainRows.set(ch.id, (chainRows.get(ch.id) ?? new Set()).add(ref));
      }
    }
  }

  return tabs.map((tab) => {
    const gs: GroupModel[] = groups
      .filter((g) => g.id.split('/')[0] === tab.id)
      .map((g) => {
        const gid = g.id.split('/').slice(1).join('/');
        return {
          id: gid, ja: g.data.ja, zh: g.data.zh, en: g.data.en, note: g.data.note,
          rows: g.data.items.map((item) => {
            const ref = `${gid}/${item.id}`;
            const all = (hits.get(ref) ?? []).sort((a, b) => Number(b.signature) - Number(a.signature));
            const own = photosFor(`rows/${ref}`)[0];
            // no photo of its own: borrow a chain's official photo of the dish, labelled as an example
            const borrowed = own ? undefined : all.find((h) => h.image && !h.image.isSvg);
            const photo = own ?? (borrowed && {
              ...borrowed.image!,
              caption: { ja: `例：${borrowed.chainJa}「${borrowed.ja}」`, zh: `例：${borrowed.chainJa}的「${borrowed.ja}」`, en: `Example: “${borrowed.ja}” at ${borrowed.chainJa}` },
            });
            return { ref, item, photo, example: !own && !!photo, chains: all };
          }),
        };
      });
    const refs = new Set(gs.flatMap((g) => g.rows.map((r) => r.ref)));
    const tabChains: ChainModel[] = chains
      .map((ch) => ({ ch, count: [...(chainRows.get(ch.id) ?? [])].filter((r) => refs.has(r)).length }))
      .filter(({ ch, count }) => count > 0 && ch.data.cuisine === tab.id)
      .sort((a, b) => b.count - a.count || order(a.ch, b.ch))
      .map(({ ch, count }) => ({
        id: ch.id, ja: ch.data.ja, ruby: ch.data.ruby, kana: ch.data.kana, romaji: ch.data.romaji, url: ch.data.url,
        note: ch.data.note, cuisine: ch.data.cuisine, logo: logoFor(`chains/${ch.id}`), count,
      }));
    // only show menu names for chains that are offered as filters in this tab
    const shown = new Set(tabChains.map((c) => c.id));
    for (const g of gs) for (const r of g.rows) r.chains = r.chains.filter((h) => shown.has(h.chain));
    return { id: tab.id, ja: tab.data.ja, ruby: tab.data.ruby, romaji: tab.data.romaji, zh: tab.data.zh, en: tab.data.en, groups: gs, chains: tabChains };
  });
}
