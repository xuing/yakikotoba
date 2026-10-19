// Procedural fallback illustrations of a cut, raw or cooked.
// Used only when an item has no photo in `images`. Driven by item.art:
//   shape: slice | thick | round | layers | chunk | strips | bits | liver | tripe | senmai | gizzard | wing | curl
//   color: raw hex color, fat: 0-4 marbling, tex: dots | grain | sinew,
//   cookColor: hex override for cooked tone, boiled: true → shown boiled on a plate.
const f = v => v.toFixed(1);
const hash = s => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const rand = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}
function blob(r, cx, cy, rx, ry, j = .1, n = 11) {
  const pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, k = 1 + (r() - .5) * 2 * j; pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]); }
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let m = mid(pts[0], pts[1]), d = `M${f(m[0])} ${f(m[1])}`;
  for (let i = 1; i <= n; i++) { const p = pts[i % n], q = mid(p, pts[(i + 1) % n]); d += ` Q${f(p[0])} ${f(p[1])} ${f(q[0])} ${f(q[1])}`; }
  return d + "Z";
}
function streaks(r, n, col, w = 2.5) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = -52 + r() * 104, y = -32 + r() * 64, len = 8 + r() * 22, a = (r() - .5) * 1.4;
    const dx = Math.cos(a) * len, dy = Math.sin(a) * len, mx = x + dx / 2 + (r() - .5) * 10, my = y + dy / 2 + (r() - .5) * 10;
    s += `<path d="M${f(x)} ${f(y)} Q${f(mx)} ${f(my)} ${f(x + dx)} ${f(y + dy)}" stroke="${col}" stroke-width="${f(.8 + r() * w)}" fill="none" stroke-linecap="round"/>`;
  }
  return s;
}
function lines(step, angle, col, w, op) {
  let s = ""; const rad = angle * Math.PI / 180, c = Math.cos(rad), sn = Math.sin(rad);
  for (let o = -90; o <= 90; o += step) {
    s += `<line x1="${f(-90 * c - o * sn)}" y1="${f(-90 * sn + o * c)}" x2="${f(90 * c - o * sn)}" y2="${f(90 * sn + o * c)}" stroke="${col}" stroke-width="${w}" opacity="${op}"/>`;
  }
  return s;
}

