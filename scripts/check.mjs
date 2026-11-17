import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const base = path.resolve(import.meta.dirname, '..');
const contentDir = path.join(base, 'src/content');
const mediaDir = path.join(base, 'src/assets/media');
const canonicalPath = path.join(base, 'src/data/canonical-ids.json');
const audioManifestPath = path.join(base, 'src/data/audio.json');
const audioDir = path.join(base, 'public/audio');

const hasKanji = (s) => /[\u3400-\u9fff\uf900-\ufaff々〆ヶ]/.test(s || '');
const imageExts = /\.(jpg|jpeg|png|webp|avif|gif|svg)$/i;
const failures = [];

function loadYamlDir(relative) {
  const dir = path.join(contentDir, relative);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { recursive: true })
    .map((f) => String(f).replace(/\\/g, '/'))
    .filter((file) => /\.ya?ml$/.test(file) && !path.basename(file).startsWith('_'))
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((file) => ({
      id: file.replace(/\.ya?ml$/, ''),
      data: YAML.parse(fs.readFileSync(path.join(dir, file), 'utf8')),
    }));
}

function checkTri(obj, label) {
  if (!obj || typeof obj !== 'object') {
    failures.push(`Missing trilingual object: ${label}`);
    return;
  }
  for (const lang of ['ja', 'zh', 'en']) {
    if (typeof obj[lang] !== 'string' || !obj[lang].trim()) {
      failures.push(`Missing ${label}.${lang}`);
    }
  }
}

// 1. Validate tabs
const tabEntries = loadYamlDir('tabs');
const tabs = new Set();
for (const tab of tabEntries) {
  tabs.add(tab.id);
  checkTri(tab.data, `tab ${tab.id}`);
  if (hasKanji(tab.data?.ja) && !tab.data?.ruby) {
    failures.push(`Missing ruby for kanji tab: ${tab.id} (${tab.data?.ja})`);
  }
}

// 2. Validate groups & rows
const rows = new Map();
const groupEntries = loadYamlDir('groups');
for (const group of groupEntries) {
  const [tab, ...rest] = group.id.split('/');
  if (!tabs.has(tab)) failures.push(`Unknown category: ${group.id}`);
  checkTri(group.data, `group ${group.id}`);
  if (group.data?.note) checkTri(group.data.note, `group ${group.id}.note`);

  for (const item of group.data?.items ?? []) {
    if (!item?.id || !item?.ja) {
      failures.push(`Missing ID or Japanese name: ${group.id}`);
      continue;
    }
    const ref = `${rest.join('/')}/${item.id}`;
    if (rows.has(ref)) failures.push(`Duplicate row reference: ${ref}`);
    rows.set(ref, { group: rest.join('/'), item });

    if (hasKanji(item.ja) && !item.ruby) {
      failures.push(`Missing ruby for kanji entry: ${group.id}/${item.id} (${item.ja})`);
    }
    checkTri(item.mean, `${ref}.mean`);
    checkTri(item.note, `${ref}.note`);
  }
}

// 3. Validate chains & references
const chains = loadYamlDir('chains');
for (const chain of chains) {
  if (!tabs.has(chain.data?.cuisine ?? 'yakiniku')) {
    failures.push(`Unknown cuisine: ${chain.id}`);
  }
  if (!chain.data?.ja) {
    failures.push(`Missing Japanese name: chain ${chain.id}`);
  } else if (hasKanji(chain.data.ja) && !chain.data?.ruby) {
    failures.push(`Missing ruby for kanji chain: ${chain.id} (${chain.data.ja})`);
  }
  if (chain.data?.note) checkTri(chain.data.note, `chain ${chain.id}.note`);

  const ids = new Set();
  for (const item of chain.data?.items ?? []) {
    if (!item?.id || !item?.ja) {
      failures.push(`Missing ID or Japanese name in chain: ${chain.id}`);
      continue;
    }
    if (ids.has(item.id)) failures.push(`Duplicate menu item: ${chain.id}/${item.id}`);
    ids.add(item.id);

    if (hasKanji(item.ja) && !item.ruby) {
      failures.push(`Missing ruby for kanji chain item: ${chain.id}/${item.id} (${item.ja})`);
    }
    checkTri(item.mean ?? item.name, `chain ${chain.id}/${item.id}.mean`);

    for (const ref of item.rows ?? item.cuts ?? []) {
      if (!rows.has(ref)) failures.push(`Unknown row: ${chain.id}/${item.id} -> ${ref}`);
    }
    if (
      item.image &&
      !fs.existsSync(path.join(mediaDir, 'chains', chain.id, path.basename(item.image)))
    ) {
      failures.push(`Missing menu image: ${chain.id}/${item.image}`);
    }
  }
}

// 4. Validate media files and meta.yaml bidirectional parity
let mediaFoldersChecked = 0;
function walkDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const subdirs = entries.filter((d) => d.isDirectory()).flatMap((d) => walkDirs(path.join(dir, d.name)));
  return [dir, ...subdirs];
}

