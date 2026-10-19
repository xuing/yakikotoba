# 内容格式 · Content format

所有内容都是 `src/content/` 下的 YAML 文件，一个条目一个文件，构建时用 zod 校验（`src/content.config.ts`）。

## 通用字段

| 字段 | 说明 | 例 |
|---|---|---|
| `ja` | 菜单上最常见的写法 | `上タン塩` |
| `kana` | 全平假名读音；片假名转成平假名，长音保留 `ー` | `じょうたんしお`、`ろーす` |
| `romaji` | 修正黑本式，长音用长音符号 | `jō tanshio`、`rōsu` |
| `ruby` | `ja` 含汉字时必填，写法是 `{汉字|かな}` | `{上|じょう}タン{塩|しお}` |
| `tts` | 可选。读音不对时，用来覆盖朗读文本 | |
| 本地化文字 | 写成 `{ zh: …, en: … }`，`zh` 用简体中文 | |
| `sources` | `[{ title, url }]` | |

**行文**：短、准确、不说废话。不写食品安全提示，也不写「以店内为准」之类的话。
- `summary`：中文 ≤ 30 字，英文 ≤ 15 词。
- 其他说明字段：1–2 句。
- `etymology`：有出处时才写；说法不一时写「一说…」/ "One theory: …"。

**ID**：用小写 ASCII 罗马字，不带长音符号，词之间用 `-`，例如 `tan-moto`、`nakaochi-karubi`。引用部位时写成 `<section>/<id>`。

## cuts — 部位 · `src/content/cuts/<section>/<id>.yaml`
`section` 取值：`beef`（牛正肉，含タン、ハラミ、サガリ）、`horumon`（牛内脏）、`pork`（含猪内脏和焼きとん）、`chicken`（含焼き鳥部位）、`more`（羊、海鲜、蔬菜等）。

```yaml
ja: ミスジ
kanji: 三筋                      # 可选：汉字写法
kana: みすじ
romaji: misuji
animal: beef                     # beef | pork | chicken | lamb | seafood | vegetable | other
kind: meat                       # meat | offal | other
cuisines: [yakiniku]             # yakiniku | yakitori | yakiton
order: 14                        # 在本分区里的顺序（图鉴编号）
name: { zh: 板腱, en: Oyster blade }
aka: { ja: [三筋], zh: [牡蛎肉], en: [Top blade] }   # 别名，可选
variants: [上ミスジ, 炙りミスジ]     # 菜单上常见的衍生写法，可选
summary: { zh: 肩胛骨内侧的霜降希少部位, en: Marbled rare cut from inside the shoulder blade }
location: { zh: …, en: … }       # 在动物身上哪里
texture: { zh: …, en: … }        # 外观、口感、味道
etymology: { zh: …, en: … }      # 可选
grill: { zh: …, en: … }          # 怎么烤、怎么吃
profile: { fat: 3, tenderness: 4, chew: 2, richness: 4 }   # 1–5
rarity: rare                     # common | uncommon | rare
seasoning: [shio, wasabi]        # terms 里的 id，可选
yakitori: { seasoning: shio }    # 只用于焼き鳥/焼きとん：shio | tare | both
example:
  ja: ミスジを一人前ください。
  ruby: "ミスジを{一人前|いちにんまえ}ください。"
  zh: 请给我一份板腱。
  en: One portion of oyster blade, please.
related: [beef/zabuton]           # 可选
sources: [{ title: 農林水産省 aff 2020年9月号 お肉丸わかり図鑑, url: "https://www.maff.go.jp/j/pr/aff/2009/spe1_02.html" }]
```

## dishes — 菜品 · `src/content/dishes/<id>.yaml`
包括饭、面、汤、泡菜、沙拉、小菜、串（ねぎま、つくね…）、甜点、饮品。

```yaml
ja: 冷麺
kana: れいめん
romaji: reimen
ruby: "{冷麺|れいめん}"
category: noodles                # rice | noodles | soup | kimchi | salad | side | skewer | dessert | drink
cuisines: [yakiniku]
name: { zh: 冷面, en: Cold noodles }
summary: { zh: …, en: … }
etymology: { zh: …, en: … }      # 可选
kanjiParts:                       # 可选：拆解汉字
  - { char: 冷, reading: れい, zh: 冷, en: cold }
  - { char: 麺, reading: めん, zh: 面条, en: noodles }
cuts: [chicken/momo]             # 可选：由哪个部位做成，例如 ねぎま
sources: […]
```

