# やきことば · Yaki Kotoba

[中文](README.md) · [日本語](README.ja.md) · **English**

[![CI](https://github.com/xuing/yakikotoba/actions/workflows/ci.yml/badge.svg)](https://github.com/xuing/yakikotoba/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Astro 7](https://img.shields.io/badge/Astro-7-BC52EE?logo=astro&logoColor=white)](https://astro.build)
[![Node >=22](https://img.shields.io/badge/Node-%3E%3D22-339933?logo=node.js&logoColor=white)](package.json)

**An interactive Japanese dining field guide and AI menu scanner** — connecting Japanese menu vocabulary across yakiniku, yakitori, and sushi with anatomical cuts, restaurant-chain aliases, pronunciation audio, and culinary history. Features bilingual Chinese/Japanese UI switching and a mobile-friendly responsive layout.

---

## Core Features

- **Discovery Home & Interactive Field Guide (`/`, `/?view=atlas`, `/learn/<group>/<id>/`)**
  **115 curated entries** across 3 scenes (Yakiniku: 37 · Yakitori: 20 · Sushi & Fish: 58) with Japanese/Chinese/English meanings, `{漢字|かな}` furigana, sourced cut/fish photography, background stories, citations, daily quiz, and instant `/` search (supporting kanji, kana, romaji, and Chinese).
- **AI Menu Photo Scanner (`/scan/`)**
  Powered by **Gemini 3.8 Flash** multimodal vision. Capture a photo, upload/drop an image, or try **3 built-in sample menus** (`yakiniku.jpg`, `yakitori.jpg`, `sushi.jpg`). Accurately reads vertical and handwritten Japanese menu items, linking recognized terms directly to catalog detail pages while providing live AI explanations for unlisted side dishes and drinks.
- **8 Japanese Chain Menu Guides (`/menus/`)**
  Maps real menu items and signature dishes from **Yakiniku Kingu, Gyūkaku, Jojoen, Torikizoku, Akiyoshi, Sushirō, Kurazushi, and Hamazushi** back to their underlying cuts and ingredients.
- **Complete Trilingual Dictionary (`/menu/`)**
  Compact reference table with category and chain filters, high-resolution lightbox with full media credits, and offline **Gemini TTS** Japanese pronunciation audio (with automatic Web Speech API fallback).
- **Local Bookmarks & Learning Progress (`/?view=saved`)**
  Saved entries and "learned" flags persist locally in `localStorage` with zero sign-up required.

---

## Tech Stack & Repository Structure

- **Frontend**: Astro 7 (static site generation), custom CSS design system, Wanakana, Sharp image optimization
- **Content Engine**: YAML Content Collections (`src/content/`) validated via Zod schemas and integrity scripts
- **AI & Audio**: Google Gemini 3.8 Flash (`/api/scan` via Cloudflare Pages Functions) and Gemini TTS + `ffmpeg` (content-addressed `.mp3` generation)

| Path | Description |
|---|---|
| `src/pages/` | Page routes: `index.astro`, `learn/[group]/[id].astro`, `menus.astro`, `menu.astro`, `scan.astro` |
| `src/content/` | YAML datasets: `tabs/` (3 categories), `groups/` (13 groups, 115 entries), `chains/` (8 chains) |
| `src/assets/media/` | Cut, dish, and chain logo assets (each directory includes a `meta.yaml` credit manifest) |
| `src/data/` | Generated index files: `canonical-ids.json` (for `/scan/` matching) and `audio.json` (TTS manifest) |
| `src/lib/` & `src/scripts/` | Content loaders, ruby parser, Gemini prompt/scan helpers, and client interactivity |
| `functions/api/scan.ts` | Cloudflare Pages Function for `/api/scan` (rate-limiting & payload validation included) |
| `public/` | Static assets: offline `audio/*.mp3` clips and `sample-menus/*.jpg` test images |
| `scripts/` | Tooling scripts: `check.mjs`, `build-scan-data.mjs`, `tts.mjs`, `generate-sample-menus.mjs` |
| `docs/CONTENT.md` | YAML schema specification, ruby notation, and content maintenance guide (in Chinese) |
| `CONTRIBUTING.md` | Contribution workflow, strict media sourcing rules, and pre-PR verification steps |
| `LICENSE` | MIT License for source code and Third-Party Content & Media Notice |

---

## Quickstart

### Prerequisites

- **Node.js `>= 22.0.0`** (`22` LTS recommended)
- Optional: **`ffmpeg`** on `PATH` (only required if running `npm run tts` to synthesize new MP3 files)

### Installation & Local Development

```bash
git clone https://github.com/xuing/yakikotoba.git
cd yakikotoba
npm install
cp .env.example .env   # Optional: add GEMINI_API_KEY to test /scan/ locally or run npm run tts
npm run dev            # Starts Astro dev server at http://localhost:4321/
```

### npm Scripts

| Script | Description |
|---|---|
| `npm install` | Install project dependencies |
| `npm run dev` | Start the local Astro dev server (with built-in `/api/scan` dev middleware) |
| `npm run check` | Validate entry IDs, chain references, media `meta.yaml`, `canonical-ids.json`, and audio files |
| `npm run build` | Build the static site to `dist/` |
| `npm run preview` | Preview the built `dist/` output locally |
| `npm run scan:data` | Regenerate `src/data/canonical-ids.json` from `src/content/` |
| `npm run tts` | Generate missing Japanese pronunciation MP3s via Gemini TTS + `ffmpeg` and update `src/data/audio.json` |
| `npm run sample:menus` | Regenerate the 3 built-in sample menu JPEG images under `public/sample-menus/` |

### Environment Variables (`.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `GEMINI_API_KEY` | For `/scan/` & TTS | — | Google Gemini API key (not needed for browsing static atlas/dictionary pages) |
| `GEMINI_SCAN_MODEL` | No | `gemini-3.8-flash` | Gemini multimodal model used by `/api/scan` |
| `GEMINI_TTS_MODEL` | No | `gemini-3.8-flash-lite-tts` | Gemini TTS model used by `npm run tts` |
| `GEMINI_TTS_VOICE` | No | `Kore` | Prebuilt voice name used by `npm run tts` |
| `PUBLIC_SITE_URL` | No | `https://yakikotoba.pages.dev` | Canonical site URL used for `canonical` and OpenGraph metadata |

---

## Deployment

### Cloudflare Pages (Recommended — Full `/scan/` Support)

The repository includes [`wrangler.toml`](wrangler.toml) and [`functions/api/scan.ts`](functions/api/scan.ts) to deploy both the static Astro output and the `/api/scan` edge endpoint together:

1. Connect the repository in **Cloudflare Pages**:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
2. Configure `GEMINI_API_KEY` in **Settings → Environment variables / Secrets** (and optionally `GEMINI_SCAN_MODEL` and `PUBLIC_SITE_URL`).

### Static-Only Hosting (GitHub Pages / Netlify Static / Nginx / S3)

Run `npm run build` and deploy the `dist/` directory to any static host. All 115 entry pages, interactive atlas, chain guides, trilingual dictionary, and pre-generated audio clips work out of the box; however, `/scan/` requires a serverless backend for `/api/scan` to keep `GEMINI_API_KEY` private and will not function on pure static hosting alone.

---

## Contributing & Attribution

- **Content & Code Contributions**: Please read [docs/CONTENT.md](docs/CONTENT.md) and [CONTRIBUTING.md](CONTRIBUTING.md), and run `npm run scan:data && npm run check && npm run build` before opening a pull request.
- **Licensing & Media Credits**: Original source code is licensed under the [MIT License](LICENSE). Attribution details for Japan MAFF public-data photography, Wikimedia Commons images, and restaurant chain materials are documented in [LICENSE](LICENSE) and per-folder `meta.yaml` files.
