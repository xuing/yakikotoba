type SearchEntry = { ref: string; ja: string; zh: string; romaji: string; kana: string; category: string; categoryJa: string; url: string; cover?: string; terms: string };
const searchData: SearchEntry[] = JSON.parse(document.getElementById('search-data')?.textContent ?? '[]');
const savedKey = 'yakikotoba-saved';
const readKey = 'yakikotoba-read';
const langKey = 'yakikotoba-lang';

function getInitialLang(): 'ja' | 'zh' {
  try {
    const stored = localStorage.getItem(langKey);
    if (stored === 'ja' || stored === 'zh') return stored;
    return navigator.language && navigator.language.toLowerCase().startsWith('ja') ? 'ja' : 'zh';
  } catch {
    return 'zh';
  }
}

let currentLang: 'ja' | 'zh' = getInitialLang();

function loadSet(key: string): Set<string> {
  try { const data = JSON.parse(localStorage.getItem(key) ?? '[]'); return new Set(Array.isArray(data) ? data.filter(x => typeof x === 'string') : []); } catch { return new Set(); }
}
let saved = loadSet(savedKey);
let read = loadSet(readKey);
let toastTimer: ReturnType<typeof setTimeout>;

function toast(message: string) {
  const el = document.querySelector<HTMLElement>('.toast');
  if (!el) return;
  el.textContent = message; el.classList.add('shown');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('shown'), 2400);
}

function persist(key: string, value: Set<string>) {
  try { localStorage.setItem(key, JSON.stringify([...value])); } catch {
    toast(currentLang === 'ja' ? '記録の保存に失敗しました。' : '当前浏览器无法保存，离开页面后记录可能丢失。');
  }
}

function syncSaved() {
  document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach(button => {
    const on = saved.has(button.dataset.save!);
    button.setAttribute('aria-pressed', String(on)); button.classList.toggle('is-saved', on);
    const label = button.querySelector('[data-save-label]');
    if (label) {
      if (currentLang === 'ja') {
        label.textContent = on ? '保存済み' : 'お気に入りに追加';
      } else {
        label.textContent = on ? '已收藏' : '收藏这个知识';
      }
    }
    const itemJa = searchData.find(e => e.ref === button.dataset.save)?.ja ?? (currentLang === 'ja' ? 'この知識' : '这个知识');
    button.setAttribute('aria-label', `${on ? (currentLang === 'ja' ? '保存解除: ' : '取消收藏') : (currentLang === 'ja' ? 'お気に入り追加: ' : '收藏')}${itemJa}`);
  });
  document.querySelectorAll<HTMLElement>('[data-saved-count]').forEach(el => { el.textContent = String(saved.size); el.hidden = !saved.size; });
  document.querySelectorAll<HTMLElement>('[data-read-indicator]').forEach(el => el.hidden = !read.has(el.dataset.readIndicator!));
  document.querySelectorAll<HTMLButtonElement>('[data-mark-read]').forEach(button => {
    const on = read.has(button.dataset.markRead!); button.setAttribute('aria-pressed', String(on)); button.classList.toggle('is-read', on);
    const label = button.querySelector('span');
    if (label) {
      if (currentLang === 'ja') {
        label.textContent = on ? '覚えた！もう一度復習' : '今日も新しい知識をひとつ覚えた';
      } else {
        label.textContent = on ? '已学会，再温习一下' : '今天又学会了一个知识';
      }
    }
  });
}

document.querySelectorAll<HTMLButtonElement>('[data-save]').forEach(button => button.addEventListener('click', () => {
  const ref = button.dataset.save!;
  if (saved.has(ref)) {
    saved.delete(ref);
    toast(currentLang === 'ja' ? 'お気に入りから解除しました。' : '已移出收藏');
  } else {
    saved.add(ref);
    toast(currentLang === 'ja' ? 'お気に入りに追加しました。いつでも復習できます。' : '已收藏，随时回来温习。');
  }
  persist(savedKey, saved); syncSaved(); filterAtlas();
}));

