// Plays pre-generated audio (assets/audio/<id>.wav, listed in manifest.json).
// Falls back to the browser's Japanese voice when no file exists.
let available = new Set();
let current = null;

export async function initAudio() {
  try {
    const r = await fetch("assets/audio/manifest.json", { cache: "no-cache" });
    if (r.ok) available = new Set(await r.json());
  } catch (_) { /* no manifest yet */ }
}

function browserTTS(text) {
  try {
    if (!("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP"; u.rate = 0.8;
    const v = speechSynthesis.getVoices().find(v => (v.lang || "").toLowerCase().startsWith("ja"));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (_) {}
}

export function play(item) {
  if (current) { current.pause(); current = null; }
  const fallback = () => browserTTS(item.tts || item.kana || item.ja);
  if (!available.has(item.id)) return fallback();
  current = new Audio(`assets/audio/${item.id}.wav`);
  current.play().catch(fallback);
}
