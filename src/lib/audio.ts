// Pronunciation audio. scripts/tts.mjs writes src/data/audio.json: { "<key>": "/audio/<file>.mp3" }.
// Keys: cut:<section>/<id> · example:<section>/<id> · dish:<id> · term:<id> · phrase:<scene>/<id>
//       chain:<id> · chain-item:<chain>/<item> · course:<chain>/<n> · vocab:<chain>/<n>
import manifest from '../data/audio.json';

const files = manifest as Record<string, string | { file: string }>;

export function audioFor(key: string): string | undefined {
  const v = files[key];
  return typeof v === 'string' ? v : v?.file;
}
