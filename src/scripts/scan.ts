interface DbEntry {
  ref: string;
  group: string;
  id: string;
  ja: string;
  ruby?: string;
  kana: string;
  romaji?: string;
  zh: string;
  meanJa?: string;
  en?: string;
  cover?: string;
  audio?: string;
  url: string;
  summary: string;
  summaryJa?: string;
  category: string;
  categoryTitle: string;
  categoryJa: string;
}

interface ScanItem {
  text: string;
  reading: string;
  match_id: string | null;
  desc_ja?: string;
  desc_zh?: string;
}

type Lang = 'ja' | 'zh';
type ErrorCode = 'sample' | 'process' | 'not_image' | 'empty' | 'rate_limit' | 'too_large' | 'api' | 'custom';

interface ActiveError {
  code: ErrorCode;
  status?: number;
  customMessage?: string;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

// Register <say-ja> custom element directly here because scan.astro does not render AudioButton.astro
let currentAudio: HTMLAudioElement | null = null;
let currentSayEl: HTMLElement | null = null;

function speakJapanese(text: string, done: () => void) {
  if (!('speechSynthesis' in window) || !text) return done();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ja-JP';
  u.rate = 0.92;
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('ja'));
  if (voice) u.voice = voice;
  u.onend = u.onerror = done;
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
}

class SayJa extends HTMLElement {
  private bound = false;

  connectedCallback() {
    if (this.bound) return;
    this.bound = true;
    this.querySelector('button')?.addEventListener('click', () => this.play());
  }

  play() {
    currentAudio?.pause();
    currentAudio = null;
    currentSayEl?.removeAttribute('playing');
    if ('speechSynthesis' in window) speechSynthesis.cancel();

    currentSayEl = this;
    this.setAttribute('playing', '');
    const done = () => {
      if (currentSayEl === this) currentSayEl = null;
      this.removeAttribute('playing');
    };

    const text = this.dataset.text ?? '';
    const src = this.dataset.src;
    if (src) {
      const audio = new Audio(src);
      currentAudio = audio;
      audio.onended = done;
      audio.onerror = () => speakJapanese(text, done);
      audio.play().catch(() => speakJapanese(text, done));
    } else {
      speakJapanese(text, done);
    }
  }
}

if (!customElements.get('say-ja')) customElements.define('say-ja', SayJa);

const db: Record<string, DbEntry> = JSON.parse(document.getElementById('scan-db')?.textContent ?? '{}');

const dropZone = document.getElementById('drop-zone') as HTMLElement | null;
const fileInput = document.getElementById('file-input') as HTMLInputElement | null;
const cameraInput = document.getElementById('camera-input') as HTMLInputElement | null;
const btnBrowse = document.getElementById('btn-browse') as HTMLButtonElement | null;
const btnCamera = document.getElementById('btn-camera') as HTMLButtonElement | null;

const scanLoading = document.getElementById('scan-loading') as HTMLElement | null;
const previewImage = document.getElementById('preview-image') as HTMLImageElement | null;
const scanResults = document.getElementById('scan-results') as HTMLElement | null;
const resultsContainer = document.getElementById('results-container') as HTMLElement | null;
const resultsCount = document.getElementById('results-count') as HTMLElement | null;
const scanError = document.getElementById('scan-error') as HTMLElement | null;
const errorText = document.getElementById('error-text') as HTMLElement | null;
const btnRescan = document.getElementById('btn-rescan') as HTMLButtonElement | null;
const btnErrorRetry = document.getElementById('btn-error-retry') as HTMLButtonElement | null;

const chipAllCount = document.getElementById('chip-all-count') as HTMLElement | null;
const chipMatchedCount = document.getElementById('chip-matched-count') as HTMLElement | null;
const chipAiCount = document.getElementById('chip-ai-count') as HTMLElement | null;

let currentItems: ScanItem[] = [];
let activeFilter = 'all';
let activeError: ActiveError | null = null;

function getLang(): Lang {
  return document.documentElement.getAttribute('data-lang') === 'ja' ? 'ja' : 'zh';
}

function syncTitle() {
  document.title =
    getLang() === 'ja'
      ? 'メニューを撮って調べる · AI メニュー認識 | やきことば'
      : '拍照识别菜单 · AI 菜单识别 | やきことば';
}

