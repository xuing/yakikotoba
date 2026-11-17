# やきことば · Yaki Kotoba

[中文](README.md) · **日本語** · [English](README.en.md)

[![CI](https://github.com/xuing/yakikotoba/actions/workflows/ci.yml/badge.svg)](https://github.com/xuing/yakikotoba/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Astro 7](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![Node >=22](https://img.shields.io/badge/Node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)

**日本の食卓・部位図鑑 ＆ AIメニュー認識ガイド** —— 焼肉・焼き鳥・寿司のメニュー表記、部位の正体、お店ごとの呼び方、音声発音、食文化のストーリーをひとつにつなぐ Web ガイドです。中国語・日本語の UI 切り替えとレスポンシブデザインに対応しています。

---

## 主な機能

- **探索トップ＆インタラクティブ図鑑（`/`, `/?view=atlas`, `/learn/<group>/<id>/`）**
  **115 のエントリー**（焼肉 37・焼き鳥 20・寿司・魚 58）を収録。日・中・英の三言語対照、ルビ振り（`{漢字|かな}`）、部位写真、由来や背景ストーリー、参考文献を掲載。カテゴリ絞り込み、日替わりクイズ、`/` キーで開く横断検索（日本語・かな・ローマ字・中国語対応）を備えています。
- **AI メニュー認識スキャナー（`/scan/`）**
  **Gemini 3.8 Flash** のマルチモーダル視覚解析により、カメラ撮影・画像アップロード・ドラッグ＆ドロップ・**内蔵サンプルメニュー 3 種**（焼肉・焼き鳥・寿司）から手書きや縦書きのメニューを精密に解読。図鑑収録語は公式解説ページと発音へ直接リンクし、サイドメニューやドリンクなど図鑑外の品目も AI がリアルタイムで解説します。
- **大手チェーン 8 社のメニュー対照（`/menus/`）**
  **焼肉きんぐ、牛角、叙々苑、鳥貴族、秋吉、スシロー、くら寿司、はま寿司** の実際のメニュー表記と名物料理を食材・部位に紐づけて整理しています。
- **三言語メニュー辞典（`/menu/`）**
  カテゴリ・チェーン別の絞り込み、出典付きの高解像度フォトライトボックス、**Gemini TTS** によるオフライン日本語音声再生（未生成項目はブラウザの `speechSynthesis` へ自動フォールバック）を備えた一覧辞典です。
- **お気に入り＆学習進捗（`/?view=saved`）**
  お気に入り登録や「覚えた」記録はブラウザの `localStorage` に保存され、ログイン不要ですぐに使えます。

---

## 技術スタックとディレクトリ構成

- **フロントエンド**: Astro 7（静的サイト生成）、ネイティブ CSS デザインシステム、Wanakana / Sharp 画像最適化
- **コンテンツ管理**: YAML コンテンツコレクション (`src/content/`) ＋ `yaml` / Zod スキーマ検証
- **AI・音声生成**: Google Gemini 3.8 Flash（Cloudflare Pages Functions 経由のメニュー画像解析）、Gemini TTS ＋ `ffmpeg`（コンテンツハッシュ管理された MP3 音声生成）

| パス | 内容 |
|---|---|
| `src/pages/` | ページルート：`index.astro`、`learn/[group]/[id].astro`、`menus.astro`、`menu.astro`、`scan.astro` |
| `src/content/` | YAML データ：`tabs/`（3 カテゴリ）、`groups/`（13 グループ・115 項目）、`chains/`（8 チェーン） |
| `src/assets/media/` | 部位・料理・ロゴ画像アセット（各フォルダの `meta.yaml` に出典・ライセンスを明記） |
| `src/data/` | ビルド用インデックス：`canonical-ids.json`（AI 照合辞書）と `audio.json`（音声マップ） |
| `src/lib/`・`src/scripts/` | データモデル構築、ルビ解析、Gemini プロンプト／API 連携、クライアントスクリプト |
| `functions/api/scan.ts` | Cloudflare Pages Functions `/api/scan` エンドポイント（レート制限・画像サイズ検証付き） |
| `public/` | 静的アセット：オフライン音声 `audio/*.mp3`、サンプルメニュー `sample-menus/*.jpg` |
| `scripts/` | CLI スクリプト：`check.mjs`、`build-scan-data.mjs`、`tts.mjs`、`generate-sample-menus.mjs` |
| `docs/CONTENT.md` | コンテンツ形式仕様・ルビ記法・データ更新手順（中国語ドキュメント） |
| `CONTRIBUTING.md` | コントリビューション手順・メディア出典ルール・PR 前チェックリスト |
| `LICENSE` | MIT ライセンスおよび第三者メディア素材の権利・帰属表示 |

---

## クイックスタート

### 動作要件

- **Node.js `>= 22.0.0`**（`22` LTS 推奨）
- `npm run tts` で新規音声を生成する場合のみ、パスが通った **`ffmpeg`** が必要です

### セットアップ

```bash
git clone https://github.com/xuing/yakikotoba.git
cd yakikotoba
npm install
cp .env.example .env   # 任意：ローカルで /scan/ や npm run tts を試す場合は GEMINI_API_KEY を設定
npm run dev            # ローカル開発サーバー起動：http://localhost:4321/
```

### npm スクリプト一覧

| コマンド | 説明 |
|---|---|
| `npm install` | 依存パッケージをインストール |
| `npm run dev` | Astro 開発サーバーを起動（`/api/scan` ローカル開発ミドルウェア付き） |
| `npm run check` | 項目 ID・チェーン参照・画像／`meta.yaml`・`canonical-ids.json`・音声ファイルの整合性を検証 |
| `npm run build` | `dist/` ディレクトリへ静的サイトをビルド |
| `npm run preview` | ビルド済み `dist/` をローカルプレビュー |
| `npm run scan:data` | `src/content/` から `src/data/canonical-ids.json` を再生成 |
| `npm run tts` | Gemini TTS と `ffmpeg` で未生成の日本語発音 MP3 を作成し `src/data/audio.json` を更新 |
| `npm run sample:menus` | `public/sample-menus/` に内蔵サンプルメニュー画像 3 枚を生成 |

### 環境変数（`.env`）

| 変数名 | 必須 | デフォルト値 | 説明 |
|---|---|---|---|
| `GEMINI_API_KEY` | スキャン／TTS 時必須 | — | Google Gemini API キー（単一キーのほか、`["key1","key2"]` 配列形式や `key1,key2` カンマ区切りでの複数キー自動ローテーション＆`429` フェイルオーバーに対応；静的閲覧のみなら不要） |
| `GEMINI_SCAN_MODEL` | 任意 | `gemini-3.8-flash` | `/api/scan` で使用するマルチモーダル視覚モデル |
| `GEMINI_TTS_MODEL` | 任意 | `gemini-3.8-flash-lite-tts` | `npm run tts` で使用する音声合成モデル |
| `GEMINI_TTS_VOICE` | 任意 | `Kore` | `npm run tts` で使用する音声ボイス名 |
| `PUBLIC_SITE_URL` | 任意 | `https://yakikotoba.pages.dev` | `canonical` および OpenGraph タグ生成用の本番サイト URL |

---

## デプロイガイド

### Cloudflare Pages（推奨：`/scan/` フル機能対応）

リポジトリ内の [`wrangler.toml`](wrangler.toml) と [`functions/api/scan.ts`](functions/api/scan.ts) により、静的サイトと `/api/scan` サーバーレス関数をそのままホスティングできます。

1. Cloudflare Pages にリポジトリを連携し、以下を設定します：
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
2. プロジェクトの **Settings → Environment variables / Secrets** に `GEMINI_API_KEY` を設定します（必要に応じて `GEMINI_SCAN_MODEL`、`PUBLIC_SITE_URL` も指定）。

### 静的ホスティングのみ（GitHub Pages / Netlify Static / Nginx 等）

`npm run build` で生成された `dist/` を任意の静的ホスティングへ配信できます。トップページ・食材図鑑・115 の詳細ページ・チェーン店メニュー一覧・三言語辞典・生成済み音声再生は完全に動作しますが、`/scan/` ページの `/api/scan` エンドポイントには `GEMINI_API_KEY` を安全に中継するサーバーレス環境が必要なため、純粋な静的ホスティングのみでは AI スキャン機能は動作しません。

---

## コントリビューションと権利表記

- **データ追加・修正**：[コンテンツ仕様 (`docs/CONTENT.md`)](docs/CONTENT.md) と [コントリビューションガイド (`CONTRIBUTING.md`)](CONTRIBUTING.md) を参照のうえ、PR 前に `npm run scan:data && npm run check && npm run build` を実行してください。
- **ライセンス・画像出典**：本リポジトリのソースコードは [MIT License](LICENSE) の下で公開されています。農林水産省（MAFF）公開画像、Wikimedia Commons のオープンライセンス写真、各外食チェーン公式画像の権利と出典詳細は [LICENSE](LICENSE) および各 `meta.yaml` をご確認ください。
