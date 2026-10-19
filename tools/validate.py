"""Check data consistency before sharing: unique ids, valid links, regions, files."""
import re
import sys

from common import AUDIO, DATA, ROOT, all_items

REQUIRED = ("id", "ja", "kana", "romaji", "en", "zh")
STATUSES = {"signature", "regular", "limited", "check"}


def main():
    errors, warnings = [], []
    items = list(all_items())
    ids = {}
    for path, group, item in items:
        where = f"{path.relative_to(ROOT)}:{item.get('id')}"
        for k in REQUIRED:
            if not item.get(k):
                errors.append(f"{where} missing '{k}'")
        if item["id"] in ids:
            errors.append(f"{where} duplicate id (also in {ids[item['id']]})")
        ids[item["id"]] = path.relative_to(ROOT)
        if item.get("status") and item["status"] not in STATUSES:
            errors.append(f"{where} unknown status '{item['status']}'")
        for kind, img in (item.get("images") or {}).items():
            if not (ROOT / img["src"]).exists():
                errors.append(f"{where} image missing: {img['src']}")
            if not img.get("credit"):
                warnings.append(f"{where} image '{kind}' has no credit")
        if not (AUDIO / f"{item['id']}.wav").exists():
            warnings.append(f"{where} no audio yet")

    regions = {}
    for svg in (DATA / "animals").glob("*.svg"):
        regions[svg.stem] = set(re.findall(r'id="r-([\w-]+)"', svg.read_text(encoding="utf-8")))

    for path, group, item in items:
        where = f"{path.relative_to(ROOT)}:{item['id']}"
        if item.get("base") and item["base"] not in ids:
            errors.append(f"{where} base '{item['base']}' does not exist")
        if item.get("region"):
            animal = group.get("animal")
            if item["region"] not in regions.get(animal, set()):
                errors.append(f"{where} region '{item['region']}' not in data/animals/{animal}.svg")

    for w in warnings:
        print("warn ", w)
    for e in errors:
        print("ERROR", e)
    print(f"\n{len(ids)} items, {len(errors)} error(s), {len(warnings)} warning(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
