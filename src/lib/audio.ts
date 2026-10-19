// Pronunciation audio. scripts/tts.mjs writes src/data/audio.json: { "<key>": "/audio/<file>.mp3" }.
// Keys: row:<group>/<id> · chain:<id> · chain-item:<chain>/<item>
import manifest from '../data/audio.json';

const files = manifest as Record<string, string | { file: string }>;

export function audioFor(key: string): string | undefined {
  const v = files[key];
  return typeof v === 'string' ? v : v?.file;
}