## terms — 菜单用语 · `src/content/terms/<id>.yaml`
```yaml
ja: 上
kana: じょう
romaji: jō
ruby: "{上|じょう}"
category: grade                  # grade | cut | seasoning | cooking | format | counter | origin | doneness | equipment
position: prefix                 # prefix | suffix | word
cuisines: [yakiniku, yakitori]
name: { zh: 上等, en: Premium }
summary: { zh: …, en: … }
kanjiParts: [{ char: 上, reading: じょう, zh: 上；优等, en: above; superior }]
pitfall: { zh: 这里读じょう，不读うえ, en: Read jō here, not ue }   # 可选
examples: [上タン塩, 上カルビ]
```

## phrases — 会话 · `src/content/phrases/<scene>.yaml`
```yaml
order: 2
title: { zh: 点单, en: Ordering }
phrases:
  - id: ninmae-kudasai
    ja: タン塩を二人前ください。
    ruby: "タン{塩|しお}を{二人前|ににんまえ}ください。"
    kana: たんしおをににんまえください。
    romaji: Tanshio o ninin-mae kudasai.
    zh: 请给我两人份盐味牛舌。
    en: Two portions of salted tongue, please.
    note: { zh: 「〜を＋数量＋ください」：数量放在ください前, en: "X o [amount] kudasai — the amount goes right before kudasai" }
```

## chains — 连锁店 · `src/content/chains/<id>.yaml`
```yaml
ja: 焼肉きんぐ
kana: やきにくきんぐ
romaji: Yakiniku Kingu
brand: Yakiniku King             # 官方英文/罗马字品牌名，可选
cuisine: yakiniku                # yakiniku | yakitori
format: buffet                   # buffet | a-la-carte | both
url: "https://www.yakiniku-king.jp/"
summary: { zh: …, en: … }
courses:                         # 可选：自助套餐
  - { ja: 58品コース, kana: ごじゅうはっぴんこーす, romaji: gojūhappin kōsu, name: { zh: 58品套餐, en: 58-item course }, price: 3278, minutes: 100 }
items:
  - id: aburi-misuji
    ja: 炙りミスジ〜ねぎ塩ポン酢〜
    ruby: "{炙|あぶ}りミスジ〜ねぎ{塩|しお}ポン{酢|ず}〜"
    kana: あぶりみすじ ねぎしおぽんず
    romaji: aburi misuji negishio ponzu
    name: { zh: 炙烤板腱配葱盐柚子醋, en: Seared oyster blade with negi-shio ponzu }
    summary: { zh: …, en: … }
    cuts: [beef/misuji]          # 关联部位 → 页面上显示「在哪里」
    terms: [aburi, negishio, ponzu]
    signature: true              # 名物 / 招牌
    image: aburi-misuji.jpg      # 位于 src/assets/media/chains/<id>/
vocab:                           # 可选：这家店特有的叫法
  - { ja: 五大名物, kana: ごだいめいぶつ, romaji: godai meibutsu, zh: 五大招牌, en: The five signatures }
sources: […]
```

## maps — 部位图 · `src/content/maps/<map>.yaml` + `src/maps/<map>.svg`
`map` 取值：`beef`、`beef-offal`、`pork`、`pork-offal`、`chicken`、`chicken-offal`。

```yaml
title: { ja: 牛の部位, zh: 牛的部位, en: Beef cuts }
source: { title: …, url: … }
markers:                          # 海报上的编号点（坐标用 SVG viewBox 单位）
  - { n: 8, label: ザブトン, x: 312.5, y: 240.0, cuts: [beef/zabuton] }
regions:                          # 可选：SVG 里 id="r-<id>" 的区域
  - { id: kata, label: かた, cuts: [beef/misuji, beef/togarashi] }
```

## 图片 · `src/assets/media/…`
- `cuts/<section>/<id>/`
- `dishes/<id>/`
- `chains/<chain>/`（logo 和菜品图）

每个目录放一个 `meta.yaml`，逐张写明来源：
```yaml
- file: 1.jpg
  kind: raw                      # raw | cooked | dish | logo
  source:
    title: 農林水産省 aff「牛の部位図鑑」（監修：日本食肉消費総合センター）
    url: "https://www.maff.go.jp/j/pr/aff/2009/pdf/aff2009_02_poster01.pdf"
    license: 政府標準利用規約（第2.0版）
```
**禁止使用 AI 生成的图片。** 找不到图就不放。
