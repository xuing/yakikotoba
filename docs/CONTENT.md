# 内容格式与维护指南

**やきことば（Yaki Kotoba）** 是一个多视图静态网站，核心数据以 YAML 存储在 `src/content/`，构建时由 Astro Content Collections (`src/content.config.ts`) 与 `src/lib/content.ts`、`src/lib/guide.ts` 汇总渲染到以下页面：

| 路由 | 用途 |
|---|---|
| `/` 与 `/?view=atlas` | 探索首页与互动食材图鉴（115 个词条、场景筛选、即时搜索） |
| `/?view=saved` | 浏览器本地 `localStorage` 收藏与已读复习视图 |
| `/learn/<group>/<id>/` | 单个词条的知识详情页（照片与出处、部位、背景故事、发音、店内叫法、参考文献） |
| `/menus/` | 8 家连锁店菜单对照入口（按烤肉、烧鸟、寿司与鱼分组） |
| `/menu/` | 完整三语菜单词典（日・中・英表格、店铺筛选、图片灯箱、页面底部图片来源汇总） |
| `/scan/` | AI 拍照识菜单（调用 `/api/scan` 并与 `src/data/canonical-ids.json` 词条匹配） |

所有文本内容采用三语结构，**日语为主**，中文、英文作为辅助。

---

## 1. 分类与词条（`tabs/` 与 `groups/`）

- **场景分类**：`src/content/tabs/<tab>.yaml`，定义一级分类的名称、假名注音与显示顺序（当前包含 `yakiniku`、`yakitori`、`sushi`）。
- **词条分组**：`src/content/groups/<tab>/<group>.yaml`，一组一个文件。**`<group>` ID 必须全站唯一**，词条的全局引用格式为 `<group>/<id>`（例如 `beef/karubi`）。

```yaml
# src/content/tabs/yakiniku.yaml
order: 1
ja: 焼肉
ruby: '{焼肉|やきにく}'
romaji: yakiniku
zh: 烤肉
en: Yakiniku
```

```yaml
# src/content/groups/yakiniku/beef.yaml
order: 1
ja: 牛
zh: 牛肉
en: Beef
note:                        # 可选：整组的背景概览（三语）
  ja: …
  zh: …
  en: …
items:
  - id: tan                  # 词条 id；全局引用为 beef/tan
    ja: タン                 # 菜单上的常见写法
    ruby: "{上|じょう}タン"   # ja 含汉字时必填，格式为 {漢字|かな}
    kana: たん               # 全平假名
    romaji: tan              # 修正黑本式，长音用长音符号（如 rōsu、jō）
    tts: たん                # 可选：覆盖 Gemini TTS 朗读文本
    mean: { ja: 牛の舌, zh: 牛舌, en: Beef tongue }
    part: { ja: 舌, zh: 舌头, en: The tongue }   # 来自哪里 / 是什么
    note:                    # 解説：有依据的干货，每种语言 2–4 句
      ja: …
      zh: …
      en: …
    sources:
      - title: …
        url: "https://…"
```

### 注音格式 `{漢字|かな}`

`src/lib/ruby.ts` 会将 `{上|じょう}タン{塩|しお}` 解析为 HTML `<ruby>` 注音标签，同时供 `scripts/tts.mjs` 生成准确读音（避免「上」被误读为 `うえ` 等多音字错误）：

- `ja` 中只要包含汉字，就应填写 `ruby` 字段。
- 只在汉字块上加注音，假名与片假名保持在 `{}` 之外，例如 `{焼|や}き{鳥|とり}`、`{牛角|ぎゅうかく}カルビ`。

### 解説写作原则

- 重点写清楚：口感、脂肪与风味特征；具体解剖部位与细分叫法；词源或历史由来；菜单常见写法与点单搭配；鱼类的产季与处理工艺；一头/一条可取份量等事实。
- 只写有可靠出处的事实，并在 `sources` 中保留来源链接。说法存在分歧时，使用「一説に」/「一说」/ `"One theory"`。
- 不写泛泛的食品安全提示，也不写「具体以门店为准」之类的空话。

---

## 2. 连锁店菜单（`src/content/chains/<id>.yaml`）

