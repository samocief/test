/* Písomky: stránka učiteľa. Pripája sa odkazom z tabuľky: ucitel.html#s=<skript>&k=<kľúč>, potom si ho pamätá.
 * Dozor (suplujúci učiteľ) dostane odkaz ucitel.html?s=<skript>&t=<test>&dk=<kľúč testu>: vidí len prehľad jednej písomky,
 * môže ju spustiť a uzavrieť, označiť neprítomných a skopírovať výsledky. Jeho odkaz sa nikam neukladá.
 */
var T = { s: '', k: '', dz: false, dk: '', init: null, oldScript: false, listOpen: false, cur: null, poll: null, tab: 'new', sub: 'over', showRes: false, qsForce: false };
var FORM_KEY = 'form', NEED_SCRIPT = '1.0';

function tStatus(id, msg, cls) { var e = $(id); e.textContent = msg || ''; e.className = 'small ' + (cls || 'muted'); e.hidden = !msg; }
function appBase() { return location.origin + location.pathname.replace(/[^/]*$/, ''); }
function pupilUrl(id) { return appBase() + '?s=' + encodeURIComponent(T.s) + '&t=' + encodeURIComponent(id); }
function dozorUrl(id, dk) { return appBase() + 'ucitel.html?s=' + encodeURIComponent(T.s) + '&t=' + encodeURIComponent(id) + '&dk=' + encodeURIComponent(dk); }
// Prihlasovacie údaje k volaniu skriptu: kľúč učiteľa, alebo pri dozore kľúč jednej písomky.
function A(x) { return Object.assign(T.dz ? { dk: T.dk } : { k: T.k }, x || {}); }
function copyText(txt, msgId, okText) {
  (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { tStatus(msgId, okText, 'ok'); })
    .catch(function () { var ta = el('textarea', { style: 'position:fixed;opacity:0' }); ta.value = txt; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); tStatus(msgId, okText, 'ok'); } catch (e) { tStatus(msgId, errText(e), 'bad'); } ta.remove(); });
}
function qrSvg(text) { try { var q = qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); } catch (e) { return ''; } }
function form() { return store(FORM_KEY) || {}; }
function saveForm(patch) { store(FORM_KEY, Object.assign(form(), patch)); }

/* ---------- spustenie a pripojenie tabuľky ---------- */
async function teacherStart() {
  try { await loadLang(param('lang') || 'sk'); } catch (e) { document.body.textContent = e.message; return; }
  applyI18n();
  $('t-ver').textContent = t('common.version', { v: APP.version });
  if (param('dk') && param('t') && param('s')) { dozorStart(); return; }
  var h = new URLSearchParams(location.hash.slice(1));
  if (h.get('s') && h.get('k')) {
    store('teacher', { s: h.get('s'), k: h.get('k') });
    history.replaceState(null, '', location.pathname + location.search);   // kľúč nemá ostať v adrese (projektor, história)
  }
  var c = store('teacher');
  if (!c || !c.s || !c.k) { tConnect(); return; }
  T.s = c.s; T.k = c.k; API.url = scriptUrl(c.s);
  show('t-load', 't');
  try { T.init = await apiRetry('tInit', A(), 3); }
  catch (e) { tConnect(e.code === 'auth' ? t('t.connect_auth') : errText(e)); return; }
  T.oldScript = cmpVer(T.init.v, NEED_SCRIPT) < 0;
  if (T.oldScript) tStatus('t-status', t('t.old_script', { v: T.init.v || '?', need: NEED_SCRIPT }), 'bad');
  $('start').disabled = $('prepare').disabled = T.oldScript;
  $('t-sheet').href = T.init.sheetUrl; $('t-sheet').hidden = false;
  $('t-conn').textContent = t('t.connected', { name: T.init.sheetName || '' }); $('t-foot').hidden = false;
  show('t-app', 't');
  tForm();
  tTab('new');
}
// Dozor: bez tabuľky učiteľa, len jedna písomka.
function dozorStart() {
  T.dz = true; T.s = param('s'); T.dk = param('dk'); API.url = scriptUrl(T.s);
  document.body.classList.add('dozor');
  document.title = t('t.dz_title') + ' · ' + t('app.teacher_title');
  $('dz-help').hidden = false;
  show('t-app', 't');
  T.sub = 'over';
  tOpenTest(param('t'));
}
function tConnect(err) {
  $('t-connect-err').textContent = err || ''; $('t-connect-err').hidden = !err;
  $('t-sheet').hidden = true; $('t-foot').hidden = true;
  show('t-connect', 't');
}
function tTab(name) {
  T.tab = name; clearInterval(T.poll);
  ['new', 'started', 'tests', 'test'].forEach(function (n) { $('v-' + n).hidden = n !== name; });
  $('tab-new').classList.toggle('on', name === 'new' || name === 'started');
  $('tab-tests').classList.toggle('on', name === 'tests' || name === 'test');
  if (name === 'tests') tTests();
  window.scrollTo(0, 0);
}

