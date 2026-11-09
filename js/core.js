/* Písomky: spoločné pomôcky (texty v jazykoch, spojenie so skriptom tabuľky, drobnosti pre stránku). */
var APP = { version: '1.5' };

/* ---------- stránka ---------- */
function $(id) { return document.getElementById(id); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function el(tag, props, kids) {
  var e = document.createElement(tag), k;
  for (k in (props || {})) {
    var v = props[k]; if (v === undefined || v === null || v === false) continue;
    if (k === 'text') e.textContent = v; else if (k === 'html') e.innerHTML = v; else if (k === 'class') e.className = v;
    else if (k.indexOf('on') === 0) e[k] = v; else e.setAttribute(k, v === true ? '' : v);
  }
  (kids || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  return e;
}
// Zobrazí jednu obrazovku zo skupiny (prvky s data-screen="skupina").
function show(id, group) {
  var els = document.querySelectorAll('[data-screen="' + group + '"]');
  for (var i = 0; i < els.length; i++) els[i].hidden = els[i].id !== id;
  window.scrollTo(0, 0);
}
// Stránky na samocief.github.io zdieľajú úložisko prehliadača so slepou mapou, preto majú kľúče predponu „pt-“.
function store(key, val) {
  key = 'pt-' + key;
  try {
    if (val === undefined) return JSON.parse(localStorage.getItem(key));
    if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, JSON.stringify(val));
  } catch (e) { /* prehliadač bez úložiska: aplikácia funguje, len si nič nepamätá */ }
  return null;
}
function param(name) { return new URLSearchParams(location.search).get(name) || ''; }
function shuffle(a, rand) { rand = rand || Math.random; a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function uniq(a) { var o = {}, r = []; a.forEach(function (x) { if (!o[x]) { o[x] = 1; r.push(x); } }); return r; }
function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
// Porovnanie verzií „2.1“ a „2.0“: záporné, ak a je staršia.
function cmpVer(a, b) {
  var x = String(a || '0').split('.').map(Number), y = String(b || '0').split('.').map(Number);
  for (var i = 0; i < Math.max(x.length, y.length); i++) { var d = (x[i] || 0) - (y[i] || 0); if (d) return d; }
  return 0;
}
// Texty v jazykovom súbore začínajú veľkým písmenom; uprostred vety sa prvé písmeno zmenší (skratky ako EČV ostanú).
function low(s) { s = String(s || ''); var c = s.charAt(1); if (c && c !== c.toLocaleLowerCase(I18N.lang)) return s; return s.charAt(0).toLocaleLowerCase(I18N.lang) + s.slice(1); }

/* ---------- texty v jazykoch ---------- */
// Texty sú v lang/<jazyk>.json. Hodnota môže mať zástupné znaky {meno} alebo tvary pre počet {"one":…, "few":…, "other":…}.
var I18N = { lang: 'sk', dict: {}, plural: null };
function loadLang(code) {
  code = String(code || 'sk').toLowerCase().replace(/[^a-z-]/g, '') || 'sk';
  if (I18N.loaded === code) return Promise.resolve();
  return fetch('lang/' + code + '.json?v=' + APP.version).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (d) { I18N.lang = code; I18N.dict = d; I18N.loaded = code; I18N.plural = new Intl.PluralRules(code); document.documentElement.lang = code; })
    .catch(function () { return code === 'sk' ? Promise.reject(new Error('Chýba súbor lang/sk.json')) : loadLang('sk'); });
}
function tRaw(key) { return key.split('.').reduce(function (o, k) { return o && typeof o === 'object' ? o[k] : undefined; }, I18N.dict); }
function fill(s, vars) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && vars[k] !== undefined && vars[k] !== null ? vars[k] : m; }); }
function t(key, vars) {
  var v = tRaw(key);
  if (v && typeof v === 'object' && vars && typeof vars.n === 'number') v = v[I18N.plural.select(vars.n)] || v.other;
  if (typeof v !== 'string') return key;
  return fill(v, vars);
}
function has(key) { return typeof tRaw(key) === 'string'; }
// Prvky s data-i18n dostanú text, data-i18n-html značky, data-i18n-attr="placeholder:kľúč; title:kľúč" atribúty.
function applyI18n(root) {
  root = root || document;
  root.querySelectorAll('[data-i18n]').forEach(function (e) { e.textContent = t(e.getAttribute('data-i18n')); });
  root.querySelectorAll('[data-i18n-html]').forEach(function (e) { e.innerHTML = t(e.getAttribute('data-i18n-html')); });
  root.querySelectorAll('[data-i18n-attr]').forEach(function (e) {
    e.getAttribute('data-i18n-attr').split(';').forEach(function (pair) { var p = pair.split(':'); if (p.length === 2) e.setAttribute(p[0].trim(), t(p[1].trim())); });
  });
}
function nf(x, digits) { return new Intl.NumberFormat(I18N.lang, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(x); }
function fmtPct(p) { return t('common.pct', { v: nf(Math.round(p * 100), 0) }); }

/* ---------- spojenie so skriptom tabuľky ---------- */
// Skript beží ako webová aplikácia Google. Volá sa POST s JSON v tele (bez hlavičiek, aby prehliadač neposielal predbežnú požiadavku).
var API = { url: '' };
function scriptUrl(s) { s = String(s || '').trim(); return /^https?:\/\//.test(s) ? s : 'https://script.google.com/macros/s/' + encodeURIComponent(s) + '/exec'; }
function ApiError(code, msg) { var e = new Error(msg || code); e.code = code; return e; }
function api(action, data) {
  var body = JSON.stringify(Object.assign({ a: action, v: APP.version }, data || {}));
  return fetch(API.url, { method: 'POST', body: body, redirect: 'follow', cache: 'no-store' })
    .catch(function () { throw ApiError('network'); })
    .then(function (r) { if (!r.ok) throw ApiError('http', String(r.status)); return r.text(); })
    .then(function (txt) {
      var j; try { j = JSON.parse(txt); } catch (e) { throw ApiError('bad_response'); }
      if (j && j.error) throw ApiError(j.error, j.msg || '');
      return j;
    });
}
// Opakuje volanie pri výpadku siete alebo preťažení skriptu.
function apiRetry(action, data, tries) {
  tries = tries || 4;
  return api(action, data).catch(function (e) {
    if (tries <= 1 || ['network', 'http', 'bad_response', 'busy'].indexOf(e.code) < 0) throw e;
    return sleep(900 + Math.random() * 1400).then(function () { return apiRetry(action, data, tries - 1); });
  });
}
function errText(e) {
  var code = e && e.code ? e.code : '';
  if (code && has('err.' + code)) return t('err.' + code, { msg: e.message });
  return t('err.unknown', { msg: e && e.message ? e.message : String(e) });
}
function normName(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’'`´.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/* ---------- otázky s dopisovaním: porovnanie odpovedí (rovnaký kód je v Code.gs aj v js/core.js) ---------- */
// Odpoveď aj správne odpovede sa porovnávajú upravené: malé písmená, bez diakritiky a interpunkcie, pomlčka a lomka ako medzera,
// desatinná čiarka ako bodka. Medzery sa pri porovnaní vynechajú („Česko-Slovensko“ = „ceskoslovensko“).
var ANS_MAP = { 'ł': 'l', 'ø': 'o', 'đ': 'd', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ı': 'i' };
function ansNorm(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[łøđßæœı]/g, function (c) { return ANS_MAP[c]; })
    .replace(/(\d)[,.](?=\d)/g, '$1\u0001')
    .replace(/[-‐-―−_\/\\]/g, ' ')
    .replace(/[^\p{L}\p{N}\s\u0001]/gu, '')
    .replace(/\u0001/g, '.').replace(/\s+/g, ' ').trim();
}
function ansKey(s) { return ansNorm(s).replace(/ /g, ''); }
// Počet preklepov medzi dvoma textami (vynechané, pridané, iné alebo prehodené susedné písmeno).
function ansDist(a, b) {
  var n = a.length, m = b.length, d = [], i, j;
  if (!n || !m) return n + m;
  for (i = 0; i <= n; i++) d[i] = [i];
  for (j = 0; j <= m; j++) d[0][j] = j;
  for (i = 1; i <= n; i++) for (j = 1; j <= m; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[n][m];
}
// Koľko preklepov ešte pošle odpoveď na kontrolu učiteľovi: krátke slová a čísla žiadny, do 6 písmen jeden, dlhšie dva.
function ansTol(key) { return key.length < 3 || /^[\d.]+$/.test(key) ? 0 : key.length <= 6 ? 1 : 2; }
// Správne odpovede: zo stĺpca Správna (acc) a uznané učiteľom (add). Zamietnuté učiteľom (rej) už na kontrolu nejdú.
function ansAccepted(q) { return (q.acc || []).concat(q.add || []); }
// Hodnotenie odpovede: 'none' bez odpovede, 'ok' správne, 'review' na kontrolu (líši sa o preklep), 'bad' nesprávne.
function gradeText(q, a) {
  var k = ansKey(a), acc = ansAccepted(q), near = false;
  if (!k) return 'none';
  for (var i = 0; i < acc.length; i++) {
    var c = ansKey(acc[i]);
    if (!c) continue;
    if (c === k) return 'ok';
    if (ansDist(k, c) <= ansTol(c)) near = true;
  }
  return near && (q.rej || []).indexOf(k) < 0 ? 'review' : 'bad';
}
function gradeAns(q, a) {
  if (!q) return 'none';
  if (q.text) return typeof a === 'string' ? gradeText(q, a) : 'none';
  if (typeof a !== 'number') return 'none';
  return a === q.ok ? 'ok' : 'bad';
}

/* ---------- obrázok otázky na celú obrazovku ---------- */
// Ťuknutie na obrázok ho otvorí cez celú obrazovku. Zväčšuje sa dvoma prstami, dvojitým ťuknutím, kolieskom myši
// alebo tlačidlami +/−, posúva sa ťahaním. Je to stále tá istá stránka, takže to nie je odchod z testu.
var ZOOM = { box: null, img: null, s: 1, x: 0, y: 0, pts: {}, moved: false, lastTap: 0 };
function zoomSrc(src) { return String(src || '').replace(/([?&]sz=)w\d+/, '$1w2400'); }   // väčší náhľad z Disku
function zoomOpen() { return !!(ZOOM.box && !ZOOM.box.hidden); }
function zoomBuild() {
  if (ZOOM.box) return;
  var img = el('img', { class: 'zimg', alt: '', draggable: 'false' });
  var btn = function (cls, label, txt, fn) { return el('button', { type: 'button', class: 'zbtn ' + cls, 'aria-label': label, title: label, text: txt, onclick: function (e) { e.stopPropagation(); fn(); } }); };
  var c = function () { var r = ZOOM.box.getBoundingClientRect(); return { x: r.width / 2, y: r.height / 2 }; };
  var box = el('div', { class: 'zoom', role: 'dialog', 'aria-modal': 'true', hidden: true }, [img,
    el('div', { class: 'zbar' }, [
      btn('', t('zoom.out'), '−', function () { var p = c(); zoomTo(ZOOM.s / 1.6, p.x, p.y); }),
      btn('', t('zoom.in'), '+', function () { var p = c(); zoomTo(ZOOM.s * 1.6, p.x, p.y); }),
      btn('zclose', t('common.close'), '✕', zoomClose)]),
    el('p', { class: 'zhint', text: t('zoom.hint') })]);
  document.body.appendChild(box);
  ZOOM.box = box; ZOOM.img = img;
  var pt = function (e) { var r = box.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  var two = function () { var k = Object.keys(ZOOM.pts); return k.length >= 2 ? [ZOOM.pts[k[0]], ZOOM.pts[k[1]]] : null; };
  box.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.zbar')) return;
    ZOOM.pts[e.pointerId] = pt(e); ZOOM.moved = false; ZOOM.down = pt(e);
    try { box.setPointerCapture(e.pointerId); } catch (x) { /* nevadí */ }
  });
  box.addEventListener('pointermove', function (e) {
    var old = ZOOM.pts[e.pointerId]; if (!old) return;
    var p = pt(e), pair = two();
    if (Math.abs(p.x - ZOOM.down.x) + Math.abs(p.y - ZOOM.down.y) > 8) ZOOM.moved = true;
    if (pair) {
      var a = pair[0], b = pair[1], d0 = Math.hypot(a.x - b.x, a.y - b.y), m0 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      ZOOM.pts[e.pointerId] = p; pair = two(); a = pair[0]; b = pair[1];
      var d1 = Math.hypot(a.x - b.x, a.y - b.y), m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      ZOOM.x += m1.x - m0.x; ZOOM.y += m1.y - m0.y;
      zoomTo(ZOOM.s * (d0 ? d1 / d0 : 1), m1.x, m1.y);
    } else {
      ZOOM.pts[e.pointerId] = p;
      if (ZOOM.s > 1) { ZOOM.x += p.x - old.x; ZOOM.y += p.y - old.y; zoomApply(); }
    }
    e.preventDefault();
  });
  var up = function (e) {
    if (!ZOOM.pts[e.pointerId]) return;
    var p = pt(e), many = Object.keys(ZOOM.pts).length > 1;
    delete ZOOM.pts[e.pointerId];
    if (many || ZOOM.moved || e.type === 'pointercancel') { ZOOM.lastTap = 0; return; }
    var now = Date.now();
    if (now - ZOOM.lastTap < 320) { ZOOM.lastTap = 0; if (ZOOM.s > 1.05) zoomTo(1, p.x, p.y); else zoomTo(2.5, p.x, p.y); return; }
    ZOOM.lastTap = now;
    // jedno ťuknutie vedľa obrázka (nie zväčšeného) okno zatvorí
    if (e.target === box && ZOOM.s <= 1.05) setTimeout(function () { if (ZOOM.lastTap === now) zoomClose(); }, 330);
  };
  box.addEventListener('pointerup', up);
  box.addEventListener('pointercancel', up);
  box.addEventListener('wheel', function (e) { e.preventDefault(); var p = pt(e); zoomTo(ZOOM.s * Math.exp(-e.deltaY * 0.0025), p.x, p.y); }, { passive: false });
  document.addEventListener('keydown', function (e) {
    if (!zoomOpen()) return;
    if (e.key === 'Escape') zoomClose();
    else if (e.key === '+' || e.key === '=') { var p = c(); zoomTo(ZOOM.s * 1.6, p.x, p.y); }
    else if (e.key === '-') { var q = c(); zoomTo(ZOOM.s / 1.6, q.x, q.y); }
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  window.addEventListener('resize', function () { if (zoomOpen()) zoomApply(); });
}
// Zväčšenie s na bod (px, py) v okne: ten bod obrázka ostane pod prstom.
function zoomTo(s, px, py) {
  s = Math.max(1, Math.min(8, s));
  var r = ZOOM.box.getBoundingClientRect(), cx = r.width / 2, cy = r.height / 2, f = s / ZOOM.s;
  ZOOM.x = px - cx - f * (px - cx - ZOOM.x); ZOOM.y = py - cy - f * (py - cy - ZOOM.y); ZOOM.s = s;
  zoomApply();
}
// Obrázok sa nedá odsunúť mimo obrazovky: okraj zväčšeného obrázka ostane pri okraji okna.
function zoomApply() {
  var r = ZOOM.box.getBoundingClientRect(), w = ZOOM.img.offsetWidth * ZOOM.s, h = ZOOM.img.offsetHeight * ZOOM.s;
  var mx = Math.max(0, (w - r.width) / 2), my = Math.max(0, (h - r.height) / 2);
  if (ZOOM.s <= 1) { ZOOM.x = 0; ZOOM.y = 0; }
  ZOOM.x = Math.max(-mx, Math.min(mx, ZOOM.x)); ZOOM.y = Math.max(-my, Math.min(my, ZOOM.y));
  ZOOM.img.style.transform = 'translate(' + ZOOM.x + 'px,' + ZOOM.y + 'px) scale(' + ZOOM.s + ')';
  ZOOM.box.classList.toggle('zoomed', ZOOM.s > 1.05);
}
function zoomShow(src) {
  zoomBuild();
  ZOOM.s = 1; ZOOM.x = 0; ZOOM.y = 0; ZOOM.pts = {}; ZOOM.lastTap = 0;
  var big = zoomSrc(src);
  ZOOM.img.onerror = function () { if (ZOOM.img.getAttribute('src') !== src) ZOOM.img.src = src; };
  ZOOM.img.onload = zoomApply;
  ZOOM.img.src = big;
  ZOOM.box.hidden = false; document.body.classList.add('zooming');
  zoomApply();
}
function zoomClose() { if (!ZOOM.box) return; ZOOM.box.hidden = true; ZOOM.pts = {}; document.body.classList.remove('zooming'); }
// Obrázok otázky s lupou v rohu: ťuknutím sa otvorí na celú obrazovku.
function zoomable(img) {
  img.classList.add('zoomable');
  img.setAttribute('role', 'button'); img.setAttribute('tabindex', '0'); img.setAttribute('aria-label', t('zoom.open'));
  img.onclick = function () { if (img.getAttribute('src')) zoomShow(img.getAttribute('src')); };
  img.onkeydown = function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); img.onclick(); } };
  return img;
}
function qImage(src) {
  var img = zoomable(el('img', { class: 'qimg', src: src, alt: '' }));
  return el('div', { class: 'qimgbox' }, [img, el('span', { class: 'zoomico', 'aria-hidden': 'true', html: ZOOM_ICON })]);
}
var ZOOM_ICON = '<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6"/></svg>';