document.querySelectorAll<HTMLButtonElement>('[data-mark-read]').forEach(button => button.addEventListener('click', () => {
  const ref = button.dataset.markRead!;
  if (read.has(ref)) {
    read.delete(ref);
  } else {
    read.add(ref);
    toast(currentLang === 'ja' ? 'あたらしい知識をひとつ覚えました。素晴らしい！' : '又认识了一个新知识，真好。');
  }
  persist(readKey, read); syncSaved();
}));

const params = new URLSearchParams(location.search);
const view = params.get('view') === 'saved' ? 'saved' : params.get('view') === 'atlas' ? 'atlas' : 'explore';
const validCategories = ['yakiniku', 'yakitori', 'sushi'];
let category = validCategories.includes(params.get('category') ?? '') ? params.get('category')! : 'all';
let query = '';
const atlas = document.querySelector<HTMLElement>('[data-atlas]');
const atlasSearch = document.querySelector<HTMLInputElement>('[data-atlas-search]');
const normalize = (value: string) => value.normalize('NFKC').toLowerCase().replace(/[\u30a1-\u30f6]/g, c => String.fromCharCode(c.charCodeAt(0) - 0x60)).normalize('NFD').replace(/[\u0300-\u036f\s\-]/g, '');
function matches(text: string, input: string) { return normalize(text).includes(normalize(input)); }

function filterAtlas() {
  if (!atlas || view === 'explore') return;
  let count = 0;
  atlas.querySelectorAll<HTMLElement>('[data-entry]').forEach(card => {
    const show = (view !== 'saved' || saved.has(card.dataset.entry!)) && (category === 'all' || card.dataset.category === category) && matches(card.dataset.search ?? '', query);
    card.hidden = !show; if (show) count++;
  });
  document.querySelectorAll<HTMLElement>('[data-visible-count]').forEach(el => el.textContent = String(count));
  document.querySelectorAll<HTMLButtonElement>('[data-category-filter]').forEach(button => { const on = button.dataset.categoryFilter === category; button.classList.toggle('selected', on); button.setAttribute('aria-pressed', String(on)); });
  
  const labelsZh: Record<string, string> = { all: '全部主题', yakiniku: '烤肉', yakitori: '烧鸟', sushi: '寿司与鱼' };
  const labelsJa: Record<string, string> = { all: 'すべてのテーマ', yakiniku: '焼肉', yakitori: '焼き鳥', sushi: '寿司・魚' };
  const label = document.querySelector('[data-results-label]');
  if (label) {
    if (currentLang === 'ja') {
      label.textContent = `${view === 'saved' ? 'お気に入り' : labelsJa[category]} · ${count}件のエントリー${query ? ` · 検索「${query}」` : ''}`;
    } else {
      label.textContent = `${view === 'saved' ? '我的收藏' : labelsZh[category]} · ${count} 个词条${query ? ` · 搜索“${query}”` : ''}`;
    }
  }

  const clear = document.querySelector<HTMLElement>('[data-clear-filters]'); if (clear) clear.hidden = category === 'all' && !query;
  const empty = document.querySelector<HTMLElement>('[data-empty]');
  if (empty) {
    empty.hidden = count > 0;
    const titleEl = empty.querySelector('[data-empty-title]');
    const descEl = empty.querySelector('[data-empty-description]');
    if (titleEl && descEl) {
      if (currentLang === 'ja') {
        titleEl.textContent = view === 'saved' && !saved.size ? '最初のお気に入りを保存しましょう' : '該当する食材が見つかりませんでした';
        descEl.textContent = view === 'saved' && !saved.size ? 'カードのしおりボタンを押して、気になる食材を保存しましょう。現在のブラウザに保存されます。' : '別のキーワード（日本語、かな、ローマ字）を試すか、絞り込みを解除してみてください。';
      } else {
        titleEl.textContent = view === 'saved' && !saved.size ? '收藏你的第一口新知' : '还没有找到这道滋味';
        descEl.textContent = view === 'saved' && !saved.size ? '点击食材卡片上的书签，把想了解的知识留在这里。收藏保存在当前浏览器。' : '试试别的日语、中文名称，或清除筛选重新看看。';
      }
    }
  }
}

