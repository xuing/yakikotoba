import { getImage } from 'astro:assets';
import { getModel } from './content';
import { audioFor } from './audio';
import { rubyToKana, hasKanji } from './ruby';

export const categories = [
  {
    id: 'yakiniku', title: '烤肉', ja: '焼肉', en: 'YAKINIKU',
    subtitle: '从一片雪花，认识一头牛。', subtitleJa: '一枚の霜降りから、一頭の牛を知る。',
    description: '牛肉部位、内脏、配菜与点单用语', descriptionJa: '牛肉の部位・ホルモン・サイドメニュー・注文用語',
    icon: 'fire', cover: 'beef/karubi', color: 'rust',
  },
  {
    id: 'yakitori', title: '烧鸟', ja: '焼き鳥', en: 'YAKITORI',
    subtitle: '一根竹签，串起整只鸡。', subtitleJa: '一本の串に、鶏一羽の知恵。',
    description: '鸡肉部位、串烧做法与居酒屋用语', descriptionJa: '鶏肉の部位・串焼きの技・居酒屋用語',
    icon: 'skewer', cover: 'chicken/negima', color: 'olive',
  },
  {
    id: 'sushi', title: '寿司与鱼', ja: '寿司・魚', en: 'SUSHI & FISH',
    subtitle: '从海洋到餐桌，不止一贯。', subtitleJa: '海から食卓へ、一貫の向こう側。',
    description: '寿司鱼种、食材原貌与职人手艺', descriptionJa: '寿司ネタ・魚の本来の姿・江戸前の仕事',
    icon: 'fish', cover: 'sushi-types/nigiri', color: 'blue',
  },
] as const;

const editorial: Record<string, { title: string; summary: string; tag: string }> = {
  'beef/karubi': { title: 'カルビ，到底是哪块肉？', summary: '不只是“牛五花”。同一个菜单名，在不同店里也可能指不同部位。', tag: '部位入门' },
  'chicken/negima': { title: '鸡肉串里的「ま」，原来是鱼？', summary: '从江户的葱鲔锅，到今天的鸡肉大葱串，一个名字藏着一段饮食变迁。', tag: '名字的故事' },
  'maguro/otoro': { title: '赤身、中トロ、大トロ，差在哪？', summary: '同一条金枪鱼，部位不同，脂肪、口感和名字也大不一样。', tag: '寿司入门' },
  'neta/hirame': { title: '盘子里的白身鱼，本来长什么样？', summary: '双眼在身体同一侧的牙鲆，小时候其实和普通鱼一样。', tag: '认识原貌' },
  'beef/harami': { title: '像瘦肉的ハラミ，竟然算内脏？', summary: '它来自横膈膜。跟着一份菜单，认识食材分类与口感之间的区别。', tag: '餐桌冷知识' },
  'neta/samon': { title: '寿司里的サーモン，从哪里来？', summary: '从养殖鲑鳟到生食寿司，认识菜单上熟悉的橙色鱼肉。', tag: '从产地到餐桌' },
};

export const learnUrl = (ref: string) => `/learn/${ref}/`;

async function buildGuide() {
  const tabs = await getModel();
  const entries = await Promise.all(tabs.flatMap(tab => tab.groups.flatMap(group => group.rows.map(async row => {
    const { item } = row;
    const category = categories.find(c => c.id === tab.id)!;
    const cover = row.photo ? (await getImage({ src: row.photo.image, width: Math.min(row.photo.image.width, 720), format: 'webp' })).src : undefined;
    const kana = item.tts ?? (item.ruby ? rubyToKana(item.ruby) : hasKanji(item.ja) ? item.kana ?? item.ja : item.ja);
    return {
      ...row, category: tab.id, categoryTitle: category.title, categoryJa: tab.ja, color: category.color,
      group: group.id, groupTitle: group.zh ?? group.ja, groupJa: group.ja,
      cover, url: learnUrl(row.ref), kana, audio: audioFor(`row:${row.ref}`),
      title: editorial[row.ref]?.title ?? item.mean?.zh ?? item.ja,
      summary: editorial[row.ref]?.summary ?? item.part?.zh ?? item.note?.zh ?? item.mean?.zh ?? '',
      tag: editorial[row.ref]?.tag ?? group.zh ?? group.ja,
    };
  }))));
  const search = entries.map(e => ({
    ref: e.ref, ja: e.item.ja, zh: e.item.mean?.zh ?? e.item.ja, romaji: e.item.romaji ?? '', kana: e.kana,
    category: e.categoryTitle, categoryJa: e.categoryJa, url: e.url, cover: e.cover,
    terms: [e.item.ja, e.item.kana, e.item.romaji, e.item.mean?.zh, e.item.mean?.ja, e.item.mean?.en, e.item.part?.zh, e.item.part?.ja, ...e.chains.map(c => c.ja)].filter(Boolean).join(' '),
  }));
  return { tabs, entries, search };
}

let cached: ReturnType<typeof buildGuide> | undefined;
export function getGuide() { return cached ??= buildGuide(); }
export type GuideEntry = Awaited<ReturnType<typeof getGuide>>['entries'][number];
