"""Find, generate and attach photos (raw / cooked) to items.

  python tools/images.py search beef.karubi "wagyu karubi raw"
      → downloads candidates from Wikimedia Commons (free licenses only)
        into tools/candidates/beef.karubi/, with license info in meta.json

  python tools/images.py use beef.karubi raw tools/candidates/beef.karubi/2.jpg
      → copies the file to assets/img/beef.karubi/raw.jpg and writes
        src / credit / license / source into the data file

  python tools/images.py add king.shimacho cooked ~/Pictures/IMG_0123.jpg --credit "Photo: me"
      → attach your own photo

  python tools/images.py generate beef.karubi raw
      → AI-generated image via Gemini (needs GEMINI_API_KEY); marked as AI-generated

Store / chain photos: do not copy images from official sites or other people's
posts into a shared app without permission. Use your own photos, free-licensed
images, or generated ones.
"""
import argparse
import json
import os
import shutil
import sys
from pathlib import Path

import requests

from common import IMG, ROOT, find_item, load_env, update_item

CAND = ROOT / "tools" / "candidates"
UA = {"User-Agent": "yakiniku-guide/1.0 (personal study tool)"}
FREE = ("cc0", "cc-by", "cc by", "public domain", "pd")


def cmd_search(item_id, query, limit):
    find_item(item_id)
    r = requests.get("https://commons.wikimedia.org/w/api.php", headers=UA, timeout=30, params={
        "action": "query", "format": "json", "generator": "search",
        "gsrsearch": f"filetype:bitmap {query}", "gsrnamespace": 6, "gsrlimit": limit * 2,
        "prop": "imageinfo", "iiprop": "url|extmetadata", "iiurlwidth": 900,
    })
    pages = (r.json().get("query") or {}).get("pages", {})
    out = CAND / item_id
    out.mkdir(parents=True, exist_ok=True)
    meta, n = {}, 0
    for page in sorted(pages.values(), key=lambda p: p.get("index", 0)):
        info = page["imageinfo"][0]
        em = info.get("extmetadata", {})
        lic = em.get("LicenseShortName", {}).get("value", "")
        if not lic.lower().startswith(FREE):
            continue
        n += 1
        ext = Path(info["thumburl"]).suffix.lower() or ".jpg"
        name = f"{n}{ext}"
        (out / name).write_bytes(requests.get(info["thumburl"], headers=UA, timeout=60).content)
        artist = em.get("Artist", {}).get("value", "")
        meta[name] = {"license": lic, "credit": strip_html(artist), "source": info["descriptionurl"], "title": page["title"]}
        print(f"  {name}: {page['title']}  [{lic}]")
        if n >= limit:
            break
    (out / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{n} candidate(s) in {out}. Look at them, then run: images.py use {item_id} raw|cooked <file>")


def strip_html(s):
    import re
    return re.sub(r"<[^>]+>", "", s).strip()


def attach(item_id, kind, src_file, credit, license_, source):
    src_file = Path(src_file).expanduser()
    if not src_file.exists():
        sys.exit(f"No such file: {src_file}")
    dest_dir = IMG / item_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"{kind}{src_file.suffix.lower()}"
    shutil.copyfile(src_file, dest)
    rel = dest.relative_to(ROOT).as_posix()

    def fn(item):
        item.setdefault("images", {})[kind] = {k: v for k, v in
            {"src": rel, "credit": credit, "license": license_, "source": source}.items() if v}
    update_item(item_id, fn)
    print(f"✓ {item_id}.{kind} → {rel}")


def cmd_use(item_id, kind, path):
    path = Path(path)
    meta = json.loads((path.parent / "meta.json").read_text(encoding="utf-8")).get(path.name, {})
    attach(item_id, kind, path, meta.get("credit"), meta.get("license"), meta.get("source"))


def cmd_generate(item_id, kind, model):
    if not os.environ.get("GEMINI_API_KEY"):
        sys.exit("Set GEMINI_API_KEY first.")
    from google import genai
    _, _, item = find_item(item_id)
    state = "raw, on a white plate" if kind == "raw" else "grilled on a yakiniku charcoal grill net, just cooked"
    prompt = (f"Realistic food photo of Japanese yakiniku: {item['ja']} ({item['en']}), {state}. "
              "Natural light, close-up, no text, no logos, no people, 3:2 aspect ratio.")
    resp = genai.Client().models.generate_content(model=model, contents=prompt)
    for part in resp.candidates[0].content.parts:
        if getattr(part, "inline_data", None):
            tmp = CAND / item_id / f"ai-{kind}.png"
            tmp.parent.mkdir(parents=True, exist_ok=True)
            tmp.write_bytes(part.inline_data.data)
            attach(item_id, kind, tmp, f"AI-generated ({model})", None, None)
            return
    sys.exit("The model returned no image. Check the model name (--model).")


def main():
    load_env()
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    s = sub.add_parser("search"); s.add_argument("id"); s.add_argument("query"); s.add_argument("--limit", type=int, default=6)
    u = sub.add_parser("use"); u.add_argument("id"); u.add_argument("kind", choices=["raw", "cooked"]); u.add_argument("file")
    a = sub.add_parser("add"); a.add_argument("id"); a.add_argument("kind", choices=["raw", "cooked"]); a.add_argument("file")
    a.add_argument("--credit"); a.add_argument("--license"); a.add_argument("--source")
    g = sub.add_parser("generate"); g.add_argument("id"); g.add_argument("kind", choices=["raw", "cooked"])
    g.add_argument("--model", default=os.environ.get("GEMINI_IMAGE_MODEL", "gemini-3.1-flash-lite-image"))
    args = ap.parse_args()
    if args.cmd == "search": cmd_search(args.id, args.query, args.limit)
    elif args.cmd == "use": cmd_use(args.id, args.kind, args.file)
    elif args.cmd == "add": attach(args.id, args.kind, args.file, args.credit, args.license, args.source)
    elif args.cmd == "generate": cmd_generate(args.id, args.kind, args.model)


if __name__ == "__main__":
    main()