function formatErrorMessage(err: ActiveError, lang: Lang): string {
  switch (err.code) {
    case 'sample':
      return lang === 'ja' ? 'サンプルメニューの読み込みに失敗しました。' : '示例菜单加载失败，请重试。';
    case 'process':
      return lang === 'ja' ? '画像の処理に失敗しました。' : '图像处理失败，请换一张图片重试。';
    case 'not_image':
      return lang === 'ja' ? '画像ファイルを選択してください。' : '请选择图片文件。';
    case 'empty':
      return lang === 'ja'
        ? 'メニューの料理を検出できませんでした。別の角度や明るい場所で撮影してください。'
        : '未能从图片中识别出菜品，请换个角度或在光线充足处重新拍摄。';
    case 'rate_limit':
      return lang === 'ja'
        ? 'リクエストが多すぎます。少し時間をおいてもう一度お試しください。'
        : '请求过于频繁，请稍后再试。';
    case 'too_large':
      return lang === 'ja' ? '画像が大きすぎます（5MB まで）。' : '图片体积过大（最大支持 5MB）。';
    case 'api':
      return lang === 'ja'
        ? `認識 API でエラーが発生しました (${err.status ?? 500})。`
        : `识别服务返回错误 (${err.status ?? 500})。`;
    case 'custom':
      return err.customMessage || (lang === 'ja' ? 'エラーが発生しました。' : '发生未知错误，请重试。');
  }
}

class ScanApiError extends Error {
  readonly code: ErrorCode;
  readonly status?: number;

  constructor(code: ErrorCode, message: string, status?: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Setup file selection triggers
btnBrowse?.addEventListener('click', () => fileInput?.click());
btnCamera?.addEventListener('click', () => cameraInput?.click());

fileInput?.addEventListener('change', () => {
  if (fileInput.files?.[0]) handleFile(fileInput.files[0]);
});

cameraInput?.addEventListener('change', () => {
  if (cameraInput.files?.[0]) handleFile(cameraInput.files[0]);
});

// Drag and drop support
dropZone?.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});

dropZone?.addEventListener('dragleave', () => {
  dropZone.classList.remove('dragover');
});

dropZone?.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  if (file.type.startsWith('image/')) {
    handleFile(file);
  } else {
    showError({ code: 'not_image' });
  }
});

// Sample menu clicks
document.querySelectorAll<HTMLButtonElement>('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const sample = btn.dataset.sample;
    if (!sample) return;
    const url = `/sample-menus/${sample}.jpg`;
    try {
      showLoading(url);
      const res = await fetch(url);
      if (!res.ok) throw new ScanApiError('sample', 'Failed to fetch sample');
      const blob = await res.blob();
      const file = new File([blob], `${sample}.jpg`, { type: 'image/jpeg' });
      const base64 = await fileToBase64(file, 1600);
      await sendToGemini(base64, 'image/jpeg');
    } catch (err) {
      if (err instanceof ScanApiError) {
        showError({ code: err.code, status: err.status, customMessage: err.message });
      } else {
        showError({ code: 'sample' });
      }
    }
  });
});

btnRescan?.addEventListener('click', resetView);
btnErrorRetry?.addEventListener('click', resetView);

// Filter tabs
document.querySelectorAll<HTMLButtonElement>('[data-filter]').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    activeFilter = chip.dataset.filter || 'all';
    renderItems();
  });
});

function resetView() {
  activeError = null;
  if (dropZone) dropZone.hidden = false;
  if (scanLoading) scanLoading.hidden = true;
  if (scanResults) scanResults.hidden = true;
  if (scanError) scanError.hidden = true;
  if (fileInput) fileInput.value = '';
  if (cameraInput) cameraInput.value = '';
}

function showLoading(previewSrc: string) {
  activeError = null;
  if (dropZone) dropZone.hidden = true;
  if (scanResults) scanResults.hidden = true;
  if (scanError) scanError.hidden = true;
  if (scanLoading) scanLoading.hidden = false;
  if (previewImage) previewImage.src = previewSrc;
}

function showError(err: ActiveError) {
  activeError = err;
  if (dropZone) dropZone.hidden = true;
  if (scanLoading) scanLoading.hidden = true;
  if (scanResults) scanResults.hidden = true;
  if (scanError) scanError.hidden = false;
  if (errorText) errorText.textContent = formatErrorMessage(err, getLang());
}