/* ---------- formulár novej písomky ---------- */
function bankTest() { var v = $('f-bank').value; return v === '' ? null : T.init.bank.tests[+v] || null; }
function classGroups() { var c = $('f-cls').value, g = (T.init.groups || {})[c]; return g || null; }
// Čo bude trieda písať: skupiny A/B (test aj trieda ich majú), alebo všetci to isté (all / A / B).
function tPlan() {
  var b = bankTest(), g = classGroups();
  if (!b) return null;
  var nA = b.n - b.B, nB = b.n - b.A, testAB = b.A > 0 && b.B > 0;
  if (testAB && g && g.A > 0 && g.B > 0) return { groups: true, nA: nA, nB: nB, g: g };
  var only = testAB ? ($('f-groups').querySelector('input[name=only]:checked') || {}).value || 'all' : 'all';
  return { groups: false, testAB: testAB, only: only, n: only === 'A' ? nA : only === 'B' ? nB : b.n, nA: nA, nB: nB };
}
function tForm() {
  var I = T.init, F = form();
  // Trieda a test sa vždy vyberajú vedome: bez predvoľby a bez pamäte z minulej písomky.
  var cls = Object.keys(I.classes).sort(function (a, b) { return a.localeCompare(b, I18N.lang, { numeric: true }); }), sel = $('f-cls');
  sel.innerHTML = '';
  sel.appendChild(el('option', { value: '', text: t('t.class_ph') }));
  if (!cls.length) sel.appendChild(el('option', { value: '', text: t('t.no_classes'), disabled: true }));
  cls.forEach(function (c) { sel.appendChild(el('option', { value: c, text: t('t.class_opt', { cls: c, n: I.classes[c].length }) })); });
  sel.value = '';
  var bs = $('f-bank'); bs.innerHTML = '';
  bs.appendChild(el('option', { value: '', text: t('t.bank_ph') }));
  if (!I.bank.tests.length) bs.appendChild(el('option', { value: '', text: t('t.no_bank'), disabled: true }));
  I.bank.tests.forEach(function (b, i) { bs.appendChild(el('option', { value: String(i), text: t('t.bank_opt', { name: b.name, n: b.n }) })); });
  bs.value = '';
  // chyby v hárku Otázky: riadky, ktoré sa do testu nedostanú
  var eb = $('f-bank-err'); eb.innerHTML = '';
  if (I.bank.errors.length) {
    eb.appendChild(el('p', { class: 'small bad', text: t('t.bank_errors', { n: I.bank.errors.length }) }));
    eb.appendChild(el('ul', { class: 'small bad rules' }, I.bank.errors.slice(0, 12).map(function (e) { return el('li', { text: t('t.row_err', { row: e.row, msg: e.msg }) }); })
      .concat(I.bank.errors.length > 12 ? [el('li', { text: '…' })] : [])));
  }
  eb.hidden = !I.bank.errors.length;
  $('f-title').value = '';
  $('f-time').value = F.total || 15;
  $('f-shuffle').checked = F.shuffle !== false;
  $('f-reveal').value = F.reveal === 'pct' ? 'pct' : 'all';
  sel.onchange = function () { sel.classList.remove('invalid'); tStatus('start-msg', ''); tPlanInfo(); };
  bs.onchange = function () {
    bs.classList.remove('invalid'); tStatus('start-msg', '');
    var b = bankTest(); $('f-title').placeholder = b ? b.name : t('t.title_ph');
    tPlanInfo();
  };
  $('f-time').onchange = function () { var m = Math.max(1, Math.min(240, parseInt($('f-time').value, 10) || 15)); $('f-time').value = m; saveForm({ total: m }); };
  $('f-shuffle').onchange = function () { saveForm({ shuffle: $('f-shuffle').checked }); };
  $('f-reveal').onchange = function () { saveForm({ reveal: $('f-reveal').value }); };
  tListToggle(false);
  tPlanInfo();
}
// Pod triedou a testom: kto čo píše. Pri teste so skupinami a triede bez skupín sa učiteľ rozhodne sám.
function tPlanInfo() {
  var box = $('f-groups'), c = $('f-cls').value, b = bankTest(), keep = ($('f-groups').querySelector('input[name=only]:checked') || {}).value;
  box.innerHTML = '';
  if (b && c) {
    var g = classGroups(), testAB = b.A > 0 && b.B > 0, nA = b.n - b.B, nB = b.n - b.A;
    if (testAB && g && g.A > 0 && g.B > 0) {
      box.appendChild(el('p', { class: 'small muted', text: t('t.groups_on', { cls: c, a: g.A, b: g.B, na: nA, nb: nB }) }));
      if (g.none.length) box.appendChild(el('p', { class: 'small bad', text: t('t.groups_missing', { names: g.none.join(', ') }) }));
    } else if (testAB) {
      box.appendChild(el('p', { class: 'small', text: t('t.only_label', { cls: c }) }));
      var chips = el('div', { class: 'chips' });
      [['all', t('t.only_all', { n: b.n })], ['A', t('t.only_a', { n: nA })], ['B', t('t.only_b', { n: nB })]].forEach(function (o) {
        var inp = el('input', { type: 'radio', name: 'only', value: o[0] }); inp.checked = (keep || 'all') === o[0];
        inp.onchange = tPreview;
        chips.appendChild(el('label', { class: 'chip' }, [inp, ' ' + o[1]]));
      });
      box.appendChild(chips);
    } else box.appendChild(el('p', { class: 'small muted', text: t('t.plain', { n: b.n }) }));
  }
  box.hidden = !box.firstChild;
  tPreview();
}
// Otázky sú predvolene skryté: učiteľ zvyčajne zrkadlí obrazovku na projektor.
function tListToggle(open) {
  T.listOpen = open; $('list-box').hidden = !open; $('list-hidden').hidden = open;
  $('list-toggle').textContent = t(open ? 't.hide_list' : 't.show_list') + (open ? ' ▴' : ' ▾');
  $('list-toggle').setAttribute('aria-expanded', open ? 'true' : 'false');
  $('list-toggle').disabled = !bankTest();
  if (open) tPreview();
}
function qItem(q, noTag) {
  return el('li', {}, [q.q, q.g && !noTag ? el('span', { class: 'badge g', text: q.g }) : null, q.img ? el('span', { class: 'small muted', text: ' 🖼' }) : null,
    el('ul', { class: 'opts2' }, q.opts.map(function (o, i) { return el('li', { class: i === q.ok ? 'ok' : '', text: LETTERS[i] + ') ' + o }); }))]);
}
function tPreview() {
  var box = $('list-box'), b = bankTest(), plan = tPlan();
  $('list-toggle').disabled = !b;
  if (!b) { if (T.listOpen) tListToggle(false); box.innerHTML = ''; return; }
  if (!T.listOpen) return;
  box.innerHTML = '';
  if (plan && plan.groups) {
    var col = function (g) { return el('div', { class: 'stack tight' }, [el('h3', { text: t(g === 'A' ? 't.group_a' : 't.group_b') }), el('ol', { class: 'qprev' }, b.qs.filter(function (q) { return q.g !== (g === 'A' ? 'B' : 'A'); }).map(function (q) { return qItem(q, true); }))]); };
    box.appendChild(el('div', { class: 'cols2' }, [col('A'), col('B')]));
  } else {
    var only = plan ? plan.only : 'all';
    box.appendChild(el('ol', { class: 'qprev' }, b.qs.filter(function (q) { return only === 'all' || q.g !== (only === 'A' ? 'B' : 'A'); }).map(qItem)));
  }
}
async function tStart(state) {
  if (T.oldScript) return;
  var c = $('f-cls').value, b = bankTest(), plan = tPlan();
  $('f-cls').classList.toggle('invalid', !c); $('f-bank').classList.toggle('invalid', !b);
  if (!c || !b) { tStatus('start-msg', t(!c && !b ? 't.err_required' : !c ? 't.err_class' : 't.err_bank'), 'bad'); (!c ? $('f-cls') : $('f-bank')).focus(); return; }
  if (plan.groups && plan.g.none.length && !confirm(t('t.groups_confirm', { names: plan.g.none.join(', ') }))) return;
  var title = $('f-title').value.trim() || b.name, total = Math.max(1, Math.min(240, parseInt($('f-time').value, 10) || 15));
  var cfg = { cls: c, bank: b.name, title: title, total: total, state: state, shuffle: $('f-shuffle').checked, reveal: $('f-reveal').value, only: plan.groups ? 'all' : plan.only };
  $('start').disabled = $('prepare').disabled = true; tStatus('start-msg', t('t.saving'));
  try {
    var r = await api('tCreateTest', A({ cfg: cfg }));
    tStatus('start-msg', '');
    var x = { id: r.id, created: '', cls: r.cls || c, bank: b.name, title: title, n: r.n, groups: !!r.groups, total: r.total || total, state: state, dk: r.dk || '' };
    T.init.tests.push(x);
    // ďalšia písomka sa začína s prázdnou triedou, testom a skrytými otázkami
    $('f-cls').value = ''; $('f-bank').value = ''; $('f-title').value = ''; $('f-title').placeholder = t('t.title_ph'); tListToggle(false); tPlanInfo();
    tStarted(x);
  } catch (e) { tStatus('start-msg', t('t.err_save', { msg: errText(e) }), 'bad'); }
  $('start').disabled = $('prepare').disabled = false;
}
function tStarted(x) {
  tTab('started');
  var ready = x.state === 'ready';
  $('started-title').textContent = t(ready ? 't.ready_title' : 't.started_title', { title: x.title || x.id });
  $('started-text').textContent = t(ready ? 't.ready_text' : 't.started_text');
  $('started-qr').innerHTML = qrSvg(pupilUrl(x.id));
  $('started-link').textContent = pupilUrl(x.id); $('started-link').href = pupilUrl(x.id);
  $('started-go').hidden = !ready;
  $('started-go').onclick = async function () {
    $('started-go').disabled = true;
    try { await api('tSetTest', A({ t: x.id, patch: { state: 'open' } })); x.state = 'open'; tStarted(x); }
    catch (e) { tStatus('t-status', errText(e), 'bad'); }
    $('started-go').disabled = false;
  };
  $('started-dozor').hidden = !x.dk;
  $('started-dozor').onclick = function () { tDozorShow(x); };
  $('started-full').onclick = function () { tQrShow(x.title || x.id, pupilUrl(x.id)); };
  $('started-open').onclick = function () { tOpenTest(x.id); };
  $('started-new').onclick = function () { tTab('new'); };
}
function tQrShow(title, url, opts) {
  opts = opts || {};
  $('qr-title').textContent = title; $('qr-big').innerHTML = qrSvg(url);
  $('qr-warn').textContent = opts.warn || ''; $('qr-warn').hidden = !opts.warn;
  $('qr-print').hidden = !opts.print; $('qr-print').onclick = opts.print || null;
  $('qr-link').innerHTML = ''; $('qr-link').appendChild(el('a', { href: url, target: '_blank', rel: 'noopener', text: url }));
  $('qr-cover').hidden = false;
}
// Dozor: QR kód pre suplujúceho a papier s dvoma kódmi (pre žiakov a pre dozor).
function tDozorShow(x) {
  tQrShow(t('t.dozor_title', { title: x.title || x.id }), dozorUrl(x.id, x.dk), { warn: t('t.dozor_warn'), print: function () { tPrint(x); } });
}
function tPrint(x) {
  var box = $('print-sheet'), meta = [t('t.class_short', { cls: x.cls }), t('t.n_questions', { n: x.n }), t('t.time_short', { n: x.total }), x.groups ? t('t.groups_ab') : ''].filter(Boolean).join(' · ');
  box.innerHTML = '';
  box.appendChild(el('h1', { text: t('app.title') + ': ' + (x.title || x.id) }));
  box.appendChild(el('p', { text: meta }));
  var qrs = el('div', { class: 'pr-qrs' });
  [[t('t.pr_pupils'), pupilUrl(x.id)], [t('t.pr_dozor'), dozorUrl(x.id, x.dk)]].forEach(function (q) {
    qrs.appendChild(el('div', { class: 'pr-qr' }, [el('h2', { text: q[0] }), el('div', { class: 'qr', html: qrSvg(q[1]) }), el('p', { class: 'pr-url', text: q[1] })]));
  });
  box.appendChild(qrs);
  box.appendChild(el('h2', { text: t('t.dz_title') }));
  var ol = el('ol');
  [1, 2, 3, 4, 5].forEach(function (i) { ol.appendChild(el('li', { html: t('t.dz_' + i) })); });
  box.appendChild(ol);
  setTimeout(function () { window.print(); }, 50);
}

