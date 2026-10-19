# 焼肉メニュー図鑑 · Yakiniku Menu Guide

在日本烤肉店看菜单用的小工具：日文名、读音（假名 + 罗马字 + 语音）、中英文意思、在动物身上的部位、生/熟样子、怎么烤。
分「基础版」和「连锁店」两部分，所有内容都在 JSON 里，加东西不用改代码。

## 运行

```bash
cd yakiniku-guide
python -m http.server 8000
```
浏览器打开 http://localhost:8000 。手机和电脑在同一网络时，用电脑的局域网 IP 访问即可。
（必须用本地服务器，直接双击 index.html 会读不到数据。）

## 目录

```
index.html            页面骨架
css/style.css         样式（含深色模式）
js/app.js             界面与路由（#/base/beef、#/chain/king）
js/data.js            读取 data/index.json 列出的所有数据文件
js/meat-art.js        没有照片时的示意插图
js/audio.js           播放 assets/audio/*.wav，缺失时用浏览器日语语音
js/i18n.js            界面文字（中文 / English）
data/index.json       数据文件目录 ← 加新店只要在这里登记
data/base/*.json      基础版：牛、猪、鸡、菜单用语
data/chains/*.json    连锁店：叙々苑、焼肉きんぐ、牛角
data/animals/*.svg    动物部位图，部位用 id="r-<region>"
assets/audio/         生成的发音 + manifest.json
assets/img/<id>/      raw.jpg / cooked.jpg
tools/                生成语音、找图、校验数据的脚本
```

## 数据格式

基础菜品（`data/base/beef.json` 里的一项）：
```json
{ "id": "beef.karubi", "ja": "カルビ", "kana": "かるび", "romaji": "karubi",
  "en": "Short rib / belly", "zh": "牛五花", "region": "karubi",
  "part": { "ja": "お腹（おなか）", "en": "belly", "zh": "腹部" },
  "how":  { "ja": "…", "en": "…", "zh": "…" },
  "art":  { "shape": "slice", "color": "#b3313a", "fat": 3 },
  "images": { "raw": { "src": "assets/img/beef.karubi/raw.jpg", "credit": "…", "license": "CC BY 4.0", "source": "…" } },
  "tts": "可选：读音不对时手动指定朗读文本" }
```

连锁店菜品只需用 `base` 指向基础菜品，部位图、示意图、照片会自动继承：
```json
{ "id": "king.aburi-misuji", "ja": "炙りミスジ〜ねぎ塩ポン酢〜", "kana": "…", "romaji": "…",
  "en": "…", "zh": "…", "base": "beef.misuji", "category": "meat", "status": "signature",
  "desc": { "ja": "…", "en": "…", "zh": "…" } }
```
`status`：`signature` 名物 / `regular` 常规 / `limited` 期间限定 / `check` 需确认。
`category`：`meat` / `offal` / `side` / `rice`。

### 加一家新店
1. 复制 `data/chains/gyukaku.json` 改成新店，写上 `official_url`、`checked`（核对日期）、`sources`。
2. 在 `data/index.json` 的 `chains` 里加一行。
3. `python tools/validate.py` 检查。

### 加一种新动物（比如羊）
加 `data/animals/lamb.svg`（部位元素加 `class="rg" id="r-xxx"`）和 `data/base/lamb.json`（`"animal": "lamb"`），在 index.json 登记。

## 发音（Gemini TTS）

1. 复制 `.env.example` 为 `.env`，填入 `GEMINI_API_KEY=...`（`.env` 已在 .gitignore 里，不会被提交）。
2. 运行：
```bash
pip install -r tools/requirements.txt
python tools/gen_tts.py                            # 只生成还没有音频的
python tools/gen_tts.py --only words.jo --force    # 重做某一条
```
- 默认模型 `gemini-3.8-flash-lite-tts`。想要更高音质可加 `--model gemini-3.8-flash-tts`。
- 3.8 版 TTS 会把输入文字逐字读出来，所以朗读要求（标准语、慢、清楚）放在 `speech_metadata.style` 里，文本只放要读的词。
- 默认读 `kana`，避免汉字读错。哪条听着怪，就给它加 `"tts"` 字段再 `--force` 重做。

## 图片

```bash
python tools/images.py search beef.karubi "karubi beef"          # 从 Wikimedia Commons 找自由授权图（带授权信息）
python tools/images.py use beef.karubi raw tools/candidates/beef.karubi/2.jpg
python tools/images.py add king.shimacho cooked 我拍的.jpg --credit "Photo: 自己"
python tools/images.py generate beef.karubi cooked                # Gemini 生成（标记为 AI 生成）
```
脚本会自动把路径和署名写回 JSON。没有照片的条目显示示意插图。

**关于店家图片**：官网和别人发的照片有版权，自己用没关系，但放进给别人用的工具里需要授权。推荐：在店里自己拍（注意店内规定），或用自由授权图 / AI 生成图，并在 `official_url` 链接到官方菜单。

## 校验
```bash
python tools/validate.py
```
检查 id 重复、`base` 链接、部位是否存在于 SVG、图片文件、缺少的音频。

## 注意
连锁店菜单经常改版（焼肉きんぐ 每年会换几次「五大名物」）。每家店都有 `checked` 日期，标 `check` 的条目表示不确定是否仍在售。