async function handleFile(file: File) {
  const objectUrl = URL.createObjectURL(file);
  showLoading(objectUrl);

  try {
    const base64 = await fileToBase64(file, 1600);
    // Canvas always exports JPEG
    await sendToGemini(base64, 'image/jpeg');
  } catch (err) {
    if (err instanceof ScanApiError) {
      showError({ code: err.code, status: err.status, customMessage: err.message });
    } else {
      showError({ code: 'process' });
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Resize image if too large and convert to JPEG base64 */
function fileToBase64(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context unavailable'));
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

async function sendToGemini(base64: string, mimeType: string) {
  const res = await fetch('/api/scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64, mimeType }),
  });

  if (!res.ok) {
    const errData = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 429) {
      throw new ScanApiError('rate_limit', errData.error || '', 429);
    }
    if (res.status === 413) {
      throw new ScanApiError('too_large', errData.error || '', 413);
    }
    if (errData.error) {
      throw new ScanApiError('custom', errData.error, res.status);
    }
    throw new ScanApiError('api', '', res.status);
  }

  const items = (await res.json()) as ScanItem[];
  if (!Array.isArray(items) || items.length === 0) {
    throw new ScanApiError('empty', 'No menu items detected');
  }

  currentItems = items;
  showResults();
}

function showResults() {
  activeError = null;
  if (scanLoading) scanLoading.hidden = true;
  if (scanError) scanError.hidden = true;
  if (scanResults) scanResults.hidden = false;

  const lang = getLang();
  const total = currentItems.length;
  const matched = currentItems.filter((it) => it.match_id && db[it.match_id]).length;
  const ai = total - matched;

  if (chipAllCount) chipAllCount.textContent = String(total);
  if (chipMatchedCount) chipMatchedCount.textContent = String(matched);
  if (chipAiCount) chipAiCount.textContent = String(ai);

  if (resultsCount) {
    resultsCount.textContent =
      lang === 'ja'
        ? `${total} 品のメニューを認識しました（図鑑一致: ${matched} 件 / AI 推定: ${ai} 件）`
        : `共识别出 ${total} 道菜品（图鉴收录: ${matched} 项 / AI 解析: ${ai} 项）`;
  }

  renderItems();
}

function createSvgElement<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, v);
  }
  return el;
}

function createSpeakerSvg(): SVGSVGElement {
  const svg = createSvgElement('svg', {
    viewBox: '0 0 24 24',
    'aria-hidden': 'true',
    width: '16',
    height: '16',
  });
  svg.append(
    createSvgElement('path', {
      class: 'spk',
      d: 'M4 9.5h3.2L12 5.5v13l-4.8-4H4z',
      fill: 'currentColor',
    }),
    createSvgElement('path', {
      class: 'w1',
      d: 'M15.2 9.2a4 4 0 0 1 0 5.6',
      stroke: 'currentColor',
      fill: 'none',
      'stroke-width': '1.8',
    }),
    createSvgElement('path', {
      class: 'w2',
      d: 'M17.8 6.6a7.6 7.6 0 0 1 0 10.8',
      stroke: 'currentColor',
      fill: 'none',
      'stroke-width': '1.8',
    })
  );
  return svg;
}

function createArrowSvg(): SVGSVGElement {
  const svg = createSvgElement('svg', {
    width: '15',
    height: '15',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'aria-hidden': 'true',
  });
  svg.append(createSvgElement('path', { d: 'M4 12h15m-6-6 6 6-6 6' }));
  return svg;
}

function createSayControl(
  src: string | undefined,
  text: string,
  ariaTarget: string,
  lang: Lang
): HTMLElement {
  const say = document.createElement('say-ja');
  if (src) say.dataset.src = src;
  say.dataset.text = text;
  say.className = 'say sm';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', `${lang === 'ja' ? '発音を聞く: ' : '听发音：'}${ariaTarget}`);
  btn.title = lang === 'ja' ? '発音を聞く' : '听日语发音';

  const label = document.createElement('span');
  label.textContent = lang === 'ja' ? '発音' : '发音';

  btn.append(createSpeakerSvg(), label);
  say.appendChild(btn);
  return say;
}