连锁店配置用于 `/menus/`、`/menu/` 店铺筛选以及词条详情页的「店内叫法」示例模块：

```yaml
ja: 牛角
ruby: "{牛角|ぎゅうかく}"
kana: ぎゅうかく
romaji: Gyūkaku
cuisine: yakiniku            # 必须对应 tabs/<id>.yaml：yakiniku | yakitori | sushi
url: "https://www.gyukaku.ne.jp/"
order: 1                     # 可选排序权重
note: { ja: …, zh: …, en: … }
items:
  - id: gyukaku-karubi       # 店内菜品唯一 id
    ja: 牛角カルビ
    ruby: "{牛角|ぎゅうかく}カルビ"
    kana: ぎゅうかくかるび
    romaji: gyūkaku karubi
    rows: [beef/karubi]      # 关联一个或多个词条引用 <group>/<id>
    mean: { ja: …, zh: …, en: … }
    signature: true          # 是否标记为名物 / 招牌菜
    image: gyukaku-karubi.jpg # 对应 src/assets/media/chains/<id>/ 下的文件名
```

当某个图鉴词条在 `src/assets/media/rows/` 下没有独立图片时，`src/lib/content.ts` 会自动借用关联连锁店的官方菜品图，并在页面上标注为门店示例图（`例：…`）。

---

## 3. 图片资源与来源声明（`src/assets/media/`）

- **词条图片**：`src/assets/media/rows/<group>/<id>/`
- **连锁店图片与 Logo**：`src/assets/media/chains/<chain>/`

每个图片目录下**必须**包含 `meta.yaml`，逐张记录文件名、用途分类与来源许可信息：

```yaml
- file: maff.jpg
  kind: raw                  # raw | cooked | dish | logo
  caption:                   # 可选图注
    ja: ハラミ（横隔膜）
    zh: 横膈膜（ハラミ）
    en: Harami (diaphragm)
  source:
    title: 農林水産省「aff」2020年9月号 牛の部位図鑑（監修：日本食肉消費総合センター）
    url: "https://www.maff.go.jp/j/pr/aff/2009/pdf/aff2009_02_poster01.pdf"
    license: 公共データ利用規約（第1.0版）
    author: …                # Wikimedia Commons 等需署名作者时填写
```

> [!IMPORTANT]
> **严格禁止使用 AI 生成的食材或菜品照片。** 如找不到合法、可溯源的公开数据、开放授权（CC0 / CC BY / CC BY-SA）或官方参考图，请留空不放图片，详情页会自动显示排版文字封面。

---

## 4. 数据同步、语音生成与完整性校验

增改词条、连锁店菜品或媒体文件后，请按顺序执行以下脚本：

1. **同步 AI 识别词典索引（`npm run scan:data`）**
   - 运行 `scripts/build-scan-data.mjs`，读取 `src/content/groups/` 与 `src/content/chains/`，重新生成 `src/data/canonical-ids.json`。
   - `/api/scan` 依赖该文件构建 Gemini 系统提示词与店铺别名列表，**新增或修改词条、店铺别称后必须运行**。

2. **生成离线日语发音（`npm run tts`）**
   - 运行 `scripts/tts.mjs`，依赖 `.env` 中的 `GEMINI_API_KEY` 与系统 `PATH` 中的 `ffmpeg`。
   - 按 `模型 + 音色 + 风格 + 文本` 哈希生成内容寻址的 `public/audio/<hash>.mp3`，并更新 `src/data/audio.json`（键名为 `row:<group>/<id>`、`chain:<id>`、`chain-item:<chain>/<item>`）。
   - 常用参数：
     - `npm run tts -- --dry-run`：预览待生成的文本清单，不消耗配额
     - `npm run tts -- --only row:beef`：只生成指定前缀的词条语音
     - `npm run tts -- --force --only row:beef/tan`：强制重新生成指定音频

3. **内容与媒体校验（`npm run check`）**
   - 运行 `scripts/check.mjs`，检查分类与词条 ID 唯一性、连锁店引用的 `<group>/<id>` 是否有效、图片文件与 `meta.yaml` 是否一致、`canonical-ids.json` 与 `audio.json` / `public/audio/` 是否同步。