function syncSavedViewHeader() {
  if (view !== 'saved') return;
  const titleEl = document.querySelector('[data-atlas-title]');
  const eyebrowEl = document.querySelector('[data-atlas-eyebrow]');
  const descEl = document.querySelector('[data-atlas-description]');
  if (titleEl) titleEl.innerHTML = currentLang === 'ja' ? 'お気に入り<span class="accent">。</span>' : '我的收藏<span class="accent">。</span>';
  if (eyebrowEl) eyebrowEl.textContent = 'A LITTLE COLLECTION OF DISCOVERIES';
  if (descEl) descEl.textContent = currentLang === 'ja' ? '好奇心をストックして、次の外食で思い出しましょう。現在のブラウザに保存されます。' : '把好奇心收好，下次上桌时再翻一翻。收藏保存在当前浏览器。';
}

function setLang(lang: 'ja' | 'zh') {
  currentLang = lang;
  document.documentElement.lang = lang === 'ja' ? 'ja' : 'zh-CN';
  document.documentElement.setAttribute('data-lang', lang);
  try { localStorage.setItem(langKey, lang); } catch {}

  document.querySelectorAll<HTMLElement>('.lang-opt').forEach((opt) => {
    opt.classList.toggle('active', opt.dataset.opt === lang);
  });

  document.querySelectorAll<HTMLInputElement>('[data-placeholder-zh]').forEach((inp) => {
    inp.placeholder = lang === 'ja' ? (inp.dataset.placeholderJa || '') : (inp.dataset.placeholderZh || '');
  });

  if (view === 'saved') {
    syncSavedViewHeader();
    document.title = lang === 'ja' ? 'お気に入り · やきことば' : '我的收藏 · やきことば';
  } else if (view === 'atlas') {
    document.title = lang === 'ja' ? '食材図鑑 · やきことば' : '食材图鉴 · やきことば';
  }

  syncSaved();
  filterAtlas();
  if (dialog && dialog.open) renderSearch();
}

// Language Switcher trigger
document.querySelectorAll('[data-toggle-lang]').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const opt = target.closest<HTMLElement>('[data-opt]')?.dataset.opt;
    if (opt === 'ja' || opt === 'zh') {
      setLang(opt);
    } else {
      setLang(currentLang === 'ja' ? 'zh' : 'ja');
    }
  });
});

if (atlas && view !== 'explore') {
  document.querySelector<HTMLElement>('[data-discover]')!.hidden = true; atlas.hidden = false;
  document.querySelectorAll('[data-nav]').forEach(link => { link.classList.toggle('active', (link as HTMLElement).dataset.nav === view); });
  if (view === 'saved') {
    syncSavedViewHeader();
    document.title = currentLang === 'ja' ? 'お気に入り · やきことば' : '我的收藏 · やきことば';
  } else {
    document.title = currentLang === 'ja' ? '食材図鑑 · やきことば' : '食材图鉴 · やきことば';
  }
}

document.querySelectorAll<HTMLButtonElement>('[data-category-filter]').forEach(button => button.addEventListener('click', () => {
  category = button.dataset.categoryFilter!;
  const url = new URL(location.href); if (category === 'all') url.searchParams.delete('category'); else url.searchParams.set('category', category);
  history.replaceState(null, '', url); filterAtlas();
}));

atlasSearch?.addEventListener('input', () => { query = atlasSearch.value.trim(); filterAtlas(); });
document.querySelector('[data-clear-filters]')?.addEventListener('click', () => {
  category = 'all'; query = ''; if (atlasSearch) atlasSearch.value = '';
  const url = new URL(location.href); url.searchParams.delete('category'); history.replaceState(null, '', url); filterAtlas();
});