function buildMatchedCard(item: ScanItem, match: DbEntry, lang: Lang): HTMLElement {
  const card = document.createElement('article');
  card.className = 'scan-result-card is-matched';

  const thumb = document.createElement('div');
  thumb.className = 'card-thumb';
  if (match.cover) {
    const img = document.createElement('img');
    img.src = match.cover;
    img.alt = match.ja;
    img.loading = 'lazy';
    thumb.appendChild(img);
  } else {
    const wordCover = document.createElement('div');
    wordCover.className = 'word-cover';
    wordCover.lang = 'ja';
    wordCover.textContent = match.ja;
    thumb.appendChild(wordCover);
  }

  const badge = document.createElement('span');
  badge.className = 'card-badge badge-matched';
  badge.textContent = lang === 'ja' ? '図鑑収録' : '图鉴收录';

  const category = document.createElement('span');
  category.className = 'card-category';
  category.textContent = lang === 'ja' ? match.categoryJa : match.categoryTitle;

  thumb.append(badge, category);

  const content = document.createElement('div');
  content.className = 'card-content';

  const names = document.createElement('div');
  names.className = 'card-names';

  const reading = document.createElement('span');
  reading.className = 'dish-reading';
  reading.textContent = item.reading || match.kana;

  const title = document.createElement('h3');
  title.className = 'dish-title';
  title.lang = 'ja';
  title.textContent = item.text;

  const matchInfo = document.createElement('p');
  matchInfo.className = 'dish-match-info';

  const matchName = document.createElement('span');
  matchName.className = 'match-name';
  matchName.textContent = match.ja;

  const matchSep = document.createElement('span');
  matchSep.className = 'match-sep';
  matchSep.textContent = '·';

  const matchMeaning = document.createElement('span');
  matchMeaning.className = 'match-zh';
  matchMeaning.textContent = lang === 'ja' ? (match.meanJa || match.en || match.zh) : match.zh;

  matchInfo.append(matchName, matchSep, matchMeaning);
  names.append(reading, title, matchInfo);

  const summary = document.createElement('p');
  summary.className = 'dish-summary';
  summary.textContent = lang === 'ja' ? (match.summaryJa || item.desc_ja || match.summary) : match.summary;

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const say = createSayControl(match.audio, match.kana, match.ja, lang);

  const link = document.createElement('a');
  link.href = match.url;
  link.className = 'card-detail-link';
  const linkLabel = document.createElement('span');
  linkLabel.textContent = lang === 'ja' ? '部位とストーリー' : '部位与故事';
  link.append(linkLabel, createArrowSvg());

  actions.append(say, link);
  content.append(names, summary, actions);
  card.append(thumb, content);
  return card;
}

function buildAiCard(item: ScanItem, lang: Lang): HTMLElement {
  const card = document.createElement('article');
  card.className = 'scan-result-card is-ai';

  const thumb = document.createElement('div');
  thumb.className = 'card-thumb card-thumb-ai';

  const icon = document.createElement('div');
  icon.className = 'ai-dish-icon';
  icon.textContent = '🍽️';

  const badge = document.createElement('span');
  badge.className = 'card-badge badge-ai';
  badge.textContent = lang === 'ja' ? 'AI 推定' : 'AI 解析';

  thumb.append(icon, badge);

  const content = document.createElement('div');
  content.className = 'card-content';

  const names = document.createElement('div');
  names.className = 'card-names';

  const reading = document.createElement('span');
  reading.className = 'dish-reading';
  reading.textContent = item.reading || '';

  const title = document.createElement('h3');
  title.className = 'dish-title';
  title.lang = 'ja';
  title.textContent = item.text;

  names.append(reading, title);

  const descBox = document.createElement('div');
  descBox.className = 'dish-ai-desc';

  const descJa = document.createElement('p');
  descJa.className = 'desc-ja';
  descJa.lang = 'ja';
  descJa.textContent = item.desc_ja || 'お店特製の一品料理です。';

  if (lang === 'zh') {
    const descZh = document.createElement('p');
    descZh.className = 'desc-zh';
    descZh.textContent = item.desc_zh || '餐厅特色菜品。';
    descBox.append(descZh, descJa);
  } else {
    descBox.append(descJa);
  }

  const actions = document.createElement('div');
  actions.className = 'card-actions';
  const say = createSayControl(undefined, item.reading || item.text, item.text, lang);

  const note = document.createElement('span');
  note.className = 'ai-note-tag';
  note.textContent = lang === 'ja' ? '※ Gemini による解説' : '※ Gemini 智能解析';

  actions.append(say, note);
  content.append(names, descBox, actions);
  card.append(thumb, content);
  return card;
}

function renderItems() {
  if (!resultsContainer) return;
  resultsContainer.replaceChildren();

  const lang = getLang();
  const filtered = currentItems.filter((item) => {
    const isMatched = !!(item.match_id && db[item.match_id]);
    if (activeFilter === 'matched') return isMatched;
    if (activeFilter === 'ai') return !isMatched;
    return true;
  });

  const fragment = document.createDocumentFragment();
  for (const item of filtered) {
    const match = item.match_id ? db[item.match_id] : null;
    fragment.appendChild(match ? buildMatchedCard(item, match, lang) : buildAiCard(item, lang));
  }
  resultsContainer.appendChild(fragment);
}

// Re-render dynamically generated results/errors when language changes via header switcher
const langObserver = new MutationObserver(() => {
  syncTitle();
  if (scanResults && !scanResults.hidden && currentItems.length > 0) {
    showResults();
  }
  if (scanError && !scanError.hidden && activeError && errorText) {
    errorText.textContent = formatErrorMessage(activeError, getLang());
  }
});
langObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-lang'],
});

syncTitle();
