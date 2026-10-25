/* Písomky: spoločné pomôcky (texty v jazykoch, spojenie so skriptom tabuľky, drobnosti pre stránku). */
var APP = { version: '1.3' };

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