const dialog = document.querySelector<HTMLDialogElement>('.search-dialog')!;
const searchInput = document.querySelector<HTMLInputElement>('#global-search')!;
const searchResults = document.querySelector<HTMLElement>('.search-results')!;

function renderSearch() {
  const input = searchInput.value.trim();
  const results = input ? searchData.filter(e => matches(e.terms, input)).slice(0, 20) : ['beef/tan', 'beef/harami', 'chicken/negima', 'neta/hirame'].map(ref => searchData.find(e => e.ref === ref)!).filter(Boolean);
  searchResults.replaceChildren();
  const heading = document.createElement('p'); heading.className = 'search-results-label';
  heading.textContent = input
    ? (currentLang === 'ja' ? `${results.length}${results.length === 20 ? '+' : ''}件の関連エントリー` : `找到 ${results.length}${results.length === 20 ? '+' : ''} 个相关词条`)
    : (currentLang === 'ja' ? 'おすすめの検索ワード' : '不妨从这些开始');
  searchResults.append(heading);

  for (const entry of results) {
    const a = document.createElement('a'); a.href = entry.url; a.className = 'search-result';
    if (entry.cover) { const img = document.createElement('img'); img.src = entry.cover; img.alt = ''; a.append(img); }
    const copy = document.createElement('span'); const name = document.createElement('strong'); name.textContent = entry.ja;
    const sub = document.createElement('small');
    sub.textContent = currentLang === 'ja' ? `${entry.kana} · ${entry.romaji}` : `${entry.zh} · ${entry.romaji}`;
    copy.append(name, sub);
    const type = document.createElement('span'); type.className = 'result-category'; type.textContent = currentLang === 'ja' ? entry.categoryJa : entry.category;
    a.append(copy, type); searchResults.append(a);
  }
  if (!results.length) {
    const p = document.createElement('p'); p.className = 'search-no-results';
    p.textContent = currentLang === 'ja' ? '見つかりませんでした。ひらがな・カタカナ・漢字・ローマ字で試してみてください。' : '没有找到这个名字，试试中文、假名或罗马字吧。';
    searchResults.append(p);
  }
}

function openSearch() { renderSearch(); dialog.showModal(); document.documentElement.classList.add('dialog-open'); searchInput.focus(); }
document.querySelectorAll('[data-open-search]').forEach(button => button.addEventListener('click', openSearch));
document.querySelector('[data-close-search]')?.addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.documentElement.classList.remove('dialog-open'));
dialog.addEventListener('click', e => { if (e.target === dialog) { const rect = dialog.getBoundingClientRect(); if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) dialog.close(); } });
searchInput.addEventListener('input', renderSearch);

document.addEventListener('keydown', event => { if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement) && !(event.target as HTMLElement)?.isContentEditable) { event.preventDefault(); if (!dialog.open) openSearch(); } });
window.addEventListener('storage', event => { if ([savedKey, readKey].includes(event.key ?? '')) { saved = loadSet(savedKey); read = loadSet(readKey); syncSaved(); filterAtlas(); } });

document.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(button => button.addEventListener('click', () => {
  const correct = button.dataset.answer === 'correct';
  document.querySelectorAll<HTMLButtonElement>('[data-answer]').forEach(b => { b.classList.remove('correct', 'incorrect'); b.setAttribute('aria-pressed', String(b === button)); });
  button.classList.add(correct ? 'correct' : 'incorrect');
  const result = document.querySelector<HTMLElement>('.quiz-result')!; result.hidden = false;
  if (currentLang === 'ja') {
    result.textContent = correct ? '大正解！ハラミは横隔膜の筋肉で、食肉規格上は内臓肉に分類されます。' : 'もう一度考えてみましょう：赤身に見えますが、実は呼吸に関わる内臓部位です。';
  } else {
    result.textContent = correct ? '答对了！ハラミ是横膈膜的一部分，在食材分类中属于内脏。' : '再想一想：它看起来像红肉，却属于内脏。答案和呼吸有关。';
  }
}));

// Apply initial language state
setLang(currentLang);
syncSaved();
filterAtlas();