/* ---------- zoznam písomiek ---------- */
function stateBadge(state) { return el('span', { class: 'badge' + (state === 'open' ? ' open' : ''), text: t('state.' + state) }); }
async function tTests() {
  var box = $('tests-list');
  box.innerHTML = ''; box.appendChild(el('p', { class: 'muted' }, [el('span', { class: 'spin' }), t('common.loading')]));
  try { var init = await apiRetry('tInit', A(), 2); T.init.tests = init.tests; T.init.classes = init.classes; T.init.groups = init.groups; T.init.bank = init.bank; } catch (e) { /* ukážeme, čo máme */ }
  box.innerHTML = '';
  var rows = T.init.tests.slice().reverse();
  if (!rows.length) { box.appendChild(el('p', { class: 'muted', text: t('t.no_tests') })); return; }
  var tb = el('tbody');
  rows.forEach(function (x) {
    tb.appendChild(el('tr', {}, [
      el('td', {}, [el('b', { text: x.title || x.id }), el('br'), el('span', { class: 'small muted', text: [x.created, x.id].filter(Boolean).join(' · ') })]),
      el('td', { text: x.cls }), el('td', { class: 'num', text: String(x.n) + (x.groups ? ' (A/B)' : '') }),
      el('td', {}, [stateBadge(x.state)]),
      el('td', {}, [el('button', { type: 'button', class: 'mini', text: t('t.open'), onclick: function () { tOpenTest(x.id); } })])]));
  });
  box.appendChild(el('div', { class: 'tablebox' }, [el('table', {}, [el('thead', {}, [el('tr', {}, [t('t.col_test'), t('t.col_class'), t('t.col_n'), t('t.col_state'), ''].map(function (h, i) { return el('th', { class: i === 2 ? 'num' : '', text: h }); }))]), tb])]));
}

