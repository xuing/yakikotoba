# やきことば · Yaki Kotoba

用焼肉、焼き鳥（含焼きとん）学日语的图鉴：每个菜单词怎么读、什么意思、为什么这么叫、在动物身上的哪里、长什么样。
日文始终显示，界面可切换中文 / English。

## 运行

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # 输出到 dist/，可直接放到任何静态托管
npm run tts      # 生成缺失的发音（需要 .env 里的 GEMINI_API_KEY 和 ffmpeg）
```

## 目录

| 路径 | 内容 |
|---|---|
| `src/content/` | 全部内容，YAML 格式，一个条目一个文件，格式见 [docs/CONTENT.md](docs/CONTENT.md) |
| `src/assets/media/` | 图片；每个文件夹里的 `meta.yaml` 写明每张图的来源 |
| `src/maps/` | 部位图 SVG，取自农林水产省 aff「部位図鑑」海报 |
| `src/pages/` | 页面：`/[lang]/cuts`、`chains`、`words`、`dishes`、`phrases`、`search` |
| `src/components/`、`src/lib/` | 组件；数据读取、注音（`{漢字|かな}`）、图片、部位图 |
| `src/i18n/ui.ts` | 界面文字。加一种语言就在这里加一份 |
| `scripts/tts.mjs` | Gemini TTS（`gemini-3.8-flash-lite-tts`）→ ffmpeg → `public/audio/*.mp3` |

## 加内容

- **部位**：新建 `src/content/cuts/<section>/<id>.yaml`。要在部位图上标出位置，在 `src/content/maps/<map>.yaml` 对应的编号里加上它的 id。
- **连锁店**：新建 `src/content/chains/<id>.yaml`，logo 和菜品图放到 `src/assets/media/chains/<id>/`，并在 `meta.yaml` 里写明来源。
- 加完内容后跑一次 `npm run tts`，只会为新加或改过的词生成发音。

## 图片来源

部位图和大部分部位实拍图来自农林水产省 aff 2020 年 9 月号「お肉丸わかり図鑑」（监修：日本食肉消費総合センター）。连锁店的 logo 和菜品图来自各店官网。每张图的具体出处都写在对应的 `meta.yaml` 里，页面上也会显示，完整列表见网站的「关于」页。
