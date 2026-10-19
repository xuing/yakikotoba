"""Shared helpers: walk every data file, find an item by id, save changes back."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
AUDIO = ROOT / "assets" / "audio"
IMG = ROOT / "assets" / "img"


def load_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def save_json(path, obj):
    Path(path).write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def data_files():
    index = load_json(DATA / "index.json")
    for section in ("base", "chains"):
        for entry in index[section]:
            yield section, DATA / entry["file"]


def all_items():
    """Yield (file_path, group, item) for every item in every data file."""
    for _, path in data_files():
        group = load_json(path)
        for item in group["items"]:
            yield path, group, item


def find_item(item_id):
    for path, group, item in all_items():
        if item["id"] == item_id:
            return path, group, item
    raise SystemExit(f"Item not found: {item_id}")


def update_item(item_id, fn):
    """Load the file holding item_id, apply fn(item) and save."""
    path, _, _ = find_item(item_id)
    group = load_json(path)
    for item in group["items"]:
        if item["id"] == item_id:
            fn(item)
    save_json(path, group)


def load_env():
    """Read KEY=VALUE lines from <project>/.env into os.environ (without overriding)."""
    import os
    env = ROOT / ".env"
    if env.exists():
        for line in env.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))