/* ---------- jedna písomka ---------- */
async function tOpenTest(id) {
  tTab('test'); $('test-body').hidden = true; tStatus('test-msg', t('common.loading'));
  try {
    var d = await apiRetry('tTest', A({ t: id, withPack: true }), 3);
    T.cur = { id: id, d: d, pack: d.pack || null, dk: d.dk || T.dk };
    T.showRes = false; $('show-res').checked = false; T.qsForce = false;
    if (T.dz) T.sub = 'over';
    tPrepResults();
    $('test-qr').innerHTML = qrSvg(pupilUrl(id));
    $('test-qr-btn').onclick = function () { tQrShow(d.test.title || id, pupilUrl(id)); };
    $('test-dozor-btn').hidden = T.dz || !T.cur.dk;
    $('test-dozor-btn').onclick = function () { tDozorShow(tSummary()); };
    $('test-reveal-row').hidden = T.dz;
    $('test-reveal').value = d.test.reveal === 'pct' ? 'pct' : 'all';
    $('test-body').hidden = false; tStatus('test-msg', '');
    tSub(T.sub); tPollStart();
  } catch (e) { tStatus('test-msg', errText(e), 'bad'); }
}
function tSummary() { var x = T.cur.d.test; return { id: x.id, title: x.title, cls: x.cls, n: (x.groups ? x.keysA : x.keys).length, total: x.total, groups: !!x.groups, dk: T.cur.dk }; }
function keysOf(r) { return r && r.keys ? r.keys : T.cur.d.test.keys; }
// Body a percentá žiaka podľa aktuálneho kľúča (rovnako ako skript tabuľky). Bez balíka (dozor) sa berie výsledok z tabuľky.
function resScore(r) {
  var pack = T.cur.pack, keys = keysOf(r);
  if (!pack) { var m = /(\d+)\s*\/\s*(\d+)/.exec(r.points || ''); return { ok: m ? +m[1] : null, n: keys.length, pct: typeof r.pct === 'number' ? r.pct : null }; }
  var ok = 0; keys.forEach(function (k) { var q = pack.q[k]; if (q && r.ans[k] === q.ok) ok++; });
  return { ok: ok, n: keys.length, pct: Math.max(0, (keys.length ? ok / keys.length : 0) - (r.leaves > 0 ? T.cur.d.penalty || 0 : 0)) };
}
// Posledný odovzdaný pokus každého žiaka. res = všetky odovzdané (aj učiteľ), stat = bez učiteľa, absent = neprítomní.
function tPrepResults() {
  var d = T.cur.d, last = {};
  d.results.forEach(function (r) { var cur = last[r.pupilId]; if (!cur || !r.absent || cur.absent) last[r.pupilId] = r; });
  T.cur.res = []; T.cur.absent = {};
  Object.keys(last).forEach(function (k) { var r = last[k]; if (r.absent) T.cur.absent[k] = r; else { r.sc = resScore(r); T.cur.res.push(r); } });
  T.cur.stat = T.cur.res.filter(function (r) { return !r.teacher; });
}
function classAvg() { var a = T.cur.stat.filter(function (r) { return r.sc.pct !== null; }); return a.length ? a.reduce(function (s, r) { return s + r.sc.pct; }, 0) / a.length : null; }
function tRefresh() {
  return api('tTest', A({ t: T.cur.id })).then(function (d) {
    if (!T.cur || d.test.id !== T.cur.id) return;
    T.cur.d = d; tPrepResults(); tHead();
    if (T.sub === 'over') tOverview(); else tQs();
  });
}
function tPollStart() {
  clearInterval(T.poll);
  T.poll = setInterval(function () {
    if (T.tab !== 'test' || !T.cur || document.hidden) return;
    tRefresh().catch(function () {});
  }, 6000);
}
function tSub(name) {
  T.sub = name;
  ['over', 'qs'].forEach(function (n) { $('sub-' + n).hidden = n !== name; $('sub-' + n + '-b').classList.toggle('on', n === name); });
  $('sub-qs-b').hidden = T.dz;
  tHead();
  if (name === 'over') tOverview(); else tQs();
}
var NEXT_STATE = { ready: 'open', open: 'closed', closed: 'open' };
function tHead() {
  var x = T.cur.d.test, b = $('test-state'), st = x.state;
  $('test-title').textContent = x.title || x.id;
  b.textContent = t('state.' + st); b.className = 'badge' + (st === 'open' ? ' open' : '');
  $('test-toggle').textContent = st === 'ready' ? t('t.start_test') : st === 'open' ? t('t.close_test') : t('t.reopen_test');
  $('test-toggle').className = st === 'closed' ? '' : 'primary';
  $('test-toggle-hint').textContent = st === 'ready' ? t('t.ready_hint') : st === 'open' ? t('t.close_hint') : t('t.closed_hint');
  $('test-meta').textContent = [t('t.class_short', { cls: x.cls }), x.bank && x.bank !== x.title ? x.bank : '', t('t.n_questions', { n: (x.groups ? x.keysA : x.keys).length }), x.groups ? t('t.groups_ab') : '',
    t('t.time_short', { n: x.total }), x.created, x.id].filter(Boolean).join(' · ');
}
async function tToggleState() {
  var x = T.cur.d.test, next = NEXT_STATE[x.state] || 'open';
  if (next === 'closed' && !confirm(t('t.close_confirm'))) return;
  $('test-toggle').disabled = true;
  try {
    await api('tSetTest', A({ t: T.cur.id, patch: { state: next } }));
    x.state = next; tHead();
    if (T.init) T.init.tests.forEach(function (y) { if (y.id === T.cur.id) y.state = next; });
    if (T.sub === 'qs') tQs();
  } catch (e) { tStatus('test-msg', errText(e), 'bad'); }
  $('test-toggle').disabled = false;
}
async function tSetReveal() {
  var v = $('test-reveal').value;
  try { await api('tSetTest', A({ t: T.cur.id, patch: { reveal: v } })); T.cur.d.test.reveal = v; }
  catch (e) { tStatus('test-msg', errText(e), 'bad'); $('test-reveal').value = T.cur.d.test.reveal; }
}

