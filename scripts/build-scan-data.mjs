import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = path.resolve(import.meta.dirname, '..');
const groupsDir = path.join(ROOT, 'src/content/groups');
const chainsDir = path.join(ROOT, 'src/content/chains');

function loadYaml(file) {
  return YAML.parse(fs.readFileSync(file, 'utf8'));
}

function listYamlFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .map((file) => String(file).replace(/\\/g, '/'))
    .filter((file) => /\.ya?ml$/.test(file) && !path.basename(file).startsWith('_'))
    .sort((a, b) => a.localeCompare(b, 'en'));
}

const chains = listYamlFiles(chainsDir).map((file) => loadYaml(path.join(chainsDir, file)));

const aliases = new Map();
for (const ch of chains) {
  for (const it of ch?.items ?? []) {
    const refs = it.rows ?? it.cuts ?? [];
    for (const ref of refs) {
      const list = aliases.get(ref) ?? [];
      if (!list.includes(it.ja)) list.push(it.ja);
      aliases.set(ref, list);
    }
  }
}

const entries = [];
for (const file of listYamlFiles(groupsDir)) {
  const p = path.join(groupsDir, file);
  const data = loadYaml(p);
  const group = file.replace(/\.ya?ml$/, '').split('/').slice(1).join('/');
  for (const it of data?.items ?? []) {
    const ref = `${group}/${it.id}`;
    entries.push({
      ref,
      group,
      id: it.id,
      ja: it.ja,
      ruby: it.ruby ?? '',
      kana: it.kana || it.ja,
      zh: it.mean?.zh || it.name?.zh || it.ja,
      en: it.mean?.en || it.name?.en || '',
      aliases: aliases.get(ref) ?? [],
    });
  }
}

const outFile = path.join(ROOT, 'src/data/canonical-ids.json');
fs.writeFileSync(outFile, JSON.stringify(entries, null, 2) + '\n', 'utf8');
console.log(`Wrote ${entries.length} canonical IDs to ${path.relative(ROOT, outFile)}`);