for (const folder of walkDirs(mediaDir)) {
  const relFolder = path.relative(mediaDir, folder).replace(/\\/g, '/');
  const files = fs.readdirSync(folder).filter((f) => imageExts.test(f));
  const metaYaml = fs.existsSync(path.join(folder, 'meta.yaml'))
    ? path.join(folder, 'meta.yaml')
    : fs.existsSync(path.join(folder, 'meta.yml'))
      ? path.join(folder, 'meta.yml')
      : null;

  if (!files.length && !metaYaml) continue;
  mediaFoldersChecked++;

  if (!metaYaml) {
    failures.push(`Missing meta.yaml in media folder: ${relFolder}`);
    continue;
  }

  let parsed;
  try {
    parsed = YAML.parse(fs.readFileSync(metaYaml, 'utf8'));
  } catch (err) {
    failures.push(`Invalid YAML in ${relFolder}/meta.yaml: ${err.message}`);
    continue;
  }

  const metaRows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.images)
      ? parsed.images
      : Array.isArray(parsed?.files)
        ? parsed.files
        : [];
  const metaFiles = new Set();

  for (const row of metaRows) {
    const f = typeof row?.file === 'string' ? row.file.trim() : '';
    if (!f) continue;
    metaFiles.add(f);
    if (!fs.existsSync(path.join(folder, f))) {
      failures.push(`meta.yaml references missing file: ${relFolder}/${f}`);
    }
  }

  for (const file of files) {
    if (!metaFiles.has(file)) {
      failures.push(`Image missing from meta.yaml: ${relFolder}/${file}`);
    }
  }
}

// 5. Validate src/data/canonical-ids.json matches current src/content/
if (!fs.existsSync(canonicalPath)) {
  failures.push('Missing src/data/canonical-ids.json (run npm run scan:data)');
} else {
  let canonical;
  try {
    canonical = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
  } catch (err) {
    failures.push(`Invalid JSON in src/data/canonical-ids.json: ${err.message}`);
    canonical = null;
  }

  if (Array.isArray(canonical)) {
    if (canonical.length !== rows.size) {
      failures.push(
        `canonical-ids.json count mismatch: expected ${rows.size}, found ${canonical.length} (run node scripts/build-scan-data.mjs)`
      );
    }
    const seen = new Set();
    for (const entry of canonical) {
      if (!entry?.ref) {
        failures.push('canonical-ids.json contains entry without ref');
        continue;
      }
      if (seen.has(entry.ref)) failures.push(`Duplicate ref in canonical-ids.json: ${entry.ref}`);
      seen.add(entry.ref);
      const expected = rows.get(entry.ref);
      if (!expected) {
        failures.push(`Stale ref in canonical-ids.json: ${entry.ref}`);
      } else if (entry.ja !== expected.item.ja) {
        failures.push(`canonical-ids.json ja mismatch for ${entry.ref}: ${entry.ja} vs ${expected.item.ja}`);
      }
    }
    for (const ref of rows.keys()) {
      if (!seen.has(ref)) {
        failures.push(`Missing ref in canonical-ids.json: ${ref} (run node scripts/build-scan-data.mjs)`);
      }
    }
  } else if (canonical !== null) {
    failures.push('src/data/canonical-ids.json must be a JSON array');
  }
}

// 6. Validate src/data/audio.json <-> public/audio/
if (!fs.existsSync(audioManifestPath)) {
  failures.push('Missing src/data/audio.json');
} else {
  let audioManifest;
  try {
    audioManifest = JSON.parse(fs.readFileSync(audioManifestPath, 'utf8'));
  } catch (err) {
    failures.push(`Invalid JSON in src/data/audio.json: ${err.message}`);
    audioManifest = null;
  }

  if (audioManifest && typeof audioManifest === 'object' && !Array.isArray(audioManifest)) {
    const referencedFiles = new Set();
    for (const [key, val] of Object.entries(audioManifest)) {
      const relPath = typeof val === 'string' ? val : val?.file;
      if (typeof relPath !== 'string' || !relPath.startsWith('/audio/')) {
        failures.push(`Invalid audio path for key "${key}": ${relPath}`);
        continue;
      }
      const fileName = path.basename(relPath);
      referencedFiles.add(fileName);
      if (!fs.existsSync(path.join(audioDir, fileName))) {
        failures.push(`Missing audio file for key "${key}": public/audio/${fileName}`);
      }
    }

    if (fs.existsSync(audioDir)) {
      for (const file of fs.readdirSync(audioDir)) {
        if (/^\.tmp-.*\.wav$/i.test(file)) continue;
        if (file.endsWith('.mp3') && !referencedFiles.has(file)) {
          failures.push(`Orphan audio file in public/audio/: ${file}`);
        }
      }
    }
  } else if (audioManifest !== null) {
    failures.push('src/data/audio.json must be a JSON object');
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Content integrity passed: ${tabs.size} categories, ${rows.size} entries, ${chains.length} chains, ${mediaFoldersChecked} media folders.`
  );
}