/* prehľad */
// Riadky prehľadu: žiaci triedy (učiteľ na konci), k tomu odovzdané testy mien, ktoré už v zozname nie sú.
function tRows() {
  var d = T.cur.d, rows = d.pupils.map(function (p) { return { id: p.id, label: p.teacher ? t('p.teacher') : p.label, teacher: !!p.teacher, group: p.group || '', nogroup: !!p.nogroup }; });
  T.cur.res.forEach(function (r) { if (!rows.some(function (p) { return p.id.split('#')[0] === r.pupilId; })) rows.push({ id: r.pupilId, label: r.teacher ? t('p.teacher') : r.name, teacher: r.teacher, group: r.group || '' }); });
  return rows.filter(function (p) { return !p.teacher; }).concat(rows.filter(function (p) { return p.teacher; }));
}
function resText(sc) { return sc.pct === null ? '' : fmtPct(sc.pct) + (sc.ok !== null ? ' (' + sc.ok + '/' + sc.n + ')' : ''); }
function tOverview() {
  var d = T.cur.d, x = d.test, by = {}, done = 0, writing = 0, absent = 0, total = 0, tb = el('tbody'), seen = {}, list = [];
  T.cur.res.forEach(function (r) { by[r.pupilId] = r; });
  tRows().forEach(function (p) {
    var key = p.id.split('#')[0], r = seen[key] ? null : by[key], L = d.logins.p[p.id], ab = !r && !L && !!T.cur.absent[key], st, cls = '', btn = null;
    seen[key] = 1;
    if (!p.teacher) total++;
    var pr = d.prog && d.prog[p.id], n = (x.groups && p.group === 'B' ? x.keysB : x.groups ? x.keysA : x.keys).length;
    if (r) { st = t('t.st_done', { time: (/(\d\d:\d\d)/.exec(r.sent) || [])[1] || '' }); cls = 'ok'; if (!p.teacher) done++; }
    else if (L) { st = pr ? t('t.st_writing_n', { time: String(L.t).slice(0, 5), n: pr.n, total: n }) : t('t.st_writing', { time: String(L.t).slice(0, 5) }); if (!p.teacher) writing++; }
    else if (ab) { st = t('t.st_absent'); cls = 'absent'; absent++; }
    else st = t('t.st_none');
    var flags = r && r.flag ? [r.flag] : d.logins.f.filter(function (f) { return f.p === p.id; }).map(function (f) { return f.k + ' ' + f.t; });
    if (L) btn = el('button', { type: 'button', class: 'mini', text: r ? t('t.allow_retry') : t('t.unlock'), onclick: function () {
      if (r && !confirm(t('t.retry_confirm', { name: p.label }))) return;
      api('tUnlock', A({ t: T.cur.id, p: p.id })).then(function () { delete d.logins.p[p.id]; tOverview(); }).catch(function (e) { tStatus('test-msg', errText(e), 'bad'); });
    } });
    else if (!r && !p.teacher) btn = el('button', { type: 'button', class: 'mini', text: ab ? t('t.unmark_absent') : t('t.mark_absent'), onclick: function () { tAbsent(p, !ab, this); } });
    list.push({ p: p, r: r, st: st, cls: cls, flags: flags, btn: btn });
  });
  // stĺpec Príznak len vtedy, keď nejaký príznak je (na telefóne by inak tabuľka nevošla)
  var anyFlag = list.some(function (o) { return o.flags.length; });
  list.forEach(function (o) {
    var nm = el('td', {}, [o.p.label, x.groups && o.p.group && !o.p.teacher ? el('span', { class: 'badge' + (o.p.nogroup ? ' warn' : ''), style: 'margin-left:6px', title: o.p.nogroup ? t('t.no_group') : null, text: o.p.group }) : null]);
    var cells = [nm, el('td', { class: o.cls, text: o.st })];
    if (T.showRes) cells.push(el('td', { class: 'num', text: o.r ? resText(o.r.sc) : '' }));
    if (anyFlag) cells.push(el('td', { class: o.flags.length ? 'bad small' : 'small', text: o.flags.join('; ') }));
    cells.push(el('td', { class: 'act' }, [o.btn]));
    tb.appendChild(el('tr', {}, cells));
  });
  $('over-sum').textContent = t('t.over_sum', { done: done, total: total - absent, writing: writing }) + (absent ? ' ' + t('t.over_absent', { n: absent }) : '');
  var heads = [t('t.col_pupil'), t('t.col_status')].concat(T.showRes ? [t('t.col_result')] : []).concat(anyFlag ? [t('t.col_flag')] : []).concat(['']);
  var box = $('over-table'); box.innerHTML = '';
  box.appendChild(el('table', {}, [el('thead', {}, [el('tr', {}, heads.map(function (h, i) { return el('th', { class: T.showRes && i === 2 ? 'num' : '', text: h }); }))]), tb]));
  var avg = classAvg();
  $('avg-pct').textContent = avg === null ? '–' : fmtPct(avg);
  $('avg-note').textContent = avg === null ? t('t.no_results') : t('t.avg_note', { pct: Math.round((d.penalty || 0) * 100) });
}
async function tAbsent(p, on, btn) {
  if (btn) btn.disabled = true;
  try { await api('tAbsent', A({ t: T.cur.id, p: p.id, on: on })); await tRefresh(); }
  catch (e) { tStatus('test-msg', errText(e), 'bad'); if (btn) btn.disabled = false; }
}
// Výsledky do Excelu: meno, (skupina), body a percentá (bez učiteľa), neprítomní s textom.
function tCopyResults() {
  var g = !!T.cur.d.test.groups, by = {}, seen = {}, lines = [[t('t.tsv_pupil')].concat(g ? [t('t.tsv_group')] : [], [t('t.tsv_points'), t('t.tsv_result')]).join('\t')];
  T.cur.res.forEach(function (r) { by[r.pupilId] = r; });
  tRows().forEach(function (p) {
    var key = p.id.split('#')[0]; if (p.teacher || seen[key]) return; seen[key] = 1;
    var r = by[key], ab = T.cur.absent[key];
    lines.push([p.label].concat(g ? [r ? r.group : p.group] : [], r ? [r.sc.ok === null ? '' : r.sc.ok, r.sc.pct === null ? '' : Math.round(r.sc.pct * 100)] : [ab ? t('t.st_absent') : '', '']).join('\t'));
  });
  copyText(lines.join('\n'), 'over-msg', t('t.copied_results'));
}