export function meatArt(id, art, animal, cooked) {
  const r = rand(hash(id)); const clipId = `c${hash(id)}${cooked ? 1 : 0}`;
  const grill = cooked && !art.boiled;
  const target = art.cookColor || (animal === "beef" ? "#5a2e16" : "#a8682e");
  const col = cooked ? (art.boiled ? mix(art.color, "#cfc8bf", .25) : mix(art.color, target, .6)) : art.color;
  const edge = mix(col, "#000000", .3);
  const fatCol = grill ? "#efcf8a" : "#f8f1e8";
  const bg = grill
    ? `<rect x="-70" y="-46" width="140" height="92" fill="#2b2725"/><rect x="-70" y="-46" width="140" height="92" fill="#ff7a2e" opacity=".12"/>${lines(10, 0, "#8d8a86", 1.4, .9)}${lines(10, 90, "#8d8a86", 1.4, .9)}`
    : `<rect x="-70" y="-46" width="140" height="92" fill="#e9e4da"/><ellipse cx="0" cy="3" rx="60" ry="37" fill="#fdfcf9" stroke="#d9d2c4" stroke-width="1.5"/>`;
  const wrap = inner => `<svg viewBox="-64 -42 128 84" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;

  const sh = art.shape;
  if (sh === "curl") {
    const d = "M-22 10 C-24 -14 4 -18 10 -4 C16 10 -4 18 -8 6";
    const tube = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})">
      <path d="${d}" stroke="${edge}" stroke-width="19" fill="none" stroke-linecap="round"/>
      <path d="${d}" stroke="${col}" stroke-width="16" fill="none" stroke-linecap="round"/>
      <path d="${d}" stroke="${fatCol}" stroke-width="7" fill="none" stroke-linecap="round"/></g>`;
    let s = tube(-18, 0, 0) + tube(24, -2, 150);
    if (grill) for (let i = 0; i < 14; i++) s += `<circle cx="${f(-40 + r() * 80)}" cy="${f(-20 + r() * 40)}" r="${f(1 + r() * 1.6)}" fill="#3a1d0e" opacity=".55"/>`;
    return wrap(bg + s);
  }

  let pieces = [], top = "";
  if (sh === "slice") pieces = [blob(r, -9, -5, 40, 22), blob(r, 9, 8, 40, 21)];
  else if (sh === "thick") { pieces = [blob(r, -16, 0, 24, 19, .08), blob(r, 18, 2, 24, 19, .08)];
    if (!cooked) top = `<path d="M-38 6 q20 10 44 2 M-4 9 q20 10 44 2" stroke="${mix(col, "#000000", .25)}" stroke-width="2" fill="none" opacity=".5"/>`; }
  else if (sh === "round") pieces = [blob(r, -16, -2, 25, 23, .05), blob(r, 18, 4, 25, 23, .05)];
  else if (sh === "layers") pieces = [blob(r, 0, -12, 48, 12, .06), blob(r, 4, 13, 48, 12, .06)];
  else if (sh === "chunk") pieces = [blob(r, -30, 6, 16, 13, .15), blob(r, -2, -10, 17, 13, .15), blob(r, 24, 8, 18, 14, .15), blob(r, 4, 18, 12, 9, .15)];
  else if (sh === "strips") pieces = [blob(r, -18, -14, 26, 7, .15), blob(r, 10, 0, 28, 7, .15), blob(r, -10, 16, 26, 7, .15)];
  else if (sh === "bits") for (let i = 0; i < 7; i++) pieces.push(blob(r, -36 + i * 12 + (r() - .5) * 6, (r() - .5) * 28, 6 + r() * 2, 5 + r() * 2, .2, 7));
  else if (sh === "liver") pieces = [blob(r, -12, -4, 32, 20, .06), blob(r, 16, 8, 30, 18, .06)];
  else if (sh === "tripe") pieces = [blob(r, -18, -6, 26, 18, .15), blob(r, 18, 6, 26, 18, .15)];
  else if (sh === "senmai") pieces = [blob(r, -14, -4, 30, 18, .2), blob(r, 16, 8, 28, 16, .2)];
  else if (sh === "gizzard") pieces = [blob(r, -30, -2, 13, 11, .1, 8), blob(r, -12, 4, 11, 10, .1, 8), blob(r, 12, -6, 13, 11, .1, 8), blob(r, 28, 4, 11, 10, .1, 8)];
  else if (sh === "wing") pieces = ["M-42 12 C-32 -18 12 -26 38 -14 C46 -10 48 2 42 8 C22 6 2 16 -8 26 C-24 28 -44 24 -42 12 Z"];
  else pieces = [blob(r, 0, 0, 40, 24)];

  let extra = "";
  if (art.fat) extra += streaks(r, art.fat * 7, fatCol, art.fat > 2 ? 3 : 2);
  if (sh === "layers") for (let y = -22; y <= 24; y += 6) extra += `<rect x="-60" y="${y}" width="120" height="${f(2 + r() * 1.6)}" fill="${fatCol}" opacity=".9"/>`;
  if (art.tex === "dots") for (let i = 0; i < 60; i++) extra += `<circle cx="${f(-50 + r() * 100)}" cy="${f(-30 + r() * 60)}" r="${f(.5 + r())}" fill="${mix(col, "#ffffff", .3)}"/>`;
  if (art.tex === "grain") extra += lines(4, 25, mix(col, "#000000", .25), .8, .6);
  if (art.tex === "sinew") extra += `<path d="M-50 -2 C-25 -10 -5 8 15 0 S45 -6 55 4" stroke="${fatCol}" stroke-width="3" fill="none"/>`;
  if (sh === "tripe") extra += lines(7, 45, mix(col, "#000000", .3), 1.1, .8) + lines(7, -45, mix(col, "#000000", .3), 1.1, .8);
  if (sh === "senmai") extra += lines(3.5, 80, mix(col, "#ffffff", .35), 1.2, .8);
  if (sh === "gizzard" && !cooked) extra += streaks(r, 10, "#e3dad3", 1.5);
  if (sh === "wing") for (let i = 0; i < 40; i++) extra += `<circle cx="${f(-40 + r() * 80)}" cy="${f(-20 + r() * 44)}" r="${f(.5 + r() * .8)}" fill="${mix(col, "#000000", .15)}" opacity=".6"/>`;
  if (grill) extra += lines(14, -35, "#2a140a", 4, .55);
  if (!cooked && (sh === "liver" || sh === "round")) extra += `<ellipse cx="-14" cy="-10" rx="16" ry="5" fill="#fff" opacity=".22"/>`;

  const body = pieces.map(d => `<path d="${d}" fill="${col}" stroke="${edge}" stroke-width="1.6"/>`).join("");
  const clip = `<clipPath id="${clipId}">${pieces.map(d => `<path d="${d}"/>`).join("")}</clipPath>`;
  return wrap(`<defs>${clip}</defs>${bg}${body}<g clip-path="url(#${clipId})">${extra}</g>${top}`);
}
