// Loads every data file listed in data/index.json and builds lookup tables.
// To add content you only edit JSON — no code changes needed.
const j = async path => {
  const r = await fetch(path, { cache: "no-cache" });
  if (!r.ok) throw new Error(`Failed to load ${path}`);
  return r.json();
};

export async function loadAll() {
  const index = await j("data/index.json");
  const base = await Promise.all(index.base.map(e => j(`data/${e.file}`)));
  const chains = await Promise.all(index.chains.map(e => j(`data/${e.file}`)));

  const byId = new Map();
  for (const group of base) for (const it of group.items) byId.set(it.id, { ...it, animal: group.animal });
  for (const ch of chains) for (const it of ch.items) byId.set(it.id, { ...it, chain: ch.id });

  return { base, chains, byId, animalSvg: new Map() };
}

// Resolves the base cut an item refers to (chain items point at a base item via `base`).
export function resolve(db, item) {
  const baseItem = item.base ? db.byId.get(item.base) : (item.region ? db.byId.get(item.id) : null);
  return {
    item,
    baseItem,
    animal: baseItem?.animal ?? null,
    region: baseItem?.region ?? null,
    art: item.art ?? baseItem?.art ?? null,
    images: item.images ?? baseItem?.images ?? null
  };
}

export async function animalSvg(db, animal) {
  if (!db.animalSvg.has(animal)) {
    const r = await fetch(`data/animals/${animal}.svg`);
    db.animalSvg.set(animal, r.ok ? await r.text() : "");
  }
  return db.animalSvg.get(animal);
}