/* štatistika otázok a oprava kľúča */
function qTag(k) {
  var x = T.cur.d.test, ga = x.keysA.indexOf(k), gb = x.keysB.indexOf(k);
  if (!x.groups) return (x.keys.indexOf(k) + 1) + '.';
  return ga >= 0 && gb >= 0 ? 'A' + (ga + 1) + '/B' + (gb + 1) + '.' : ga >= 0 ? 'A' + (ga + 1) + '.' : 'B' + (gb + 1) + '.';
}
function tQs() {
  var x = T.cur.d.test, pack = T.cur.pack, gate = x.state !== 'closed' && !T.qsForce;
  $('qs-gate').hidden = !gate; $('qs-body').hidden = gate;
  if (gate || !pack) return;
  var items = x.keys.map(function (k) {
    var q = pack.q[k], cnt = q.opts.map(function () { return 0; }), none = 0, n = 0, ok = 0;
    T.cur.stat.forEach(function (r) {
      if (keysOf(r).indexOf(k) < 0) return;
      n++; var a = r.ans[k];
      if (typeof a === 'number' && a < cnt.length) { cnt[a]++; if (a === q.ok) ok++; } else none++;
    });
    return { k: k, q: q, cnt: cnt, none: none, n: n, ok: ok, p: n ? ok / n : null };
  });
  items.sort(function (a, b) { return (a.p === null ? 2 : a.p) - (b.p === null ? 2 : b.p); });
  var box = $('qs-list'); box.innerHTML = '';
  items.forEach(function (it) {
    var max = Math.max(1, it.n), rows = it.q.opts.map(function (o, i) {
      var good = i === it.q.ok;
      var letter = good ? el('b', { text: LETTERS[i] }) : el('button', { type: 'button', text: LETTERS[i], title: t('t.fix_hint'), onclick: function () { tFixKey(it, i); } });
      return el('div', { class: 'drow' + (good ? ' ok' : '') }, [letter, el('span', { class: 'tx', text: o + (good ? ' ✓' : '') }), el('div', { class: 'bar' }, [el('i', { style: 'width:' + (it.cnt[i] / max * 100) + '%' })]), el('span', { class: 'n', text: String(it.cnt[i]) })]);
    });
    if (it.none) rows.push(el('div', { class: 'drow' }, [el('span', { text: '–' }), el('span', { class: 'tx muted', text: t('t.qs_none') }), el('div', { class: 'bar' }, [el('i', { style: 'width:' + (it.none / max * 100) + '%' })]), el('span', { class: 'n', text: String(it.none) })]));
    box.appendChild(el('div', { class: 'qs' }, [
      el('div', { class: 'top row' }, [el('div', { class: 'qq' }, [el('small', { text: qTag(it.k) }), it.q.q]), el('div', { class: 'pc', text: it.p === null ? '–' : fmtPct(it.p) })]),
      el('div', { class: 'small muted', text: t('t.qs_count', { n: it.n }) }),
      el('div', { class: 'dist' }, rows)]));
  });
}
async function tFixKey(it, i) {
  if (!confirm(t('t.fix_confirm', { q: it.q.q, l: LETTERS[i], opt: it.q.opts[i] }))) return;
  tStatus('qs-msg', t('common.loading'));
  try {
    var r = await api('tFixKey', A({ t: T.cur.id, q: it.k, ok: i }));
    T.cur.pack.q[it.k].ok = i;
    tPrepResults(); tQs();
    tStatus('qs-msg', t('t.fix_done', { n: r.n || 0 }), 'ok');
  } catch (e) { tStatus('qs-msg', errText(e), 'bad'); }
}

