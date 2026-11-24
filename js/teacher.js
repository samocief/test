/* Písomky: stránka učiteľa. Pripája sa odkazom z tabuľky: ucitel.html#s=<skript>&k=<kľúč>, potom si ho pamätá.
 * Dozor (suplujúci učiteľ) dostane odkaz ucitel.html?s=<skript>&t=<test>&dk=<kľúč testu>: vidí len prehľad jednej písomky,
 * môže ju spustiť a uzavrieť, vracať zamknutých žiakov do testu, označiť neprítomných a skopírovať výsledky. Jeho odkaz sa nikam neukladá.
 */
var T = { s: '', k: '', dz: false, dk: '', init: null, oldScript: false, listOpen: false, printOpen: false, cur: null, poll: null, tab: 'new', sub: 'over', showRes: false, qsForce: false };
// NEED_SCRIPT: bez neho aplikácia nefunguje; FEAT_SCRIPT: akcie v ponuke ⋯ (premenovať, duplikovať, …), so starším skriptom sú vypnuté.
var FORM_KEY = 'form', NEED_SCRIPT = '1.14', FEAT_SCRIPT = '1.15';
// Názov písomky je zároveň jej id (odkaz, QR, hárok výsledkov, priečinok s PDF): bez diakritiky, medzier a bodiek, unikátny bez ohľadu na veľké písmená.
var NAME_RE = /^[A-Za-z0-9_-]+$/, NAME_MAX = 40;

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
  T.oldScript = cmpVer(T.init.v, NEED_SCRIPT) < 0; T.feat = cmpVer(T.init.v, FEAT_SCRIPT) >= 0;
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
// Šachovnica (len pri zasadacom poriadku v hárku Žiaci): v každom druhom rade sú skupiny prehodené, takže inú skupinu má aj sused vpredu a vzadu.
function altOn(g) { return !!(g && g.seat && form().alt); }
function groupCounts(g) { return altOn(g) && g.alt ? { A: g.alt.A || 0, B: g.alt.B || 0, none: g.none } : g; }
function altChip(g, after) {
  var inp = el('input', { type: 'checkbox' }); inp.checked = altOn(g);
  inp.onchange = function () { saveForm({ alt: inp.checked }); after(); };
  return el('div', { class: 'stack tight' }, [el('label', { class: 'chip', style: 'align-self:flex-start' }, [inp, ' ' + t('t.alt')]), el('p', { class: 'small muted', text: t('t.alt_hint') })]);
}
// Čo bude trieda písať: skupiny A/B (test aj trieda ich majú), alebo všetci to isté (all / A / B).
function tPlan() {
  var b = bankTest(), g = classGroups();
  if (!b) return null;
  var nA = b.n - b.B, nB = b.n - b.A, testAB = b.A > 0 && b.B > 0;
  if (testAB && g && g.A > 0 && g.B > 0) return { groups: true, nA: nA, nB: nB, g: groupCounts(g), alt: altOn(g) };
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
  $('f-title').value = ''; tNameCheck();
  $('f-time').value = F.total || 15;
  $('f-shuffle').checked = F.shuffle !== false;
  $('f-reveal').value = F.reveal === 'pct' ? 'pct' : 'all';
  sel.onchange = function () { sel.classList.remove('invalid'); tStatus('start-msg', ''); tPlanInfo(); };
  bs.onchange = function () {
    bs.classList.remove('invalid'); tStatus('start-msg', '');
    // názov sa predvyplní podľa testu; ak nie je platný alebo unikátny, ostane červený a učiteľ ho musí zmeniť
    var b = bankTest(); $('f-title').value = b ? b.name : ''; tNameCheck();
    tPlanInfo();
  };
  $('f-title').oninput = function () { tStatus('start-msg', ''); tNameCheck(); };
  $('f-time').onchange = function () { var m = Math.max(1, Math.min(240, parseInt($('f-time').value, 10) || 15)); $('f-time').value = m; saveForm({ total: m }); };
  $('f-shuffle').onchange = function () { saveForm({ shuffle: $('f-shuffle').checked }); };
  $('f-reveal').onchange = function () { saveForm({ reveal: $('f-reveal').value }); };
  $('pr-dys').checked = !!F.prDys; $('pr-key').checked = !!F.prKey;
  $('pr-dys').onchange = function () { saveForm({ prDys: $('pr-dys').checked }); };
  $('pr-key').onchange = function () { saveForm({ prKey: $('pr-key').checked }); };
  $('print-toggle').onclick = function () { tPrintBox(!T.printOpen); };
  $('pr-go').onclick = tPaper;
  tListToggle(false); tPrintBox(false);
  tPlanInfo();
}
// Pod triedou a testom: kto čo píše. Pri teste so skupinami a triede bez skupín sa učiteľ rozhodne sám.
function tPlanInfo() {
  var box = $('f-groups'), c = $('f-cls').value, b = bankTest(), keep = ($('f-groups').querySelector('input[name=only]:checked') || {}).value;
  box.innerHTML = '';
  if (b && c) {
    var g = classGroups(), testAB = b.A > 0 && b.B > 0, nA = b.n - b.B, nB = b.n - b.A;
    if (testAB && g && g.A > 0 && g.B > 0) {
      var gc = groupCounts(g);
      box.appendChild(el('p', { class: 'small muted', text: t('t.groups_on', { cls: c, a: gc.A, b: gc.B, na: nA, nb: nB }) }));
      if (g.seat) box.appendChild(altChip(g, tPlanInfo));
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
  var opts = q.num ? [el('li', { class: 'ok', text: '# ' + numText(q) })] : q.text ? [el('li', { class: 'ok', text: '✎ ' + (q.acc || []).join('; ') })]
    : q.opts.map(function (o, i) { return el('li', { class: i === q.ok ? 'ok' : '', text: LETTERS[i] + ') ' + o }); });
  return el('li', {}, [q.q, q.g && !noTag ? el('span', { class: 'badge g', text: q.g }) : null, q.num ? el('span', { class: 'badge g', text: t('t.num_badge') }) : q.text ? el('span', { class: 'badge g', text: t('t.text_badge') }) : null,
    q.img ? el('span', { class: 'small muted', text: ' 🖼' }) : null, el('ul', { class: 'opts2' }, opts)]);
}
function tPreview() {
  var box = $('list-box'), b = bankTest(), plan = tPlan();
  $('list-toggle').disabled = !b;
  tPrintBox(T.printOpen);
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
  if (tNameCheck(true)) { $('f-title').focus(); return; }
  if (plan.groups && plan.g.none.length && !confirm(t('t.groups_confirm', { names: plan.g.none.join(', ') }))) return;
  var title = $('f-title').value.trim(), total = Math.max(1, Math.min(240, parseInt($('f-time').value, 10) || 15));
  var cfg = { cls: c, bank: b.name, title: title, total: total, state: state, shuffle: $('f-shuffle').checked, reveal: $('f-reveal').value, only: plan.groups ? 'all' : plan.only, alt: !!(plan.groups && plan.alt) };
  $('start').disabled = $('prepare').disabled = true; tStatus('start-msg', t('t.saving'));
  try {
    var r = await api('tCreateTest', A({ cfg: cfg }));
    tStatus('start-msg', '');
    var x = { id: r.id, created: r.created || nowStr(), started: r.started !== undefined ? r.started : state === 'open' ? nowStr() : '', cls: r.cls || c, bank: b.name, title: r.id || title, n: r.n, groups: !!r.groups, alt: !!r.alt, total: r.total || total, state: state, dk: r.dk || '' };
    T.init.tests.push(x);
    (T.init.taken = T.init.taken || []).push(String(x.id).toLowerCase());
    // ďalšia písomka sa začína s prázdnou triedou, testom a skrytými otázkami
    $('f-cls').value = ''; $('f-bank').value = ''; $('f-title').value = ''; tNameCheck(); tListToggle(false); tPrintBox(false); tPlanInfo();
    tStarted(x);
  } catch (e) { tStatus('start-msg', t('t.err_save', { msg: errText(e) }), 'bad'); }
  $('start').disabled = $('prepare').disabled = false;
  tNameCheck();
}
// Kontrola názvu písomky: vráti chybu ('empty' | 'chars' | 'long' | 'taken') alebo ''. Chybný názov je červený a písomka sa nedá spustiť.
// Prázdny názov sa vyznačí až pri pokuse o spustenie (show).
function nameTaken(v) {
  var k = String(v).toLowerCase(), list = (T.init && T.init.taken) || ((T.init && T.init.tests) || []).map(function (x) { return String(x.id).toLowerCase(); });
  return list.indexOf(k) >= 0;
}
// own: vlastný názov písomky pri premenovaní (nie je obsadený, dá sa zmeniť aj len veľkosť písmen)
function nameErr(v, own) {
  var max = (T.init && T.init.nameMax) || NAME_MAX;
  if (!v) return 'empty';
  if (v.length > max) return 'long';
  if (!NAME_RE.test(v)) return 'chars';
  if (own && v.toLowerCase() === String(own).toLowerCase()) return '';
  return nameTaken(v) ? 'taken' : '';
}
function tNameCheck(show) {
  var inp = $('f-title'), v = inp.value.trim(), max = (T.init && T.init.nameMax) || NAME_MAX;
  var err = nameErr(v);
  var mark = !!err && (err !== 'empty' || !!show);
  inp.classList.toggle('invalid', mark);
  tStatus('f-title-msg', mark ? t('t.name_' + err, { max: max }) : '', 'bad');
  $('start').disabled = $('prepare').disabled = T.oldScript || (!!err && err !== 'empty');
  return err;
}
function nowStr() { var d = new Date(), p = function (x) { return ('0' + x).slice(-2); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }
// „vytvorená 18.11. 08:38 · spustená 08:41“ (pri inom dni aj s dátumom), pripravená: „· nespustená“
function whenText(x) {
  var m = function (s) { return /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)/.exec(String(s || '')); };
  var c = m(x.created), s = m(x.started), day = function (a) { return (+a[3]) + '.' + (+a[2]) + '.'; }, hm = function (a) { return a[4] + ':' + a[5]; };
  var out = [];
  if (c) out.push(t('t.when_created', { when: day(c) + ' ' + hm(c) })); else if (x.created) out.push(t('t.when_created', { when: x.created }));
  if (s) out.push(t('t.when_started', { when: c && day(c) === day(s) && c[1] === s[1] ? hm(s) : day(s) + ' ' + hm(s) }));
  else if (x.state === 'ready') out.push(t('t.when_not_started'));
  return out.join(' · ');
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
    try { await api('tSetTest', A({ t: x.id, patch: { state: 'open' } })); x.state = 'open'; if (!x.started) x.started = nowStr(); tStarted(x); }
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
  var box = $('print-sheet'), meta = [t('t.class_short', { cls: x.cls }), t('t.n_questions', { n: x.n }), t('t.time_short', { n: x.total }), x.groups ? t('t.groups_ab') : '', x.alt ? t('t.alt_short') : ''].filter(Boolean).join(' · ');
  box.innerHTML = ''; box.className = '';
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

/* ---------- písomka na papier (tlač alebo PDF) ---------- */
// Test z banky na tlač: hlavička s menom, otázky v poradí z hárka Otázky, pri skupinách každá skupina na samostatných stranách.
// Úprava pre dyslexiu: väčšie písmo, riadkovanie a medzery, možnosti vždy pod sebou. Kľúč: vyznačené správne odpovede.
function tPrintBox(open) {
  var b = bankTest(), box = $('pr-groups');
  T.printOpen = !!(open && b);
  $('print-box').hidden = !T.printOpen;
  $('print-toggle').disabled = !b;
  $('print-toggle').setAttribute('aria-expanded', T.printOpen ? 'true' : 'false');
  if (!T.printOpen) { tStatus('pr-msg', ''); return; }
  var testAB = b.A > 0 && b.B > 0, keep = (box.querySelector('input:checked') || {}).value;
  box.hidden = !testAB;
  if (!testAB) { box.innerHTML = ''; return; }
  if (box.dataset.test === b.name && box.firstChild) return;
  box.dataset.test = b.name; box.innerHTML = '';
  var nA = b.n - b.B, nB = b.n - b.A;
  [['AB', t('t.pr_ab')], ['A', t('t.pr_a') + ' (' + nA + ')'], ['B', t('t.pr_b') + ' (' + nB + ')'], ['all', t('t.pr_all') + ' (' + b.n + ')']].forEach(function (o) {
    var inp = el('input', { type: 'radio', name: 'pr-g', value: o[0] }); inp.checked = (keep || 'AB') === o[0];
    box.appendChild(el('label', { class: 'chip' }, [inp, ' ' + o[1]]));
  });
}
function paperQ(q, key, dys) {
  var kids = [el('div', { class: 'pq-q', text: q.q + (key && q.void ? '  (' + t('t.void_badge_' + q.void) + ')' : '') })];
  if (q.img) kids.push(el('img', { class: 'pq-img', src: q.img, alt: '', onerror: function () { this.remove(); } }));
  if (q.opts && q.opts.length) {
    var short = !dys && q.opts.every(function (o) { return String(o).length <= 28; });
    kids.push(el('ol', { class: 'pq-opts' + (short ? ' two' : '') }, q.opts.map(function (o, i) {
      var ok = key && i === q.ok;
      return el('li', { class: ok ? 'pk' : '' }, [el('span', { class: 'lt', text: LETTERS[i] }), el('span', { text: o + (ok ? '  ✓' : '') })]);
    })));
  } else kids.push(el('div', { class: 'pq-line' + (q.num ? ' num' : '') }, key ? [el('span', { text: q.num ? numText(q) : (q.acc || []).join('; ') })] : []));
  return el('li', {}, kids);
}
function tPaper() {
  var b = bankTest(); if (!b) return;
  var mode = b.A > 0 && b.B > 0 ? (($('pr-groups').querySelector('input:checked') || {}).value || 'AB') : 'all';
  var sets = (mode === 'AB' ? ['A', 'B'] : [mode]).map(function (g) { return { g: g, qs: b.qs.filter(function (q) { return g === 'all' || q.g !== (g === 'A' ? 'B' : 'A'); }) }; });
  paperRender(b.name, sets, $('pr-dys').checked, $('pr-key').checked, 'pr-msg');
}
// sets: [{g: 'A' | 'B' | 'all', qs: otázky}], každá sada na samostatných stranách. msgId: kam napísať „Pripravujem tlač…“.
function paperRender(title, sets, dys, key, msgId) {
  var box = $('print-sheet');
  box.innerHTML = ''; box.className = 'paper' + (dys ? ' dys' : '');
  sets.forEach(function (set) {
    var g = set.g, qs = set.qs;
    var head = [title, g !== 'all' ? t('t.pp_group', { g: g }) : '', key ? t('t.pp_key') : ''].filter(Boolean).join(' · ');
    var rules = [];
    if (qs.some(function (q) { return q.opts && q.opts.length; })) rules.push(t('t.pp_rule_pick'));
    if (qs.some(function (q) { return !(q.opts && q.opts.length); })) rules.push(t('t.pp_rule_line'));
    var field = function (label, cls) { return el('div', { class: 'pp-f ' + (cls || '') }, [el('span', { text: label }), el('i')]); };
    var pts = qs.filter(function (q) { return !voidSkip(q); }).length;
    box.appendChild(el('section', { class: 'pp' }, [
      el('h1', { text: head }),
      key ? null : el('div', { class: 'pp-fields' }, [field(t('t.pp_name'), 'wide'), field(t('t.pp_class')), field(t('t.pp_date'))]),
      el('div', { class: 'pp-sub' }, [el('span', { text: rules.join(' ') }), el('b', { text: t('t.pp_points', { n: pts }) })]),
      el('ol', { class: 'pq' }, qs.map(function (q) { return paperQ(q, key, dys); }))
    ]));
  });
  // tlačí sa, až keď sú načítané obrázky a písmo (najviac 8 s)
  tStatus(msgId, t('t.pr_wait'));
  var imgs = [].slice.call(box.querySelectorAll('img')).map(function (im) { return im.complete ? Promise.resolve() : new Promise(function (r) { im.addEventListener('load', r); im.addEventListener('error', r); }); });
  var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  return Promise.race([Promise.all(imgs.concat([fonts])), sleep(8000)]).then(function () { tStatus(msgId, ''); window.print(); });
}

/* ---------- zoznam písomiek ---------- */
function stateBadge(state) { return el('span', { class: 'badge' + (state === 'open' ? ' open' : state === 'archived' ? ' arch' : ''), text: t('state.' + state) }); }
async function tTests() {
  var box = $('tests-list');
  box.innerHTML = ''; box.appendChild(el('p', { class: 'muted' }, [el('span', { class: 'spin' }), t('common.loading')]));
  try { await refreshInit(); } catch (e) { /* ukážeme, čo máme */ }
  tTestsList();
}
// Zoznam písomiek: pri každej jedno tlačidlo (Otvoriť, pri archivovanej Obnoviť) a ponuka ⋯ s ostatnými akciami.
function tTestsList() {
  var box = $('tests-list');
  box.innerHTML = '';
  var rows = T.init.tests.slice().reverse();
  if (!rows.length) { box.appendChild(el('p', { class: 'muted', text: t('t.no_tests') })); return; }
  var tb = el('tbody');
  rows.forEach(function (x) {
    var arch = x.state === 'archived';
    var main = arch ? el('button', { type: 'button', class: 'mini', text: t('t.restore'), onclick: function () { tRestore(x, this); } })
      : el('button', { type: 'button', class: 'mini', text: t('t.open'), onclick: function () { tOpenTest(x.id); } });
    var kebab = el('button', { type: 'button', class: 'kebab', text: '⋯', title: t('t.menu'), 'aria-label': t('t.menu_of', { title: x.title || x.id }), 'aria-haspopup': 'menu', 'aria-expanded': 'false',
      onclick: function () { menuOpen(this, testItems(x)); } });
    var when = whenText(x) + (arch && x.archived ? ' · ' + t('t.when_archived', { when: shortWhen(x.archived) }) : '');
    tb.appendChild(el('tr', { class: arch ? 'arch' : null }, [
      el('td', {}, [el('b', { text: x.title || x.id }), el('br'), el('span', { class: 'small muted', text: [when, onlyText(x)].filter(Boolean).join(' · ') }),
        x.note ? el('div', { class: 'notetxt small', text: x.note }) : null]),
      el('td', { text: x.cls }), el('td', { class: 'num', text: String(x.n) + (x.groups ? ' (A/B)' : '') }),
      el('td', {}, [stateBadge(x.state)]),
      el('td', { class: 'act' }, [main, kebab])]));
  });
  box.appendChild(el('div', { class: 'tablebox' }, [el('table', {}, [el('thead', {}, [el('tr', {}, [t('t.col_test'), t('t.col_class'), t('t.col_n'), t('t.col_state'), ''].map(function (h, i) { return el('th', { class: i === 2 ? 'num' : '', text: h }); }))]), tb])]));
}
// Náhradný termín: „náhradný termín za Geo8A · 3 žiaci“
function onlyText(x) {
  if (!x.only && !x.src) return '';
  return [x.only ? t('t.only_n', { n: x.only }) : '', x.src ? t('t.src', { src: x.src }) : ''].filter(Boolean).join(' · ');
}
function shortWhen(s) { var m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)/.exec(String(s || '')); return m ? (+m[3]) + '.' + (+m[2]) + '. ' + m[4] + ':' + m[5] : String(s || ''); }
// Archivovať a obnoviť sa dá zo zoznamu aj z prehľadu písomky; archivovaná písomka prehľad nemá, preto sa ide do zoznamu.
async function tArchive(x, btn) {
  if (btn) btn.disabled = true;
  var fromTest = T.tab === 'test';
  say(t('t.archiving', { title: x.title || x.id }));
  try {
    await api('tArchive', A({ t: x.id }));
    x.prev = x.state; x.state = 'archived'; x.archived = nowStr();
    if (fromTest) { tStatus('test-msg', ''); tTab('tests'); } else { tTestsList(); refreshInit().then(function () { if (T.tab === 'tests') tTestsList(); }).catch(function () {}); }
    tStatus('tests-msg', t('t.archived_ok', { title: x.title || x.id }), 'ok');
  } catch (e) { if (btn) btn.disabled = false; say(errText(e), 'bad'); }
}
async function tRestore(x, btn) {
  if (btn) btn.disabled = true;
  tStatus('tests-msg', t('t.restoring', { title: x.title || x.id }));
  try {
    var r = await api('tRestore', A({ t: x.id }));
    x.state = r.state || x.prev || 'closed'; x.archived = '';
    tTestsList(); tStatus('tests-msg', t('t.restored_ok', { title: x.title || x.id }), 'ok');
    refreshInit().then(function () { if (T.tab === 'tests') tTestsList(); }).catch(function () {});
  } catch (e) { if (btn) btn.disabled = false; tStatus('tests-msg', errText(e), 'bad'); }
}
async function tDeleteTest(x, btn) {
  if (!confirm(t('t.delete_confirm', { title: x.title || x.id }))) return;
  if (btn) btn.disabled = true;
  tStatus('tests-msg', t('t.deleting', { title: x.title || x.id }));
  try {
    await api('tDeleteTest', A({ t: x.id }));
    T.init.tests = T.init.tests.filter(function (y) { return y.id !== x.id; });
    if (T.init.taken) T.init.taken = T.init.taken.filter(function (k) { return k !== String(x.id).toLowerCase(); });
    tTestsList(); tStatus('tests-msg', t('t.deleted_ok', { title: x.title || x.id }), 'ok');
  } catch (e) { if (btn) btn.disabled = false; tStatus('tests-msg', errText(e), 'bad'); }
}

/* ---------- jedna písomka ---------- */
// sub: otvoriť rovno záložku ('over' | 'qs'); force: štatistiku otázok ukázať aj pred uzavretím (učiteľ ju chce vidieť z ponuky)
async function tOpenTest(id, sub, force, msg) {
  tTab('test'); $('test-body').hidden = true; tStatus('test-msg', t('common.loading'));
  try {
    var d = await apiRetry('tTest', A({ t: id, withPack: true }), 3);
    T.cur = { id: id, d: d, pack: d.pack || null, dk: d.dk || T.dk };
    T.showRes = false; $('show-res').checked = false; T.qsForce = !!force;
    if (sub) T.sub = sub;
    if (T.dz) T.sub = 'over';
    tPrepResults();
    $('test-qr').innerHTML = qrSvg(pupilUrl(id));
    $('test-qr-btn').onclick = function () { tQrShow(d.test.title || id, pupilUrl(id)); };
    $('test-dozor-btn').hidden = T.dz || !T.cur.dk;
    $('test-dozor-btn').onclick = function () { tDozorShow(tSummary()); };
    $('test-reveal-row').hidden = T.dz; $('over-export').hidden = T.dz;
    $('test-reveal').value = d.test.reveal === 'pct' ? 'pct' : 'all';
    $('test-menu').hidden = T.dz || !T.init;
    $('test-menu').onclick = function () { menuOpen(this, testItems(testRef(), true)); };
    $('test-body').hidden = false; tStatus('test-msg', '');
    tSub(T.sub); tPollStart();
    if (msg) tStatus(T.sub === 'qs' ? 'qs-msg' : 'test-msg', msg, 'ok');
  } catch (e) { tStatus('test-msg', errText(e), 'bad'); }
}
function tSummary() { var x = T.cur.d.test; return { id: x.id, title: x.title, cls: x.cls, n: (x.groups ? x.keysA : x.keys).length, total: x.total, groups: !!x.groups, dk: T.cur.dk }; }
// c: údaje písomky (predvolene práve otvorená T.cur; ponuka v zozname si ich načíta samostatne)
function keysOf(r, c) { return r && r.keys ? r.keys : (c || T.cur).d.test.keys; }
// Body a percentá žiaka podľa aktuálneho kľúča (rovnako ako skript tabuľky). Bez balíka (dozor) sa berie výsledok z tabuľky.
// Anulovaná otázka bez započítania sa vynechá aj z počtu otázok.
function resScore(r, c) {
  c = c || T.cur;
  var pack = c.pack, keys = keysOf(r, c);
  if (!pack) { var m = /([\d.,]+)\s*\/\s*(\d+)/.exec(r.points || ''); return { ok: m ? +m[1].replace(',', '.') : null, n: m ? +m[2] : keys.length, pct: typeof r.pct === 'number' ? r.pct : null }; }
  keys = keys.filter(function (k) { return !voidSkip(pack.q[k]); });
  var ok = 0; keys.forEach(function (k) { ok += ansPts(pack.q[k], r.ans[k]); });
  ok = Math.round(ok * 100) / 100;
  return { ok: ok, n: keys.length, pct: Math.max(0, (keys.length ? ok / keys.length : 0) - (r.leaves > 0 ? c.d.penalty || 0 : 0)) };
}
// Posledný odovzdaný pokus každého žiaka. res = všetky odovzdané (aj učiteľ), stat = bez učiteľa, absent = neprítomní.
function tPrepResults(c) {
  c = c || T.cur;
  var d = c.d, last = {};
  d.results.forEach(function (r) { var cur = last[r.pupilId]; if (!cur || !r.absent || cur.absent) last[r.pupilId] = r; });
  c.res = []; c.absent = {};
  Object.keys(last).forEach(function (k) { var r = last[k]; if (r.absent) c.absent[k] = r; else { r.sc = resScore(r, c); c.res.push(r); } });
  c.stat = c.res.filter(function (r) { return !r.teacher; });
}
function classAvg() { var a = T.cur.stat.filter(function (r) { return r.sc.pct !== null; }); return a.length ? a.reduce(function (s, r) { return s + r.sc.pct; }, 0) / a.length : null; }
function tRefresh() {
  return api('tTest', A({ t: T.cur.id })).then(function (d) {
    if (!T.cur || d.test.id !== T.cur.id) return;
    T.cur.d = d; tPrepResults(); tHead();
    if (T.sub === 'over') tOverview(); else tQs();
  });
}
// Obnova prehľadu každých 6 s; keď niekto čaká na vrátenie do testu, každé 3 s.
function tPollStart() {
  clearInterval(T.poll); T.pollN = 0;
  T.poll = setInterval(function () {
    if (T.tab !== 'test' || !T.cur || document.hidden) return;
    if (++T.pollN % 2 && !(T.waiting && T.waiting.length)) return;
    tRefresh().catch(function () {});
  }, 3000);
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
  $('test-toggle-hint').textContent = st === 'ready' ? t('t.ready_hint') : st === 'open' ? t('t.close_hint', { min: x.review || 15 }) : t('t.closed_hint', { min: x.review || 15 });
  $('test-meta').textContent = [t('t.class_short', { cls: x.cls }), x.bank && x.bank !== x.title ? x.bank : '', t('t.n_questions', { n: (x.groups ? x.keysA : x.keys).length }), x.groups ? t('t.groups_ab') : '', x.alt ? t('t.alt_short') : '',
    t('t.time_short', { n: x.total }), whenText(x), x.id !== x.title ? x.id : '', onlyText({ only: (x.only || []).length, src: x.src })].filter(Boolean).join(' · ');
  $('test-note').textContent = x.note ? t('t.note_label', { note: x.note }) : ''; $('test-note').hidden = !x.note || T.dz;
}
async function tToggleState() {
  var x = T.cur.d.test, next = NEXT_STATE[x.state] || 'open';
  if (next === 'closed' && !confirm(t('t.close_confirm'))) return;
  $('test-toggle').disabled = true;
  try {
    await api('tSetTest', A({ t: T.cur.id, patch: { state: next } }));
    x.state = next; if (next === 'open' && !x.started) x.started = nowStr(); tHead();
    if (T.init) T.init.tests.forEach(function (y) { if (y.id === T.cur.id) { y.state = next; if (next === 'open' && !y.started) y.started = x.started; } });
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
function tRows(c) {
  c = c || T.cur;
  var d = c.d, rows = d.pupils.map(function (p) { return { id: p.id, label: p.teacher ? t('p.teacher') : p.label, teacher: !!p.teacher, group: p.group || '', nogroup: !!p.nogroup }; });
  c.res.forEach(function (r) { if (!rows.some(function (p) { return p.id.split('#')[0] === r.pupilId; })) rows.push({ id: r.pupilId, label: r.teacher ? t('p.teacher') : r.name, teacher: r.teacher, group: r.group || '' }); });
  return rows.filter(function (p) { return !p.teacher; }).concat(rows.filter(function (p) { return p.teacher; }));
}
function resText(sc) { return sc.pct === null ? '' : fmtPct(sc.pct) + (sc.ok !== null ? ' (' + ptsFmt(sc.ok) + '/' + sc.n + ')' : ''); }
function tOverview() {
  var d = T.cur.d, x = d.test, by = {}, done = 0, writing = 0, absent = 0, total = 0, tb = el('tbody'), seen = {}, list = [], waiting = [];
  T.cur.res.forEach(function (r) { by[r.pupilId] = r; });
  tRows().forEach(function (p) {
    var key = p.id.split('#')[0], r = seen[key] ? null : by[key], L = d.logins.p[p.id], ab = !r && !L && !!T.cur.absent[key], st, cls = '', btn = null;
    if (r && L && !L.done) r = null;   // odovzdal, ale znova píše (pridaný čas alebo nový pokus)
    seen[key] = 1;
    if (!p.teacher) total++;
    var pr = d.prog && d.prog[p.id], n = (x.groups && p.group === 'B' ? x.keysB : x.groups ? x.keysA : x.keys).length;
    if (r) { st = t('t.st_done', { time: (/(\d\d:\d\d)/.exec(r.sent) || [])[1] || '' }); cls = 'ok'; if (!p.teacher) done++; }
    else if (L) { st = pr ? t('t.st_writing_n', { time: String(L.t).slice(0, 5), n: pr.n, total: n }) : t('t.st_writing', { time: String(L.t).slice(0, 5) }); if (!p.teacher) writing++; }
    else if (ab) { st = t('t.st_absent'); cls = 'absent'; absent++; }
    else st = t('t.st_none');
    var flags = r && r.flag ? [r.flag] : d.logins.f.filter(function (f) { return f.p === p.id; }).map(function (f) { return f.k + ' ' + f.t; });
    if (!r && pr && pr.sh) flags.push(t('t.short_n', { n: pr.sh }));
    if (!r && L && pr && pr.rw) st = t('t.st_reopen');
    // zamknutý alebo práve mimo testu: čaká na učiteľa (vrátiť, vrátiť so strhnutím, ukončiť)
    var wait = !!(L && !r && pr && (pr.lock || pr.away));
    if (wait) {
      st = t(pr.lock ? 't.st_lock' : 't.st_away', { time: pr.lock || pr.away, why: pr.why || '' }); cls = 'bad';
      waiting.push({ id: p.id, label: p.label });
      btn = [el('button', { type: 'button', class: 'mini primary', text: t('t.ret_ok'), onclick: function () { tReturn(p, 'ok', this); } }),
        pr.lv ? null : el('button', { type: 'button', class: 'mini', text: t('t.ret_pen', { pct: Math.round((d.penalty || 0) * 100) }), onclick: function () { tReturn(p, 'pen', this); } }),
        el('button', { type: 'button', class: 'mini', text: t('t.ret_end'), onclick: function () { tReturn(p, 'end', this); } })];
    }
    else if (L) btn = el('button', { type: 'button', class: 'mini', text: r ? t('t.allow_retry') : t('t.unlock'), onclick: function () {
      if (r && !confirm(t('t.retry_confirm', { name: p.label }))) return;
      api('tUnlock', A({ t: T.cur.id, p: p.id })).then(function () { delete d.logins.p[p.id]; tOverview(); }).catch(function (e) { tStatus('test-msg', errText(e), 'bad'); });
    } });
    // pridať čas: žiak, ktorý začal písať a ešte neodovzdal (aj zamknutý); koľko už dostal, je pri stave
    // aj tomu, kto už odovzdal: test sa mu znova otvorí s jeho odpoveďami
    var writes = !!(L && !r && pr && pr.left !== null && pr.left !== undefined), again = !!(r && L && L.done && d.again && d.again[p.id]);
    if (x.state === 'open' && (writes || again)) {
      if (writes && pr.ad) st += ' · ' + t('t.added', { n: pr.ad });
      btn = [el('button', { type: 'button', class: 'mini', text: t('t.add_time', { n: d.addMin || 2 }), title: t(again ? 't.add_again_hint' : 't.add_time_hint', { n: d.addMin || 2 }),
        onclick: function () { if (again && !confirm(t('t.add_again_confirm', { name: p.label, n: d.addMin || 2 }))) return; tAddTime(p.id, this); } })].concat(btn);
    }
    else if (!r && !p.teacher) btn = el('button', { type: 'button', class: 'mini', text: ab ? t('t.unmark_absent') : t('t.mark_absent'), onclick: function () { tAbsent(p, !ab, this); } });
    // písomka jedného žiaka ako PDF na Disk (napr. na rozhovor s rodičom); rovnomenný súbor sa nahradí
    if (r && !T.dz) btn = [].concat(btn, [el('button', { type: 'button', class: 'mini', text: t('t.pdf'), title: t('t.pdf_hint'), onclick: function () { tExportOne(r, p.label, this); } })]);
    list.push({ p: p, r: r, st: st, cls: cls, flags: flags, btn: btn, wait: wait });
  });
  // stĺpec Príznak len vtedy, keď nejaký príznak je (na telefóne by inak tabuľka nevošla)
  var anyFlag = list.some(function (o) { return o.flags.length; });
  list.forEach(function (o) {
    var nm = el('td', {}, [o.p.label, x.groups && o.p.group && !o.p.teacher ? el('span', { class: 'badge' + (o.p.nogroup ? ' warn' : ''), style: 'margin-left:6px', title: o.p.nogroup ? t('t.no_group') : null, text: o.p.group }) : null]);
    var cells = [nm, el('td', { class: o.cls, text: o.st })];
    if (T.showRes) cells.push(el('td', { class: 'num', text: o.r ? resText(o.r.sc) : '' }));
    if (anyFlag) cells.push(el('td', { class: o.flags.length ? 'bad small' : 'small', text: o.flags.join('; ') }));
    cells.push(el('td', { class: 'act' }, [].concat(o.btn)));
    tb.appendChild(el('tr', { class: o.wait ? 'wait' : null }, cells));
  });
  tWaiting(waiting);
  var addAll = $('over-add');
  addAll.hidden = !(x.state === 'open' && list.some(function (o) { var pr = d.prog && d.prog[o.p.id]; return !o.r && d.logins.p[o.p.id] && pr && pr.left !== null && pr.left !== undefined; }));
  addAll.textContent = t('t.add_time_all', { n: d.addMin || 2 });
  $('over-sum').textContent = t('t.over_sum', { done: done, total: total - absent, writing: writing }) + (absent ? ' ' + t('t.over_absent', { n: absent }) : '');
  var heads = [t('t.col_pupil'), t('t.col_status')].concat(T.showRes ? [t('t.col_result')] : []).concat(anyFlag ? [t('t.col_flag')] : []).concat(['']);
  var box = $('over-table'); box.innerHTML = '';
  box.appendChild(el('table', {}, [el('thead', {}, [el('tr', {}, heads.map(function (h, i) { return el('th', { class: T.showRes && i === 2 ? 'num' : '', text: h }); }))]), tb]));
  var rv = reviewCount();
  $('over-review').hidden = !rv.n;
  if (rv.n) $('over-review-t').textContent = t('t.review_wait', { n: rv.n });
  var avg = classAvg();
  $('avg-pct').textContent = avg === null ? '–' : fmtPct(avg);
  $('avg-note').textContent = avg === null ? t('t.no_results') : t('t.avg_note', { pct: Math.round((d.penalty || 0) * 100) });
}
// Žiaci, ktorí čakajú na vrátenie do testu: upozornenie nad tabuľkou, počet v názve karty a pípnutie pri novom.
function tWaiting(list) {
  var old = T.waiting || [], fresh = list.some(function (w) { return !old.some(function (o) { return o.id === w.id; }); });
  T.waiting = list;
  $('over-lock').hidden = !list.length;
  if (list.length) $('over-lock').textContent = t('t.lock_wait', { names: list.map(function (w) { return w.label; }).join(', ') });
  document.title = (list.length ? '(' + list.length + ') ' : '') + document.title.replace(/^\(\d+\) /, '');
  if (fresh) tBeep();
}
function tBeep() {
  try {
    var c = T.ac || (T.ac = new (window.AudioContext || window.webkitAudioContext)()), o = c.createOscillator(), g = c.createGain();
    o.frequency.value = 880; g.gain.value = 0.12; o.connect(g); g.connect(c.destination);
    o.start(); o.stop(c.currentTime + 0.25);
  } catch (e) { /* bez zvuku */ }
}
async function tReturn(p, m, btn) {
  if (m === 'end' && !confirm(t('t.end_confirm', { name: p.label }))) return;
  if (btn) btn.disabled = true;
  try { await api('tReturn', A({ t: T.cur.id, p: p.id, m: m })); await tRefresh(); }
  catch (e) { tStatus('test-msg', errText(e), 'bad'); if (btn) btn.disabled = false; }
}
// Pridať čas jednému žiakovi (id) alebo všetkým, ktorí práve píšu ('*'). Dá sa ťukať opakovane.
async function tAddTime(pid, btn) {
  if (pid === '*' && !confirm(t('t.add_all_confirm', { n: T.cur.d.addMin || 2 }))) return;
  if (btn) btn.disabled = true;
  try { await api('tAddTime', A({ t: T.cur.id, p: pid })); await tRefresh(); }
  catch (e) { tStatus('test-msg', errText(e), 'bad'); }
  if (btn) btn.disabled = false;
}
// Odpovede na dopísanie, ktoré čakajú na kontrolu učiteľom (bez učiteľa).
function reviewCount() {
  var pack = T.cur.pack, n = 0;
  if (!pack) return { n: 0 };
  T.cur.stat.forEach(function (r) { keysOf(r).forEach(function (k) { var q = pack.q[k]; if (q && q.text && gradeAns(q, r.ans[k]) === 'review') n++; }); });
  return { n: n };
}
async function tAbsent(p, on, btn) {
  if (btn) btn.disabled = true;
  try { await api('tAbsent', A({ t: T.cur.id, p: p.id, on: on })); await tRefresh(); }
  catch (e) { tStatus('test-msg', errText(e), 'bad'); if (btn) btn.disabled = false; }
}
// Žiaci triedy podľa abecedy (ako v hárku výsledkov), bez učiteľa.
function sortedRows(c) { return tRows(c).filter(function (p) { return !p.teacher; }).sort(function (a, b) { return a.label.localeCompare(b.label, 'sk'); }); }
// Výsledky do Excelu: meno, (skupina), body a percentá (bez učiteľa), neprítomní s textom. Žiaci podľa abecedy.
function tCopyResults() {
  var g = !!T.cur.d.test.groups, by = {}, seen = {}, lines = [[t('t.tsv_pupil')].concat(g ? [t('t.tsv_group')] : [], [t('t.tsv_points'), t('t.tsv_result')]).join('\t')];
  T.cur.res.forEach(function (r) { by[r.pupilId] = r; });
  sortedRows().forEach(function (p) {
    var key = p.id.split('#')[0]; if (p.teacher || seen[key]) return; seen[key] = 1;
    var r = by[key], ab = T.cur.absent[key];
    lines.push([p.label].concat(g ? [r ? r.group : p.group] : [], r ? [r.sc.ok === null ? '' : ptsFmt(r.sc.ok), r.sc.pct === null ? '' : Math.round(r.sc.pct * 100)] : [ab ? t('t.st_absent') : '', '']).join('\t'));
  });
  copyText(lines.join('\n'), 'over-msg', t('t.copied_results'));
}
// Písomky všetkých žiakov (bez učiteľa) ako PDF na Disk: jeden žiak = jedna požiadavka, aby bolo vidno postup.
async function tExportAll() {
  var rs = T.cur.stat.slice().sort(function (a, b) { return a.name.localeCompare(b.name, 'sk'); }), folder = '', btn = $('over-export');
  if (!rs.length) { tStatus('over-msg', t('t.no_results'), 'bad'); return; }
  btn.disabled = true;
  try {
    for (var i = 0; i < rs.length; i++) {
      tStatus('over-msg', t('t.export_progress', { i: i + 1, n: rs.length }));
      folder = (await apiRetry('tExportPupil', A({ t: T.cur.id, row: rs[i].row, n: rs[i].name, sent: rs[i].sent }), 3)).folderUrl;
    }
    $('over-msg').innerHTML = esc(t('t.export_done', { n: rs.length })) + ' <a target="_blank" rel="noopener" href="' + esc(folder) + '">' + esc(t('t.open_folder')) + '</a>';
    $('over-msg').className = 'small ok'; $('over-msg').hidden = false;
  } catch (e) { tStatus('over-msg', t('t.export_failed', { msg: errText(e) }), 'bad'); }
  btn.disabled = false;
}

async function tExportOne(r, label, btn) {
  btn.disabled = true; tStatus('over-msg', t('t.export_one', { name: label }));
  try {
    var s = await apiRetry('tExportPupil', A({ t: T.cur.id, row: r.row, n: r.name, sent: r.sent }), 3);
    $('over-msg').innerHTML = esc(t('t.export_one_done')) + ' <a target="_blank" rel="noopener" href="' + esc(s.url) + '">' + esc(s.name || label) + '</a> · <a target="_blank" rel="noopener" href="' + esc(s.folderUrl) + '">' + esc(t('t.open_folder')) + '</a>';
    $('over-msg').className = 'small ok'; $('over-msg').hidden = false;
  } catch (e) { tStatus('over-msg', t('t.export_failed', { msg: errText(e) }), 'bad'); }
  btn.disabled = false;
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
  $('qs-text-hint').hidden = !x.keys.some(function (k) { return pack.q[k] && pack.q[k].text; });
  $('qs-void-hint').hidden = T.dz || !T.feat;
  var items = x.keys.map(function (k) {
    var q = pack.q[k];
    if (q.num) return numItem(k, q);
    if (q.text) return textItem(k, q);
    var cnt = q.opts.map(function () { return 0; }), none = 0, n = 0, ok = 0;
    T.cur.stat.forEach(function (r) {
      if (keysOf(r).indexOf(k) < 0) return;
      n++; var a = r.ans[k];
      if (typeof a === 'number' && a < cnt.length) { cnt[a]++; if (a === q.ok) ok++; } else none++;
    });
    return { k: k, q: q, cnt: cnt, none: none, n: n, ok: ok, p: n ? ok / n : null };
  });
  // najprv otázky s odpoveďami na kontrolu, potom od najťažšej
  items.sort(function (a, b) { return (b.rev ? 1 : 0) - (a.rev ? 1 : 0) || (a.p === null ? 2 : a.p) - (b.p === null ? 2 : b.p); });
  var box = $('qs-list'); box.innerHTML = '';
  items.forEach(function (it) {
    if (it.q.num) { box.appendChild(numCard(it)); return; }
    if (it.q.text) { box.appendChild(textCard(it)); return; }
    var max = Math.max(1, it.n), rows = it.q.opts.map(function (o, i) {
      var good = i === it.q.ok;
      var letter = good ? el('b', { text: LETTERS[i] }) : el('button', { type: 'button', text: LETTERS[i], title: t('t.fix_hint'), onclick: function () { tFixKey(it, i); } });
      return el('div', { class: 'drow' + (good ? ' ok' : '') }, [letter, el('span', { class: 'tx', text: o + (good ? ' ✓' : '') }), el('div', { class: 'bar' }, [el('i', { style: 'width:' + (it.cnt[i] / max * 100) + '%' })]), el('span', { class: 'n', text: String(it.cnt[i]) })]);
    });
    if (it.none) rows.push(el('div', { class: 'drow' }, [el('span', { text: '–' }), el('span', { class: 'tx muted', text: t('t.qs_none') }), el('div', { class: 'bar' }, [el('i', { style: 'width:' + (it.none / max * 100) + '%' })]), el('span', { class: 'n', text: String(it.none) })]));
    box.appendChild(el('div', { class: 'qs' }, [
      el('div', { class: 'top row' }, [el('div', { class: 'qq' }, [el('small', { text: qTag(it.k) }), it.q.q, voidCtl(it)]), el('div', { class: 'pc', text: it.p === null ? '–' : fmtPct(it.p) })]),
      el('div', { class: 'small muted', text: t('t.qs_count', { n: it.n }) }),
      el('div', { class: 'dist' }, rows)]));
  });
}
// Číselná otázka: odpovede žiakov (rovnaké číslo sa zlúči) od najbližšej k správnej, s bodmi; úspešnosť = priemer bodov.
function numItem(k, q) {
  var groups = {}, none = 0, n = 0, sum = 0;
  T.cur.stat.forEach(function (r) {
    if (keysOf(r).indexOf(k) < 0) return;
    n++;
    var a = r.ans[k], st = gradeAns(q, a);
    if (st === 'none') { none++; return; }
    var p = numPts(q, a), x = numParse(a), key = x === null ? '?' + ansKey(a) : String(x);   // štatistika: skutočné body, aj pri anulovanej
    sum += p;
    var g = groups[key] = groups[key] || { x: x, raw: x === null ? a : numFmt(x), n: 0, p: p, st: st };
    g.n++;
  });
  var list = Object.keys(groups).map(function (key) { return groups[key]; }).sort(function (a, b) {
    if (a.x === null || b.x === null) return (a.x === null) - (b.x === null);
    return Math.abs(a.x - q.val) - Math.abs(b.x - q.val);
  });
  return { k: k, q: q, n: n, none: none, list: list, p: n ? sum / n : null };
}
function numCard(it) {
  var max = Math.max(1, it.n), q = it.q;
  var rows = it.list.map(function (g) {
    return el('div', { class: 'drow nrow ' + g.st }, [el('span', { class: 'tx', text: g.raw }),
      el('div', { class: 'bar' }, [el('i', { style: 'width:' + (g.n / max * 100) + '%' })]), el('span', { class: 'n', text: String(g.n) }),
      el('span', { class: 'p', text: t('common.pts', { v: ptsFmt(g.p) }) })]);
  });
  if (it.none) rows.push(el('div', { class: 'drow nrow' }, [el('span', { class: 'tx muted', text: t('t.qs_none') }), el('div', { class: 'bar' }, [el('i', { style: 'width:' + (it.none / max * 100) + '%' })]), el('span', { class: 'n', text: String(it.none) }), el('span')]));
  if (!rows.length) rows.push(el('p', { class: 'small muted', text: t('t.no_results') }));
  return el('div', { class: 'qs' }, [
    el('div', { class: 'top row' }, [el('div', { class: 'qq' }, [el('small', { text: qTag(it.k) }), q.q, el('span', { class: 'badge g', text: t('t.num_badge') }), voidCtl(it)]),
      el('div', { class: 'pc', title: t('t.num_avg'), text: it.p === null ? '–' : fmtPct(it.p) })]),
    el('div', { class: 'small muted' }, [t('t.qs_count', { n: it.n }), ' · ', t('t.acc_list'), ' ', el('b', { class: 'ok', text: numText(q) })]),
    el('div', { class: 'dist' }, rows)]);
}
// Otázka s dopisovaním: rôzne odpovede žiakov (rovnaké po úprave sa zlúčia) s počtom a hodnotením.
function textItem(k, q) {
  var groups = {}, none = 0, n = 0, ok = 0, rev = 0;
  T.cur.stat.forEach(function (r) {
    if (keysOf(r).indexOf(k) < 0) return;
    n++;
    var a = r.ans[k], st = gradeAns(q, a);
    if (st === 'none') { none++; return; }
    if (st === 'ok') ok++;
    if (st === 'review') rev++;
    var key = ansKey(a), g = groups[key] = groups[key] || { key: key, n: 0, forms: {}, st: st };
    g.n++; g.forms[a] = (g.forms[a] || 0) + 1;
  });
  var order = { review: 0, bad: 1, ok: 2 }, list = Object.keys(groups).map(function (key) {
    var g = groups[key], forms = Object.keys(g.forms).sort(function (a, b) { return g.forms[b] - g.forms[a]; });
    g.raw = forms[0]; g.more = forms.slice(1);
    g.added = (q.add || []).some(function (x) { return ansKey(x) === key; });
    g.rejected = (q.rej || []).indexOf(key) >= 0;
    return g;
  }).sort(function (a, b) { return order[a.st] - order[b.st] || b.n - a.n; });
  return { k: k, q: q, n: n, ok: ok, none: none, rev: rev, list: list, p: n ? ok / n : null };
}
function textCard(it) {
  var max = Math.max(1, it.n), q = it.q;
  var act = function (g, op, label, cls) { return el('button', { type: 'button', class: 'mini' + (cls ? ' ' + cls : ''), text: label, onclick: function () { tTextAns(it, g, op, this); } }); };
  var rows = it.list.map(function (g) {
    var icon = g.st === 'ok' ? '✓' : g.st === 'review' ? '?' : '✗', btns = [];
    if (g.st === 'review') { btns.push(act(g, 'accept', t('t.acc_yes'), 'primary')); btns.push(act(g, 'reject', t('t.acc_no'))); }
    else if (g.st === 'bad') { btns.push(g.rejected ? act(g, 'reset', t('t.acc_undo')) : null); btns.push(act(g, 'accept', t('t.acc_yes'))); }
    else if (g.added) btns.push(act(g, 'reset', t('t.acc_undo')));
    var label = g.raw + (g.more.length ? ' (' + t('t.acc_forms', { forms: g.more.slice(0, 3).join(', ') + (g.more.length > 3 ? ', …' : '') }) + ')' : '');
    return el('div', { class: 'drow trow ' + g.st }, [el('span', { class: 'ic', text: icon }), el('span', { class: 'tx', text: label }),
      el('div', { class: 'bar' }, [el('i', { style: 'width:' + (g.n / max * 100) + '%' })]), el('span', { class: 'n', text: String(g.n) }), el('span', { class: 'act' }, btns)]);
  });
  if (it.none) rows.push(el('div', { class: 'drow trow' }, [el('span', { text: '–' }), el('span', { class: 'tx muted', text: t('t.qs_none') }), el('div', { class: 'bar' }, [el('i', { style: 'width:' + (it.none / max * 100) + '%' })]), el('span', { class: 'n', text: String(it.none) }), el('span')]));
  if (!rows.length) rows.push(el('p', { class: 'small muted', text: t('t.no_results') }));
  return el('div', { class: 'qs' + (it.rev ? ' hasrev' : '') }, [
    el('div', { class: 'top row' }, [el('div', { class: 'qq' }, [el('small', { text: qTag(it.k) }), q.q, el('span', { class: 'badge g', text: t('t.text_badge') }), voidCtl(it)]), el('div', { class: 'pc', text: it.p === null ? '–' : fmtPct(it.p) })]),
    el('div', { class: 'small muted' }, [t('t.qs_count', { n: it.n }), ' · ', t('t.acc_list'), ' ', el('b', { class: 'ok', text: ansAccepted(q).join('; ') })]
      .concat(it.rev ? [' · ', el('b', { class: 'bad', text: t('t.rev_n', { n: it.rev }) })] : [])),
    el('div', { class: 'dist' }, rows)]);
}
// Uznať / zamietnuť / zrušiť rozhodnutie pri jednej odpovedi (všetci žiaci, ktorí ju napísali rovnako po úprave).
async function tTextAns(it, g, op, btn) {
  document.querySelectorAll('#qs-list .trow button').forEach(function (b) { b.disabled = true; });
  tStatus('qs-msg', t('common.loading'));
  try {
    var r = await api('tTextAns', A({ t: T.cur.id, q: it.k, txt: g.raw, op: op }));
    if (r.q) T.cur.pack.q[it.k] = r.q;
    tPrepResults(); tQs();
    var msg = t(op === 'accept' ? 't.acc_done' : op === 'reject' ? 't.rej_done' : 't.undo_done', { a: g.raw, n: r.n || 0 });
    if (op === 'accept') msg += ' ' + t(r.sheet ? 't.acc_sheet' : 't.acc_nosheet');
    tStatus('qs-msg', msg, 'ok');
  } catch (e) { tStatus('qs-msg', errText(e), 'bad'); tQs(); }
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

/* ---------- ponuka ⋯ pri písomke ---------- */
// Jedna ponuka pre zoznam aj prehľad písomky. Položka: {label, run, disabled, hint (prečo je vypnutá), danger} alebo {sep: 1}.
var MENU = { btn: null };
function menuOpen(btn, items) {
  if (MENU.btn === btn) { menuClose(true); return; }
  menuClose();
  var m = $('menu'); m.innerHTML = '';
  items.forEach(function (it) {
    if (!it) return;
    if (it.sep) { if (m.lastChild && !m.lastChild.classList.contains('sep')) m.appendChild(el('div', { class: 'sep', role: 'separator' })); return; }
    m.appendChild(el('button', { type: 'button', role: 'menuitem', class: it.danger ? 'danger' : null, disabled: !!it.disabled, onclick: function () { menuClose(); it.run(); } },
      [el('span', { text: it.label }), it.disabled && it.hint ? el('small', { text: it.hint }) : null]));
  });
  while (m.lastChild && m.lastChild.classList.contains('sep')) m.lastChild.remove();
  m.hidden = false; MENU.btn = btn; btn.setAttribute('aria-expanded', 'true');
  // pod tlačidlom, zarovnané k jeho pravému okraju; keď sa dole nezmestí, nad ním
  var r = btn.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight;
  var top = r.bottom + 4;
  if (top + mh > vh - 8) top = r.top - mh - 4 >= 8 ? r.top - mh - 4 : Math.max(8, vh - mh - 8);
  // ponuka je v stránke (posúva sa s ňou), preto súradnice okna + posunutie stránky
  m.style.left = (Math.max(8, Math.min(r.right - mw, vw - mw - 8)) + window.scrollX) + 'px'; m.style.top = (top + window.scrollY) + 'px';
  var first = m.querySelector('button:not([disabled])'); if (first) first.focus();
}
function menuClose(focus) {
  var m = $('menu'), b = MENU.btn;
  if (m.hidden) return;
  m.hidden = true; m.innerHTML = ''; MENU.btn = null;
  if (b) { b.setAttribute('aria-expanded', 'false'); if (focus) b.focus(); }
}
// Akcie písomky x (záznam zo zoznamu). inView: ponuka v prehľade písomky (bez Otvoriť a so štatistikou ako záložkou).
function testItems(x, inView) {
  var arch = x.state === 'archived', open = x.state === 'open', title = x.title || x.id;
  var need = function (it) { if (!T.feat) { it.disabled = true; it.hint = t('t.need_script', { v: FEAT_SCRIPT }); } return it; };
  return [
    arch ? null : { label: t('t.m_stats'), run: function () { if (inView) { T.qsForce = true; tSub('qs'); } else tOpenTest(x.id, 'qs', true); } },
    arch ? null : { label: t('t.m_preview'), run: function () { tPupilPreview(x); } },
    arch ? null : { label: t('t.m_print'), run: function () { tPrintDlg(x); } },
    { sep: 1 },
    { label: t('t.m_open_qs'), run: function () { openSheet(x, 'qs'); } },
    { label: t(arch ? 't.m_open_arch' : 't.m_open_res'), run: function () { openSheet(x, 'res'); } },
    { sep: 1 },
    arch ? null : { label: t('t.m_grades'), run: function () { tGradesDlg(x); } },
    arch ? null : need({ label: t('t.m_recalc'), run: function () { tRecalcDlg(x); } }),
    arch ? null : need({ label: t('t.m_void'), run: function () { if (inView) { T.qsForce = true; tSub('qs'); tStatus('qs-msg', t('t.void_pick'), 'ok'); } else tOpenTest(x.id, 'qs', true, t('t.void_pick')); } }),
    { sep: 1 },
    need({ label: t('t.m_note'), run: function () { tNoteDlg(x); } }),
    need({ label: t('t.m_rename'), disabled: open, hint: open ? t('t.rename_open_hint') : '', run: function () { tRenameDlg(x); } }),
    need({ label: t('t.m_duplicate'), run: function () { tDupDlg(x); } }),
    { sep: 1 },
    arch ? { label: t('t.restore'), run: function () { tRestore(x); } }
      : { label: t('t.archive'), disabled: open, hint: open ? t('t.archive_open_hint') : '', run: function () { if (confirm(t('t.archive_confirm', { title: title }))) tArchive(x); } },
    arch ? { label: t('t.delete'), danger: true, run: function () { tDeleteTest(x); } } : null
  ];
}
// Záznam písomky zo zoznamu pre práve otvorený prehľad (stav a poznámka z prehľadu sú novšie).
function testRef() {
  var d = T.cur.d.test, x = (T.init && T.init.tests || []).filter(function (y) { return y.id === T.cur.id; })[0];
  if (!x) { x = { id: d.id, title: d.title, cls: d.cls, bank: d.bank, n: (d.groups ? d.keysA : d.keys).length, groups: d.groups, alt: d.alt, total: d.total, created: d.created, started: d.started }; if (T.init) T.init.tests.push(x); }
  x.state = d.state; x.note = d.note || ''; x.total = d.total;
  return x;
}
async function refreshInit() {
  var init = await apiRetry('tInit', A(), 2);
  ['tests', 'taken', 'classes', 'groups', 'bank', 'qGid', 'ssId', 'grades', 'sheetUrl'].forEach(function (k) { if (init[k] !== undefined) T.init[k] = init[k]; });
  T.feat = cmpVer(init.v, FEAT_SCRIPT) >= 0;
  return T.init;
}
// Hlásenie pod zoznamom alebo pod hlavičkou písomky, podľa toho, kde učiteľ je.
function say(msg, cls) { tStatus(T.tab === 'test' ? 'test-msg' : 'tests-msg', msg, cls); }
// Údaje písomky (žiaci, výsledky, balík) pre akciu z ponuky: z otvoreného prehľadu, inak sa načítajú.
async function curFor(id) {
  if (T.cur && T.cur.id === id && T.cur.pack) return T.cur;
  var d = await apiRetry('tTest', A({ t: id, withPack: true }), 3);
  var c = { id: id, d: d, pack: d.pack || null, dk: d.dk };
  tPrepResults(c);
  return c;
}

/* ---------- okno s otázkou (dialóg) ---------- */
// o: {title, body: [prvky], buttons: [{text, primary, danger, run: async () => true = nechať okno otvorené}]}
var DLG = { busy: false, onclose: null };
function dlgOpen(o) {
  menuClose();
  $('dlg-title').textContent = o.title;
  var body = $('dlg-body'); body.innerHTML = '';
  [].concat(o.body || []).forEach(function (n) { if (n) body.appendChild(typeof n === 'string' ? el('p', { text: n }) : n); });
  dlgMsg(''); dlgButtons(o.buttons || [{ text: t('common.close') }]);
  DLG.busy = false; DLG.onclose = o.onclose || null;
  $('dlg').hidden = false;
  // na telefóne nie do políčka (klávesnica by zakryla okno), len na tlačidlo
  var touch = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  var f = (!touch && body.querySelector('input:not([type=radio]):not([type=checkbox]),textarea')) || $('dlg-btns').querySelector('button.primary:not([disabled])') || $('dlg-btns').querySelector('button');
  if (f) setTimeout(function () { f.focus({ preventScroll: true }); if (f.tagName === 'INPUT' && f.select) f.select(); }, 0);
}
function dlgButtons(list) {
  var row = $('dlg-btns'); row.innerHTML = '';
  list.forEach(function (b) {
    if (!b) return;
    var btn = el('button', { type: 'button', class: [b.primary ? 'primary' : '', b.danger ? 'danger' : ''].join(' ').trim() || null, text: b.text });
    btn.onclick = async function () {
      if (!b.run) { dlgClose(); return; }
      dlgBusy(true); dlgMsg(b.wait || t('common.working'));
      var keep;
      try { keep = await b.run(btn); if (keep !== true) dlgMsg(''); } catch (e) { dlgMsg(errText(e), 'bad'); keep = true; }
      dlgBusy(false);
      if (keep !== true) dlgClose();
    };
    b.el = btn; row.appendChild(btn);
  });
}
function dlgBusy(on) { DLG.busy = on; $('dlg-btns').querySelectorAll('button').forEach(function (b) { b.disabled = on || b.dataset.off === '1'; }); }
function dlgOff(btn, off) { if (!btn) return; btn.dataset.off = off ? '1' : ''; btn.disabled = !!off || DLG.busy; }
function dlgMsg(m, cls) { tStatus('dlg-msg', m, cls); }
function dlgClose() {
  if (DLG.busy) return;
  $('dlg').hidden = true; $('dlg-body').innerHTML = ''; $('dlg-btns').innerHTML = '';
  var f = DLG.onclose; DLG.onclose = null; if (f) f();
}
function field(label, input, extra) { return el('label', {}, [el('span', { text: label }), input].concat(extra || [])); }
function radios(name, opts, val, onchange) {
  return el('div', { class: 'chips' }, opts.map(function (o) {
    var inp = el('input', { type: 'radio', name: name, value: o[0] }); inp.checked = o[0] === val; if (o[2]) inp.disabled = true;
    inp.onchange = function () { if (onchange) onchange(o[0]); };
    return el('label', { class: 'chip' }, [inp, ' ' + o[1]]);
  }));
}
function radioVal(box) { var c = box.querySelector('input:checked'); return c ? c.value : ''; }
function checkbox(label, val) { var inp = el('input', { type: 'checkbox' }); inp.checked = !!val; return { inp: inp, el: el('label', { class: 'chip' }, [inp, ' ' + label]) }; }

/* ---------- otvoriť v tabuľke ---------- */
function sheetHref(gid, row) {
  var base = T.init && T.init.ssId ? 'https://docs.google.com/spreadsheets/d/' + T.init.ssId + '/edit' : String(T.init && T.init.sheetUrl || '').split('#')[0];
  return base + (gid !== null && gid !== undefined ? '#gid=' + gid + (row ? '&range=A' + row : '') : '');
}
// Otázky: hárok Otázky na prvom riadku testu; výsledky: hárok Res_…, pri archivovanej Archív na jej prvom riadku.
function openSheet(x, what) {
  var L = x.link || {}, url;
  if (what === 'qs') url = sheetHref(T.init.qGid, L.qRow);
  else if (x.state === 'archived') url = sheetHref(L.aGid, L.aRow);
  else url = sheetHref(L.gid, 0);
  if (!x.link) say(t('t.link_old'), 'muted');
  window.open(url, '_blank', 'noopener');
}

/* ---------- premenovať ---------- */
function tRenameDlg(x) {
  var inp = el('input', { maxlength: '40', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' }), msg = el('span', { class: 'small bad', style: 'font-weight:400', hidden: true });
  inp.value = x.id;
  var go = { text: t('t.rename_go'), primary: true, wait: t('t.renaming'), run: async function () {
    var name = inp.value.trim();
    if (nameErr(name, x.id)) return true;
    if (name === x.id) return;
    var r = await api('tRename', A({ t: x.id, name: name }));
    var old = x.id;
    x.id = x.title = r.id;
    (T.init.taken = T.init.taken || []).push(r.id.toLowerCase());
    var m = t('t.renamed_ok', { old: old, title: r.id }) + (r.drive === 'exists' ? ' ' + t('t.renamed_drive_exists') : r.drive === 'error' ? ' ' + t('t.renamed_drive_err') : '');
    if (T.cur && T.cur.id === old) { tOpenTest(r.id, T.sub, T.qsForce, m); }
    else { tTestsList(); say(m, 'ok'); }
    refreshInit().then(function () { if (T.tab === 'tests') tTestsList(); }).catch(function () {});
  } };
  var check = function () {
    var e = nameErr(inp.value.trim(), x.id);
    inp.classList.toggle('invalid', !!e && e !== 'empty');
    msg.textContent = e ? t('t.name_' + e, { max: (T.init && T.init.nameMax) || NAME_MAX }) : ''; msg.hidden = !e;
    dlgOff(go.el, !!e || inp.value.trim() === x.id);
  };
  inp.oninput = check;
  inp.onkeydown = function (e) { if (e.key === 'Enter' && !go.el.disabled) go.el.click(); };
  dlgOpen({ title: t('t.rename_title', { title: x.title || x.id }), body: [field(t('t.title'), inp, [msg]), el('p', { class: 'small muted', text: t('t.rename_hint') })],
    buttons: [go, { text: t('common.cancel') }] });
  check();
}

/* ---------- poznámka ---------- */
function tNoteDlg(x) {
  var ta = el('textarea', { rows: '4', maxlength: '500' }); ta.value = x.note || '';
  dlgOpen({ title: t('t.note_title', { title: x.title || x.id }), body: [field(t('t.note_field'), ta), el('p', { class: 'small muted', text: t('t.note_hint') })],
    buttons: [{ text: t('common.save'), primary: true, run: async function () {
      var r = await api('tNote', A({ t: x.id, note: ta.value }));
      x.note = r.note;
      if (T.cur && T.cur.id === x.id) { T.cur.d.test.note = r.note; tHead(); }
      if (T.tab === 'tests') tTestsList();
      say(t(r.note ? 't.note_saved' : 't.note_removed'), 'ok');
    } }, { text: t('common.cancel') }] });
}

/* ---------- duplikovať / náhradný termín ---------- */
// Voľný názov: Geo8A_N, Geo8A_N2, … (náhradný termín) alebo Geo8A_2, Geo8A_3, …
function freeName(base, sfx) {
  var max = (T.init && T.init.nameMax) || NAME_MAX;
  for (var i = 1; i < 100; i++) {
    var tail = sfx === 'N' ? '_N' + (i > 1 ? i : '') : '_' + (i + 1), v = base.slice(0, max - tail.length) + tail;
    if (!nameTaken(v)) return v;
  }
  return '';
}
function classHasGroups(cls) { var g = (T.init.groups || {})[cls]; return !!(g && g.A > 0 && g.B > 0); }
async function tDupDlg(x) {
  var groups = !!x.groups, title = x.title || x.id;
  var nameIn = el('input', { maxlength: '40', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' }), nameMsg = el('span', { class: 'small bad', style: 'font-weight:400', hidden: true });
  var touched = false;
  nameIn.oninput = function () { touched = true; check(); };
  var clsSel = el('select');
  Object.keys(T.init.classes || {}).sort(function (a, b) { return a.localeCompare(b, I18N.lang, { numeric: true }); })
    .forEach(function (c) { clsSel.appendChild(el('option', { value: c, text: t('t.class_opt', { cls: c, n: T.init.classes[c].length }) })); });
  if (!T.init.classes[x.cls]) clsSel.appendChild(el('option', { value: x.cls, text: x.cls }));
  clsSel.value = x.cls;
  var timeIn = el('input', { type: 'number', min: '1', max: '240', inputmode: 'numeric' }); timeIn.value = x.total || 15;
  var missInfo = el('p', { class: 'small muted' });
  var whoBox = radios('dup-who', [['all', t('t.dup_all')], ['missing', t('t.dup_missing')]], 'all', function () { prefill(); modeRender(); check(); });
  var modeWrap = el('div', { class: 'stack tight' });
  var missing = null;   // mená žiakov, ktorí nepísali (null = ešte sa načítava / archivovaná)
  var prefill = function () { if (!touched) nameIn.value = freeName(x.id, radioVal(whoBox) === 'missing' ? 'N' : '2'); };
  // Ktoré otázky: len pri teste so skupinami. Trieda bez skupín nemôže písať „ako pôvodná“ ani „prehodené“.
  var modeRender = function () {
    var keep = radioVal(modeWrap) || 'same', cls = radioVal(whoBox) === 'missing' ? x.cls : clsSel.value, ab = classHasGroups(cls);
    modeWrap.innerHTML = '';
    if (!groups) return;
    var opts = [['same', t('t.dup_same')], ['swap', t('t.dup_swap')], ['A', t('t.only_a', { n: x.keysA || '?' })], ['B', t('t.only_b', { n: x.keysB || '?' })], ['all', t('t.dup_every')]];
    if (!ab) { opts = opts.slice(2); if (keep === 'same' || keep === 'swap') keep = 'all'; }
    modeWrap.appendChild(el('p', { class: 'small', style: 'font-weight:600', text: t('t.dup_mode') }));
    modeWrap.appendChild(radios('dup-mode', opts, keep));
    if (!ab) modeWrap.appendChild(el('p', { class: 'small muted', text: t('t.dup_nogroups', { cls: cls }) }));
  };
  clsSel.onchange = function () { modeRender(); };
  var start = function (state) {
    return { text: t(state === 'open' ? 't.start' : 't.prepare'), primary: state === 'open', wait: t('t.saving'), run: async function () {
      var name = nameIn.value.trim(), who = radioVal(whoBox);
      if (nameErr(name)) { check(); return true; }
      var total = Math.max(1, Math.min(240, parseInt(timeIn.value, 10) || x.total || 15));
      var cfg = { title: name, cls: who === 'missing' ? x.cls : clsSel.value, mode: groups ? radioVal(modeWrap) || 'same' : 'same', who: who, total: total, state: state };
      var r = await api('tDuplicate', A({ t: x.id, cfg: cfg }));
      var y = { id: r.id, created: r.created || nowStr(), started: r.started || '', cls: r.cls || cfg.cls, bank: x.bank, title: r.id, n: r.n, groups: !!r.groups, alt: !!r.alt, total: r.total || total,
        state: state, dk: r.dk || '', only: r.only || 0, src: r.src || x.id, note: '' };
      T.init.tests.push(y); (T.init.taken = T.init.taken || []).push(r.id.toLowerCase());
      tStarted(y);
      refreshInit().catch(function () {});
    } };
  };
  var bOpen = start('open'), bReady = start('ready');
  var check = function () {
    var miss = radioVal(whoBox) === 'missing', e = nameErr(nameIn.value.trim());
    nameIn.classList.toggle('invalid', !!e && e !== 'empty');
    nameMsg.textContent = e ? t('t.name_' + e, { max: (T.init && T.init.nameMax) || NAME_MAX }) : ''; nameMsg.hidden = !e;
    clsSel.disabled = miss; if (miss) clsSel.value = x.cls;
    missInfo.hidden = !miss;
    var none = miss && missing && !missing.length;
    if (miss) missInfo.textContent = missing === null ? t(x.state === 'archived' ? 't.dup_missing_arch' : 'common.loading') : missing.length ? t('t.dup_missing_list', { n: missing.length, names: missing.join(', ') }) : t('t.dup_missing_none');
    missInfo.className = 'small ' + (none ? 'bad' : 'muted');
    dlgOff(bOpen.el, !!e || none); dlgOff(bReady.el, !!e || none);
  };
  dlgOpen({ title: t('t.dup_title', { title: title }), body: [
    el('p', { class: 'small muted', text: t('t.dup_hint') }),
    el('p', { class: 'small', style: 'font-weight:600', text: t('t.dup_who') }), whoBox, missInfo,
    el('div', { class: 'row' }, [field(t('t.title'), nameIn, [nameMsg]), field(t('t.class'), clsSel), el('label', { style: 'flex:0 1 150px' }, [el('span', { text: t('t.time') }), timeIn])]),
    modeWrap], buttons: [bOpen, bReady, { text: t('common.cancel') }] });
  prefill(); modeRender(); check();
  // kto nepísal: žiaci bez výsledku (aj neprítomní); pri archivovanej to zistí až skript
  if (x.state !== 'archived') {
    try {
      var c = await curFor(x.id), done = {};
      c.res.forEach(function (r) { if (!r.teacher) done[r.pupilId] = 1; });
      missing = sortedRows(c).filter(function (p) { return !done[p.id.split('#')[0]]; }).map(function (p) { return p.label; });
      if (c.d.test.keysA) { x.keysA = (c.d.test.groups ? c.d.test.keysA : c.d.test.keys).length; x.keysB = c.d.test.keysB.length; modeRender(); }
    } catch (e) { missing = null; missInfo.textContent = errText(e); }
    if (!$('dlg').hidden) check();
  }
}

/* ---------- prepočítať body ---------- */
async function tRecalcDlg(x) {
  dlgOpen({ title: t('t.recalc_title', { title: x.title || x.id }), body: [el('p', { class: 'muted' }, [el('span', { class: 'spin' }), t('t.recalc_checking')])], buttons: [{ text: t('common.cancel') }] });
  var d;
  try { d = await api('tRecalc', A({ t: x.id, dry: true })); } catch (e) { dlgMsg(errText(e), 'bad'); return; }
  if ($('dlg').hidden) return;
  var body = $('dlg-body'); body.innerHTML = '';
  if (!d.bank) body.appendChild(el('p', { class: 'bad', text: t('t.recalc_nobank', { bank: x.bank || '' }) }));
  if (d.changes.length) {
    body.appendChild(el('p', { text: t('t.recalc_changes', { n: d.changes.length }) }));
    body.appendChild(el('ul', { class: 'rules small' }, d.changes.map(function (c) { return el('li', {}, [el('b', { text: c.tag + ' ' + c.q }), ': ' + c.what.join(', ')]); })));
  } else if (d.bank) body.appendChild(el('p', { text: t('t.recalc_none') }));
  if (d.skipped.length && d.bank) {
    body.appendChild(el('p', { class: 'small bad', text: t('t.recalc_skipped', { n: d.skipped.length }) }));
    body.appendChild(el('ul', { class: 'rules small' }, d.skipped.map(function (c) { return el('li', { text: c.tag + ' ' + c.q + ' – ' + c.why }); })));
  }
  body.appendChild(el('p', { class: 'small muted', text: t('t.recalc_hint') }));
  dlgButtons([{ text: t(d.changes.length ? 't.recalc_go' : 't.recalc_go_anyway'), primary: true, wait: t('t.recalc_running'), run: async function () {
    var r = await api('tRecalc', A({ t: x.id }));
    if (T.cur && T.cur.id === x.id) { if (r.pack) T.cur.pack = r.pack; tRefresh().catch(function () {}); }
    say(t('t.recalc_done', { n: r.n || 0 }), 'ok');
  } }, { text: t('common.cancel') }]);
}

/* ---------- anulovať otázku (v záložke Otázky) ---------- */
function voidCtl(it) {
  var q = it.q, kids = [];
  if (q.void) kids.push(el('span', { class: 'badge warn', text: t('t.void_badge_' + q.void) }));
  if (!T.dz && T.feat) kids.push(el('button', { type: 'button', class: 'mini', text: t(q.void ? 't.void_change' : 't.void_btn'), onclick: function () { tVoidDlg(it); } }));
  return kids.length ? el('span', { class: 'voidctl' }, kids) : null;
}
function tVoidDlg(it) {
  var q = it.q, k = it.k;
  var set = function (mode) {
    return async function () {
      var r = await api('tVoid', A({ t: T.cur.id, q: k, mode: mode }));
      T.cur.pack.q[k] = r.q; tPrepResults(); tQs();
      if (T.sub === 'over') tOverview();
      tStatus('qs-msg', t('t.void_done_' + (mode || 'undo'), { n: r.n || 0 }), 'ok');
    };
  };
  dlgOpen({ title: t('t.void_title'), body: [
    el('p', { class: 'qq', style: 'font-weight:800', text: qTag(k) + ' ' + q.q }),
    q.void ? el('p', { class: 'bad', text: t('t.void_now_' + q.void) }) : null,
    el('ul', { class: 'rules small' }, [el('li', { html: t('t.void_full_hint') }), el('li', { html: t('t.void_skip_hint') })]),
    el('p', { class: 'small muted', text: t('t.void_hint') })],
  buttons: [q.void !== 'full' ? { text: t('t.void_full'), primary: true, run: set('full') } : null,
    q.void !== 'skip' ? { text: t('t.void_skip'), primary: !q.void, run: set('skip') } : null,
    q.void ? { text: t('t.void_undo'), run: set('') } : null,
    { text: t('common.cancel') }] });
}

/* ---------- známky ---------- */
// Stupnica: od koľkých % je 1, 2, 3, 4 (menej = 5). Percentá sa zaokrúhlia na celé ako v prehľade.
function gradeOf(pct, g) { var p = Math.round(pct * 100); return p >= g[0] ? 1 : p >= g[1] ? 2 : p >= g[2] ? 3 : p >= g[3] ? 4 : 5; }
function gradesOk(g) { return g.length === 4 && g.every(function (v, i) { return v !== null && v >= 0 && v <= 100 && Math.floor(v) === v && (i === 0 || v < g[i - 1]); }); }
async function tGradesDlg(x) {
  dlgOpen({ title: t('t.grades_title', { title: x.title || x.id }), body: [el('p', { class: 'muted' }, [el('span', { class: 'spin' }), t('common.loading')])], buttons: [{ text: t('common.cancel') }] });
  var c;
  try { c = await curFor(x.id); } catch (e) { dlgMsg(errText(e), 'bad'); return; }
  if ($('dlg').hidden) return;
  var g0 = ((T.init && T.init.grades) || store('grades') || [90, 75, 50, 25]).slice(), ins = [];
  var by = {}; c.res.forEach(function (r) { by[r.pupilId] = r; });
  var list = sortedRows(c).map(function (p) { var key = p.id.split('#')[0], r = by[key]; return { name: p.label, pct: r && r.sc.pct !== null ? r.sc.pct : null, absent: !r && !!c.absent[key] }; });
  var tb = el('tbody'), scale = el('div', { class: 'row scale' });
  [1, 2, 3, 4].forEach(function (n, i) {
    var inp = el('input', { type: 'number', min: '0', max: '100', inputmode: 'numeric' }); inp.value = g0[i];
    inp.oninput = render; ins.push(inp);
    scale.appendChild(el('label', {}, [el('span', { text: t('t.grade_from', { g: n }) }), inp]));
  });
  var cur = function () { return ins.map(function (i) { var v = parseInt(i.value, 10); return isNaN(v) ? null : v; }); };
  function render() {
    var g = cur(), ok = gradesOk(g);
    ins.forEach(function (i) { i.classList.toggle('invalid', !ok); });
    tb.innerHTML = '';
    list.forEach(function (p) {
      tb.appendChild(el('tr', {}, [el('td', { text: p.name }), el('td', { class: 'num', text: p.pct === null ? (p.absent ? t('t.st_absent') : '–') : fmtPct(p.pct) }),
        el('td', { class: 'num', text: p.pct === null || !ok ? '' : String(gradeOf(p.pct, g)) })]));
    });
    dlgOff(copy.el, !ok || !list.some(function (p) { return p.pct !== null; }));
    tStatus('grades-err', ok ? '' : t('t.grades_bad'), 'bad');
  }
  var copy = { text: t('t.grades_copy'), primary: true, run: async function () {
    var g = cur(), lines = list.map(function (p) { return p.name + '\t' + (p.pct === null ? '' : gradeOf(p.pct, g)); });
    copyText(lines.join('\n'), 'dlg-msg', t('t.grades_copied', { n: list.filter(function (p) { return p.pct !== null; }).length }));
    // stupnica sa zapamätá (v tabuľke, so starším skriptom v prehliadači)
    if (g.join() !== g0.join()) {
      store('grades', g); if (T.init) T.init.grades = g; g0 = g.slice();
      if (T.feat) api('tGrades', A({ g: g })).catch(function (e) { tStatus('grades-err', errText(e), 'bad'); });
    }
    return true;
  } };
  var body = $('dlg-body'); body.innerHTML = '';
  body.appendChild(el('p', { class: 'small muted', text: t('t.grades_hint') }));
  body.appendChild(scale);
  body.appendChild(el('p', { id: 'grades-err', class: 'small bad', hidden: true }));
  body.appendChild(el('div', { class: 'tablebox gradebox' }, [el('table', {}, [el('thead', {}, [el('tr', {}, [el('th', { text: t('t.col_pupil') }), el('th', { class: 'num', text: t('t.col_result') }), el('th', { class: 'num', text: t('t.col_grade') })])]), tb])]));
  dlgButtons([copy, { text: t('common.close') }]);
  render();
}

/* ---------- tlač písomky (otázky spustenej písomky) ---------- */
async function tPrintDlg(x) {
  var F = form(), dys = checkbox(t('t.pr_dys'), F.prDys), key = checkbox(t('t.pr_key'), F.prKey);
  var grp = x.groups ? radios('pt-g', [['AB', t('t.pr_ab')], ['A', t('t.pr_a')], ['B', t('t.pr_b')]], 'AB') : null;
  dlgOpen({ title: t('t.print_title', { title: x.title || x.id }), body: [grp, el('div', { class: 'chips' }, [dys.el, key.el]), el('p', { class: 'small muted', text: t('t.pr_hint2') })],
    buttons: [{ text: t('t.pr_go'), primary: true, wait: t('t.pr_wait'), run: async function () {
      saveForm({ prDys: dys.inp.checked, prKey: key.inp.checked });
      var c = await curFor(x.id), d = c.d.test, mode = grp ? radioVal(grp) : 'all';
      var qs = function (keys) { return keys.map(function (k) { return c.pack.q[k]; }).filter(Boolean); };
      var sets = !d.groups ? [{ g: 'all', qs: qs(d.keys) }] : (mode === 'AB' ? ['A', 'B'] : [mode]).map(function (g) { return { g: g, qs: qs(g === 'B' ? d.keysB : d.keysA) }; });
      paperRender(d.title || d.id, sets, dys.inp.checked, key.inp.checked, 'dlg-msg');
    } }, { text: t('common.cancel') }] });
}

/* ---------- náhľad ako žiak ---------- */
// Stránka žiaka v novej karte s otázkami tejto písomky. Nič sa neukladá: odpovede aj vyhodnotenie sú len v prehliadači.
// Údaje idú cez úložisko prehliadača (rovnaká adresa), kľúč učiteľa sa do odkazu nedáva.
async function tPupilPreview(x) {
  var url = appBase() + '?preview=1', w = null;
  if (!(T.cur && T.cur.id === x.id && T.cur.pack)) { try { w = window.open('', '_blank'); } catch (e) { w = null; } if (w) try { w.document.title = t('common.loading'); } catch (e) { /* nevadí */ } }
  try {
    var c = await curFor(x.id), d = c.d.test;
    store('preview', { id: d.id, title: d.title || d.id, cls: d.cls, total: d.total, shuffle: d.shuffle !== false, groups: !!d.groups, keysA: d.keysA, keysB: d.keysB, keys: d.keys,
      pack: c.pack, penalty: c.d.penalty || 0.1, at: Date.now() });
    if (w) w.location.href = url;
    else if (!window.open(url, '_blank')) say(t('t.preview_blocked'), 'bad');
  } catch (e) { if (w) w.close(); say(errText(e), 'bad'); }
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
  on('over-add', function () { tAddTime('*', $('over-add')); });
  on('over-export', tExportAll);
  on('qs-force', function () { T.qsForce = true; tQs(); });
  on('over-review-b', function () { tSub('qs'); });
  on('test-toggle', tToggleState);
  on('test-reveal', tSetReveal, 'onchange');
  on('sub-over-b', function () { tSub('over'); });
  on('sub-qs-b', function () { tSub('qs'); });
  on('qr-close', function () { $('qr-cover').hidden = true; });
  // ponuka ⋯ sa zatvorí klikom mimo nej, Esc alebo zmenou šírky okna (posúva sa so stránkou, takže posúvanie jej nevadí)
  document.addEventListener('pointerdown', function (e) { if (!$('menu').hidden && !$('menu').contains(e.target) && e.target !== MENU.btn) menuClose(); }, true);
  var lastW = window.innerWidth;
  window.addEventListener('resize', function () { if (window.innerWidth !== lastW) { lastW = window.innerWidth; menuClose(); } });
  $('menu').addEventListener('keydown', function (e) {
    var list = [].slice.call($('menu').querySelectorAll('button:not([disabled])')), i = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (list.length) list[(i + (e.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length].focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); if (list.length) list[e.key === 'Home' ? 0 : list.length - 1].focus(); }
    else if (e.key === 'Tab') menuClose();
  });
  window.addEventListener('afterprint', function () { $('print-sheet').innerHTML = ''; });
  on('qr-cover', function (e) { if (e.target === $('qr-cover')) $('qr-cover').hidden = true; });
  on('t-disconnect', function () { if (confirm(t('t.disconnect_confirm'))) { store('teacher', null); location.reload(); } });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (!$('menu').hidden) { menuClose(true); return; }
    if (!$('dlg').hidden) { dlgClose(); return; }
    $('qr-cover').hidden = true;
  });
  // odkaz z tabuľky vložený do už otvorenej stránky mení len časť za #, stránka sa preto načíta znova
  window.addEventListener('hashchange', function () { if (/[#&]k=/.test(location.hash)) location.reload(); });
})();
teacherStart();
