import { loadAll, resolve, animalSvg } from "./data.js";
import { meatArt } from "./meat-art.js";
import { initAudio, play } from "./audio.js";
import { UI } from "./i18n.js";

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const state = { mode: "base", tab: null, lang: localStorage.getItem("lang") || "zh", selected: null };
let db;

// ---- routing: #/base/beef or #/chain/king ----
function readHash() {
  const [, mode, tab] = location.hash.split("/");
  state.mode = mode === "chain" ? "chain" : "base";
  const groups = state.mode === "base" ? db.base : db.chains;
  state.tab = groups.some(g => g.id === tab) ? tab : groups[0].id;
}
const go = (mode, tab) => { location.hash = `#/${mode}/${tab}`; };

function currentGroup() {
  return (state.mode === "base" ? db.base : db.chains).find(g => g.id === state.tab);
}
const t = () => UI[state.lang];
const loc = obj => obj ? (obj[state.lang] ?? obj.en ?? "") : "";

// ---- header ----
function renderHeader() {
  document.querySelectorAll("#lang button").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === state.lang));
  document.querySelectorAll("#mode button").forEach(b => {
    b.textContent = t()[b.dataset.mode];
    b.setAttribute("aria-pressed", b.dataset.mode === state.mode);
  });
  const groups = state.mode === "base" ? db.base : db.chains;
  $("tabs").innerHTML = groups.map(g => {
    const label = state.mode === "base" ? `${g.label.ja} ${loc(g.label)}` : g.name.ja;
    return `<button data-tab="${g.id}" aria-pressed="${g.id === state.tab}">${esc(label)}</button>`;
  }).join("");
}

// ---- pictures: photo if available, otherwise illustration ----
function figure(res, kind) {
  const label = kind === "raw" ? t().raw : (res.art?.boiled ? t().boiled : t().grilled);
  const img = res.images?.[kind];
  if (img?.src) {
    const credit = [img.credit, img.license].filter(Boolean).join(" · ");
    return `<figure><img src="${esc(img.src)}" alt="${esc(res.item.ja)} ${esc(label)}" loading="lazy">
      <figcaption>${esc(label)}${credit ? `<span class="credit">${esc(credit)}</span>` : ""}</figcaption></figure>`;
  }
  if (!res.art) return "";
  return `<figure>${meatArt(res.item.id, res.art, res.animal, kind === "cooked")}<figcaption>${esc(label)}<span class="credit">${esc(t().illus)}</span></figcaption></figure>`;
}

function rowHTML(item, i) {
  const res = resolve(db, item);
  const status = item.status && t().status[item.status];
  const partSrc = res.baseItem && res.baseItem.id !== item.id ? res.baseItem : item;
  const partLine = partSrc.part
    ? `${t().part}: ${partSrc.id !== item.id ? `${esc(partSrc.ja)} (${esc(partSrc.kana)}) · ` : ""}${esc(partSrc.part.ja)} · ${esc(loc(partSrc.part))}`
    : (item.category ? esc(t().cat[item.category] || "") : "");
  const desc = item.desc || item.how || item.note;
  const pics = (res.art || res.images) ? `<span class="pics">${figure(res, "raw")}${figure(res, "cooked")}</span>` : "";
  return `<li><button class="row" data-i="${i}">
    <span><span class="ja">${esc(item.ja)}</span>${status ? `<span class="badge ${item.status}">${esc(status)}</span>` : ""}<br><span class="kana">${esc(item.kana)}</span></span>
    <span class="say" aria-hidden="true">🔊</span>
    <span class="line2">${esc(loc(item))} <span class="ro">· ${esc(item.romaji)}</span></span>
    <span class="part">${partLine}${item.aliases ? ` · ${esc(item.aliases.join("・"))}` : ""}</span>
    ${pics}
    ${desc ? `<span class="how">${esc(desc.ja)}<br><span class="t">${esc(loc(desc))}</span></span>` : ""}
  </button></li>`;
}

function renderChainInfo(g) {
  const box = $("chainInfo");
  if (state.mode !== "chain") { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML = `<h2>${esc(g.name.ja)}<span class="kana">${esc(g.name.kana)}</span></h2>
    <p>${esc(g.desc.ja)}<br><span class="t">${esc(loc(g.desc))}</span></p>
    ${g.note ? `<p>⚠️ ${esc(loc(g.note))}</p>` : ""}
    <p class="meta"><a href="${esc(g.official_url)}" target="_blank" rel="noopener">${esc(t().official)}</a> · ${esc(t().checked)} ${esc(g.checked)}</p>`;
}

async function renderStage(item) {
  const stage = $("stage");
  const res = item ? resolve(db, item) : null;
  const animal = res?.animal ?? currentGroup().animal;
  if (!animal) { stage.hidden = true; return; }
  stage.hidden = false;
  $("svgbox").innerHTML = await animalSvg(db, animal);
  document.querySelectorAll(".rg").forEach(r => r.classList.toggle("on", !!res?.region && r.id === "r-" + res.region));
  if (!res) { $("cap").textContent = t().choose; return; }
  const b = res.baseItem && res.baseItem.id !== item.id ? res.baseItem : item;
  $("cap").innerHTML = `<b>${esc(item.ja)}</b><br>${b.part ? `${esc(b.part.ja)} — ${esc(loc(b.part))}` : ""}`;
}

async function render() {
  const g = currentGroup();
  state.selected = null;
  renderHeader();
  renderChainInfo(g);
  $("list").innerHTML = g.items.map(rowHTML).join("");
  $("tip").textContent = g.tip ? `${g.tip.ja} ${loc(g.tip)}` : "";
  $("footnote").textContent = t().footnote;
  // In chain mode the diagram appears once a dish is chosen.
  if (state.mode === "base") await renderStage(null); else $("stage").hidden = true;
}

async function select(i) {
  const item = currentGroup().items[i];
  state.selected = i;
  document.querySelectorAll(".row").forEach((r, j) => r.classList.toggle("on", j === i));
  play(item);
  await renderStage(item);
}

// ---- events ----
$("lang").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  state.lang = b.dataset.lang; localStorage.setItem("lang", state.lang); render();
});
$("mode").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  const groups = b.dataset.mode === "base" ? db.base : db.chains;
  go(b.dataset.mode, groups[0].id);
});
$("tabs").addEventListener("click", e => {
  const b = e.target.closest("button"); if (b) go(state.mode, b.dataset.tab);
});
$("list").addEventListener("click", e => {
  const r = e.target.closest(".row"); if (r) select(+r.dataset.i);
});
$("svgbox").addEventListener("click", e => {
  const rg = e.target.closest(".rg"); if (!rg) return;
  const items = currentGroup().items;
  const i = items.findIndex(it => resolve(db, it).region === rg.id.slice(2));
  if (i >= 0) { select(i); document.querySelectorAll(".row")[i].scrollIntoView({ block: "center", behavior: "smooth" }); }
});
window.addEventListener("hashchange", () => { readHash(); render(); window.scrollTo({ top: 0 }); });

(async () => {
  try {
    db = await loadAll();
    await initAudio();
    readHash();
    await render();
  } catch (err) {
    $("list").innerHTML = `<li class="tip">读取数据失败：${esc(err.message)}<br>请用本地服务器打开（见 README），不要直接双击 index.html。</li>`;
  }
})();