/* ---------- tlačidlá ---------- */
(function () {
  function on(id, fn, ev) { $(id)[ev || 'onclick'] = fn; }
  on('tab-new', function () { tTab('new'); });
  on('tab-tests', function () { tTab('tests'); });
  on('start', function () { tStart('open'); });
  on('prepare', function () { tStart('ready'); });
  on('list-toggle', function () { tListToggle(!T.listOpen); });
  on('show-res', function () { T.showRes = this.checked; tOverview(); }, 'onchange');
  on('over-copy', tCopyResults);
  on('qs-force', function () { T.qsForce = true; tQs(); });
  on('test-toggle', tToggleState);
  on('test-reveal', tSetReveal, 'onchange');
  on('sub-over-b', function () { tSub('over'); });
  on('sub-qs-b', function () { tSub('qs'); });
  on('qr-close', function () { $('qr-cover').hidden = true; });
  window.addEventListener('afterprint', function () { $('print-sheet').innerHTML = ''; });
  on('qr-cover', function (e) { if (e.target === $('qr-cover')) $('qr-cover').hidden = true; });
  on('t-disconnect', function () { if (confirm(t('t.disconnect_confirm'))) { store('teacher', null); location.reload(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') $('qr-cover').hidden = true; });
  // odkaz z tabuľky vložený do už otvorenej stránky mení len časť za #, stránka sa preto načíta znova
  window.addEventListener('hashchange', function () { if (/[#&]k=/.test(location.hash)) location.reload(); });
})();
teacherStart();
