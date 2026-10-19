// Furigana markup: "{上|じょう}タン{塩|しお}" → <ruby>上<rt>じょう</rt></ruby>タン<ruby>塩<rt>しお</rt></ruby>

export type RubySegment = { text: string; rt?: string };

const RUBY = /\{([^|{}]+)\|([^{}]+)\}/g;

export function parseRuby(src: string): RubySegment[] {
  const out: RubySegment[] = [];
  let last = 0;
  for (const m of src.matchAll(RUBY)) {
    if (m.index! > last) out.push({ text: src.slice(last, m.index) });
    out.push({ text: m[1], rt: m[2] });
    last = m.index! + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

/** "{上|じょう}タン" → "上タン" */
export const stripRuby = (s: string) => s.replace(RUBY, '$1');
/** "{上|じょう}タン" → "じょうタン" */
export const rubyToKana = (s: string) => s.replace(RUBY, '$2');

export const hasKanji = (s: string) => /[㐀-鿿豈-﫿々〆ヶ]/.test(s);
