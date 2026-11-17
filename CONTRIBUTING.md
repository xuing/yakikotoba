# Contributing to やきことば · Yaki Kotoba

Thank you for helping improve **Yaki Kotoba**! Whether you are adding a new menu term, mapping another restaurant chain, fixing furigana/translations, or improving the site and AI menu scanner, please follow the guidelines below.

For the complete YAML field reference, see [docs/CONTENT.md](docs/CONTENT.md) (in Chinese).

---

## Development Setup

Requirements:
- **Node.js `>= 22.0.0`**
- Optional: `GEMINI_API_KEY` in `.env` (copied from `.env.example`) for local `/api/scan` testing and `npm run tts`
- Optional: `ffmpeg` on `PATH` if generating new pronunciation MP3s via `npm run tts`

```bash
npm install
npm run dev      # Starts Astro dev server at http://localhost:4321/
```

---

## Adding or Updating Entries & Chains

### 1. Food & Menu Entries (`src/content/groups/<tab>/<group>.yaml`)
- Entries are organized under three categories (`yakiniku`, `yakitori`, `sushi`) defined in `src/content/tabs/`.
- Each `<group>` filename must be unique across the whole site; entries are referenced globally as `<group>/<id>` (e.g., `beef/karubi`).
- Include trilingual fields (`ja`, `zh`, `en`) for `mean`, `part`, and `note`.
- Whenever `ja` contains kanji, provide `ruby` using `{漢字|かな}` notation (e.g., `{上|じょう}タン{塩|しお}`), full `kana` in hiragana, and modified Hepburn `romaji` with macrons (e.g., `jō`, `rōsu`).
- Keep `note` concise and factual (2–4 sentences per language) and cite authoritative references under `sources`. If sources disagree, mark it explicitly (`一説に` / `一说` / `One theory`).

### 2. Restaurant Chains (`src/content/chains/<id>.yaml`)
- Set `cuisine` to `yakiniku`, `yakitori`, or `sushi`.
- Link each chain menu item via `rows: [<group>/<id>]` to existing canonical entries.
- Store the chain logo and dish images in `src/assets/media/chains/<id>/`.

### 3. Pronunciation Audio (Optional)
- If you have a `GEMINI_API_KEY` and `ffmpeg` installed, run `npm run tts` to generate missing `.mp3` clips in `public/audio/` and update `src/data/audio.json`.
- If you do not have an API key, you can still submit the content PR — the frontend automatically falls back to the browser's Japanese Web Speech API (`speechSynthesis`) for entries without a pre-generated `.mp3`.

---

## Strict Media Sourcing Rules

We maintain strict attribution and authenticity standards for every image in `src/assets/media/`:

1. **No AI-generated food images.** Do not add AI-generated illustrations or photorealistic food/cut pictures. If no verifiable image exists, omit the photo — the site renders a typographic cover automatically.
2. **Mandatory `meta.yaml` attribution.** Every folder under `src/assets/media/rows/` or `src/assets/media/chains/` **must** contain a `meta.yaml` listing every image file with `file`, `kind` (`raw | cooked | dish | logo`), and `source` (`title`, `url`, `license`, and `author` when required).
3. **Allowed sources:**
   - Japanese public-sector educational datasets with proper attribution (e.g., MAFF *aff* / *Uchi no Kyōdo Ryōri* under PDL 1.0 / Government Standard Terms of Use v2.0).
   - Openly licensed photographs (e.g., Wikimedia Commons `CC0`, `CC BY`, `CC BY-SA`, or `Public domain`) with author and license credit.
   - Official restaurant chain logos and menu item photos attributed to their respective copyright owners for menu-reference purposes.

---

## Pre-PR Verification Checklist

Before opening a pull request, please run the following commands and confirm they all succeed:

```bash
npm run scan:data && npm run check && npm run build
```

- `npm run scan:data`: Rebuilds `src/data/canonical-ids.json` so `/scan/` matches any added/updated entries or chain aliases.
- `npm run check`: Verifies content IDs, chain references, `meta.yaml` image entries, `canonical-ids.json`, and `audio.json` consistency.
- `npm run build`: Ensures the full Astro static site builds cleanly into `dist/`.

When modifying code in `functions/` or `src/`, never commit `.env` or any API secrets.
