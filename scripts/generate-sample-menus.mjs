import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const outDir = path.join(ROOT, 'public/sample-menus');
fs.mkdirSync(outDir, { recursive: true });

function renderMenuSvg({ title, subtitle, items, bg = '#faf7f0', border = '#9e3d24' }) {
  const itemRows = items.map((it, idx) => {
    const y = 200 + idx * 72;
    return `
      <g transform="translate(60, ${y})">
        <rect x="0" y="-35" width="680" height="60" rx="6" fill="#ffffff" stroke="#e8e4d8" stroke-width="1.5" />
        <text x="24" y="5" font-family="'Shippori Mincho B1', 'Yu Mincho', 'Hiragino Mincho ProN', serif" font-size="24" font-weight="bold" fill="#282b25">${it.name}</text>
        <text x="24" y="24" font-family="'Hiragino Sans', 'Yu Gothic', sans-serif" font-size="12" fill="#7a7c72">${it.ruby || ''}</text>
        <text x="656" y="6" text-anchor="end" font-family="'Shippori Mincho B1', serif" font-size="20" font-weight="600" fill="${border}">${it.price}</text>
      </g>
    `;
  }).join('');

  return `
    <svg width="800" height="740" viewBox="0 0 800 740" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="${bg}" />
          <stop offset="100%" stop-color="#f0ece1" />
        </linearGradient>
      </defs>
      <!-- Background -->
      <rect x="0" y="0" width="800" height="740" fill="url(#bgGrad)" />
      <!-- Borders -->
      <rect x="25" y="25" width="750" height="690" rx="8" fill="none" stroke="${border}" stroke-width="3" opacity="0.8" />
      <rect x="33" y="33" width="734" height="674" rx="6" fill="none" stroke="#d5cebd" stroke-width="1" />
      
      <!-- Seal -->
      <rect x="670" y="55" width="55" height="55" rx="4" fill="none" stroke="${border}" stroke-width="2" />
      <text x="697" y="93" text-anchor="middle" font-family="'Shippori Mincho B1', serif" font-size="32" font-weight="bold" fill="${border}">名</text>

      <!-- Header -->
      <text x="400" y="90" text-anchor="middle" font-family="'Shippori Mincho B1', 'Yu Mincho', serif" font-size="36" font-weight="bold" fill="#222" letter-spacing="4">${title}</text>
      <text x="400" y="125" text-anchor="middle" font-family="'Hiragino Sans', sans-serif" font-size="14" fill="#666" letter-spacing="2">${subtitle}</text>
      <line x1="150" y1="145" x2="650" y2="145" stroke="${border}" stroke-width="1.5" opacity="0.6" />

      <!-- Items -->
      ${itemRows}

      <!-- Footer -->
      <text x="400" y="685" text-anchor="middle" font-family="'Hiragino Sans', sans-serif" font-size="12" fill="#888">※ 表示価格はすべて税込です。本日仕入れの新鮮な食材をご提供しております。</text>
    </svg>
  `;
}

const samples = [
  {
    file: 'yakiniku.jpg',
    title: '炭火焼肉 和牛苑',
    subtitle: '厳選国産黒毛和牛・本日のおすすめ部位',
    border: '#b7462d',
    items: [
      { name: '特選上カルビ', ruby: 'とくせんじょうかるび', price: '¥ 1,480' },
      { name: '極上厚切り牛タン塩', ruby: 'ごくじょうあつぎりぎゅうたんしお', price: '¥ 1,380' },
      { name: '和牛上ハラミ', ruby: 'わぎゅうじょうはらみ', price: '¥ 1,280' },
      { name: 'シマチョウ（牛大腸）', ruby: 'しまちょう', price: '¥ 880' },
      { name: '自家製白菜キムチ', ruby: 'じかせいはくさいきむち', price: '¥ 450' },
      { name: 'アサヒ樽生ビール（中）', ruby: 'あさひたるなまびーる', price: '¥ 580' }
    ]
  },
  {
    file: 'yakitori.jpg',
    title: '炭火串焼き 鳥よし',
    subtitle: '職人が備長炭で焼き上げる自慢の鶏料理',
    border: '#747045',
    items: [
      { name: 'もも貴族焼（たれ・塩）', ruby: 'ももきぞくやき', price: '¥ 350' },
      { name: '極上ねぎま串', ruby: 'ごくじょうねぎまくし', price: '¥ 240' },
      { name: '特製手作りつくね', ruby: 'てづくりつくね', price: '¥ 280' },
      { name: 'さっぱり鶏皮ポン酢', ruby: 'さっぱりとりかわぽんず', price: '¥ 420' },
      { name: '名物！自家製ポテトサラダ', ruby: 'めいぶつぽてとさらだ', price: '¥ 480' },
      { name: '角ハイボール', ruby: 'かくはいぼーる', price: '¥ 490' }
    ]
  },
  {
    file: 'sushi.jpg',
    title: '築地 魚がし寿司',
    subtitle: '毎朝市場直送・旬の江戸前握りお品書き',
    border: '#3c6e71',
    items: [
      { name: '本マグロ大トロ（一貫）', ruby: 'ほんまぐろおおとろ', price: '¥ 550' },
      { name: '天然本マグロ赤身', ruby: 'てんねんほんまぐろあかみ', price: '¥ 380' },
      { name: '炙りサーモンハラス', ruby: 'あぶりさーもんはらす', price: '¥ 300' },
      { name: '天然〆さば（自家製）', ruby: 'てんねんしめさば', price: '¥ 260' },
      { name: '特選生ウニ軍艦', ruby: 'とくせんなまうにぐんかん', price: '¥ 680' },
      { name: 'あがり（粉茶）', ruby: 'あがり', price: '無料' }
    ]
  }
];

for (const s of samples) {
  const svg = renderMenuSvg(s);
  const outPath = path.join(outDir, s.file);
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(outPath);
  console.log(`Generated ${s.file}`);
}
