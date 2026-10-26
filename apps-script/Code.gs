/**
 * Písomky, verzia 1.0: skript tabuľky učiteľa (Google Apps Script).
 *
 * Aplikácia beží na GitHub Pages (APP_URL). Tento skript je len most k tabuľke učiteľa:
 * číta banku otázok a zoznam žiakov, ukladá testy, opravuje odpovede a zapisuje výsledky.
 * Správne odpovede neodchádzajú do prehliadača žiaka počas písania, opravuje sa tu.
 *
 * Nasadenie: Nasadiť > Nové nasadenie > Webová aplikácia, spustiť ako „Ja", prístup „Ktokoľvek".
 * Po úprave kódu: Nasadiť > Spravovať nasadenia > ceruzka > Verzia: Nová verzia > Nasadiť (adresa ostane rovnaká).
 *
 * Hárky: Otázky (banka testov, píše učiteľ), Žiaci (píše učiteľ), Testy a Res_… (výsledky, píše skript), _balíky (skrytý).
 * Písomka: jeden celkový čas, žiak sa medzi otázkami voľne presúva a odpovede mení až do odovzdania.
 * Skupiny: otázky so Skupinou A píše skupina A, so Skupinou B skupina B, otázky bez skupiny píšu obe.
 * Prvý odchod z testu strhne z celkového výsledku LEAVE_PENALTY, druhý test ukončí a odovzdá.
 *
 * Od 1.3: id testu „trieda_MM-dd_HH:mm“ (napr. 9A_10-25_19:49), hárok výsledkov „Res_<id>“ hneď za hárkom Testy, najnovší vľavo.
 * Písomky žiakov sa dajú uložiť ako PDF na Disk (priečinok „Písomky – žiaci“ vedľa tabuľky).
 */
const VERSION = '1.3';
const APP_URL = 'https://samocief.github.io/test/';
const APP_NAME = 'Písomky';

const SH = { questions: ['Otázky', 'Otazky', 'Questions'], pupils: ['Žiaci', 'Ziaci', 'Pupils', 'Students'], tests: 'Testy', packs: '_balíky' };
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const Q_HEAD = ['Test', 'Skupina', 'Otázka', 'A', 'B', 'C', 'D', 'E', 'F', 'Správna', 'Obrázok', 'Aktívna'];
const PUPIL_HEAD = ['Trieda', 'Meno', 'Skupina', 'Aktívny'];
const TEST_HEAD = ['id testu', 'vytvorený', 'trieda', 'test z banky', 'názov', 'stav', 'celkový čas (min)', 'počet otázok', 'skupiny',
  'miešať možnosti', 'žiak po uzavretí uvidí', 'otázky A', 'otázky B', 'uzavretý o'];
const RES_FIXED = ['odoslané', 'žiak', 'skupina', 'výsledok (%)', 'body'];
const RES_TAIL = ['odchody', 'odpovede', 'príznak'];
const LEAVE_PENALTY = 0.10;    // strhnutie z celkového výsledku za prvý odchod z testu (10 percentuálnych bodov)
const REVIEW_MIN = 15;         // koľko minút po uzavretí testu žiak vidí svoje výsledky; potom sa už nezobrazia (ani po znovuotvorení odkazu)
const GRACE_MS = 120000;       // po uplynutí času sa odovzdanie ešte prijme bez príznaku (pomalá sieť)
const STATE = { ready: 'pripravený', open: 'otvorený', closed: 'uzavretý' };
const REVEAL = { all: 'odpovede', pct: 'len výsledok' };
const TEACHER = 'Učiteľ';                        // jedno meno navyše v každej triede, nepočíta sa do priemeru
const ABSENT = 'neprítomný';
const DOZOR_OK = { tTest: 1, tSetTest: 1, tUnlock: 1, tAbsent: 1 };   // čo smie odkaz pre dozor (len jeden test)
const WHY = { none: 'bez odpovede', ended: 'ukončené' };
const CHUNK = 40000;

/* ---------- pomocné ---------- */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function tz_() { return ss_().getSpreadsheetTimeZone() || 'Europe/Bratislava'; }
function now_(fmt) { return Utilities.formatDate(new Date(), tz_(), fmt || 'yyyy-MM-dd HH:mm:ss'); }
function s_(v) {
  if (v === null || v === undefined) return '';
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd HH:mm');
  return String(v).trim();
}
function num_(v) { const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.')); return isNaN(n) ? null : n; }
function normName(s) {
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’'`´.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function yes_(v) { const n = normName(v); return !(n === 'nie' || n === 'no' || n === 'false' || n === '0' || n === 'n'); }
function fail_(code, msg) { throw new Error('E:' + code + (msg ? '|' + msg : '')); }
function props_() { return PropertiesService.getScriptProperties(); }
function cache_() { return CacheService.getScriptCache(); }
function withLock_(fn) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) fail_('busy');
  try { return fn(); } finally { lock.releaseLock(); }
}
function sheetByNames_(names) { for (let i = 0; i < names.length; i++) { const sh = ss_().getSheetByName(names[i]); if (sh) return sh; } return null; }

// Hárok ako tabuľka: hlavička v prvom riadku, stĺpce sa hľadajú podľa začiatku názvu (bez diakritiky, aj viac možných názvov).
function tableOf_(sheet, label) {
  const vals = sheet.getDataRange().getValues();
  const head = (vals[0] || []).map(function (h) { return normName(h); });
  return {
    sheet: sheet, head: head, rows: vals.slice(1), label: label || sheet.getName(),
    col: function (prefixes) {
      prefixes = [].concat(prefixes);
      for (let p = 0; p < prefixes.length; p++) { const n = normName(prefixes[p]); for (let i = 0; i < head.length; i++) if (head[i] && head[i].indexOf(n) === 0) return i; }
      return -1;
    },
    // presná zhoda názvu stĺpca (stĺpce A–F by sa inak zhodovali so začiatkom iných názvov)
    exact: function (name) { return head.indexOf(normName(name)); },
    need: function (prefixes) { const i = this.col(prefixes); if (i < 0) fail_('no_col', this.label + ': ' + [].concat(prefixes)[0]); return i; }
  };
}
function ensureSheet_(name, head, hidden) {
  let sh = ss_().getSheetByName(name);
  if (!sh) {
    sh = ss_().insertSheet(name, ss_().getSheets().length);
    if (sh.getMaxColumns() < head.length) sh.insertColumnsAfter(sh.getMaxColumns(), head.length - sh.getMaxColumns());
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#d9d9d9');
    sh.setFrozenRows(1);
    if (hidden) sh.hideSheet();
  }
  return sh;
}
// Doplní stĺpce, ktoré pribudli v novšej verzii, na koniec hlavičky existujúceho hárka.
function ensureCols_(sh, head) {
  const last = Math.max(1, sh.getLastColumn());
  const have = sh.getRange(1, 1, 1, last).getValues()[0].map(function (h) { return normName(h); });
  const miss = head.filter(function (h) { return have.indexOf(normName(h)) < 0; });
  if (!miss.length) return;
  const at = sh.getLastColumn() + 1;
  if (sh.getMaxColumns() < at + miss.length - 1) sh.insertColumnsAfter(sh.getMaxColumns(), at + miss.length - 1 - sh.getMaxColumns());
  sh.getRange(1, at, 1, miss.length).setValues([miss]).setFontWeight('bold').setBackground('#d9d9d9');
}
function ensureBaseSheets_() {
  if (!sheetByNames_(SH.questions)) ensureSheet_(SH.questions[0], Q_HEAD);
  if (!sheetByNames_(SH.pupils)) ensureSheet_(SH.pupils[0], PUPIL_HEAD);
}
// Kľúč a adresa sa ukladajú spolu s id tabuľky: v kópii tabuľky (iný učiteľ) neplatia a vytvoria sa nové.
function ownProp_(name) {
  const v = props_().getProperty(name);
  if (!v) return '';
  try { const o = JSON.parse(v); return o && o.ss === ss_().getId() ? String(o.v || '') : ''; } catch (e) { return ''; }
}
function setOwnProp_(name, v) { props_().setProperty(name, JSON.stringify({ ss: ss_().getId(), v: v })); }
function teacherKey_() {
  let k = ownProp_('TKEY');
  if (!k) { k = Utilities.getUuid().replace(/-/g, ''); setOwnProp_('TKEY', k); }
  return k;
}
function auth_(req) { if (!req.k || req.k !== teacherKey_()) fail_('auth'); }
// Kľúč dozoru platí len pre jeden test a len na prehľad, spustenie, uzavretie, odomknutie a neprítomných.
function dozorKey_(testId) {
  const sig = Utilities.computeHmacSha256Signature('dozor|' + testId, teacherKey_());
  return Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '').slice(0, 16);
}
function dozorAuth_(req) {
  const ok = req.t && (String(req.dk) === dozorKey_(String(req.t)) || (req.tOld && String(req.dk) === dozorKey_(String(req.tOld))));
  if (!DOZOR_OK[req.a] || !ok) fail_('auth');
  req.dozor = true;
}

/* ---------- vstupné body ---------- */
function doPost(e) {
  let req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return out_({ error: 'bad_request' }); }
  return out_(handle_(req));
}
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.q) { let req; try { req = JSON.parse(p.q); } catch (x) { return out_({ error: 'bad_request' }); } return out_(handle_(req)); }
  return HtmlService.createHtmlOutput('<p style="font:16px sans-serif">Toto je skript tabuľky pre aplikáciu ' + APP_NAME + ' (verzia ' + VERSION + '). ' +
    'Aplikácia beží na <a href="' + APP_URL + '">' + APP_URL + '</a>.</p>').setTitle(APP_NAME);
}
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
const ROUTES = {
  ping: function () { return { ok: true, v: VERSION }; },
  pupilInit: pupilInit_, pupilLogin: pupilLogin_, pupilBegin: pupilBegin_, pupilSave: pupilSave_, pupilEvent: pupilEvent_, pupilSubmit: pupilSubmit_, pupilState: pupilState_, pupilResult: pupilResult_,
  tInit: tInit_, tCreateTest: tCreateTest_, tTest: tTest_, tSetTest: tSetTest_, tUnlock: tUnlock_, tAbsent: tAbsent_, tFixKey: tFixKey_, tExportPupil: tExportPupil_
};
function handle_(req) {
  try {
    const fn = ROUTES[req && req.a];
    if (!fn) return { error: 'bad_request', msg: String(req && req.a) };
    if (req.t) { const al = aliases_()[String(req.t)]; if (al) { req.tOld = String(req.t); req.t = al; } }   // staré odkazy a QR kódy
    if (/^t[A-Z]/.test(req.a)) { if (req.dk && !req.k) dozorAuth_(req); else auth_(req); }
    return fn(req) || { ok: true };
  } catch (err) {
    const m = String(err && err.message || err);
    if (m.indexOf('E:') === 0) { const p = m.slice(2).split('|'); return { error: p[0], msg: p[1] || '' }; }
    if (/lock|timed out|too many|Service invoked|Rate Limit|Service unavailable/i.test(m)) return { error: 'busy', msg: m };
    return { error: 'server', msg: m };
  }
}

/* ---------- ponuka v tabuľke ---------- */
function onOpen() {
  SpreadsheetApp.getUi().createMenu(APP_NAME)
    .addItem('Otvoriť aplikáciu učiteľa', 'showTeacherLink')
    .addItem('Skontrolovať otázky', 'checkQuestions')
    .addItem('Doplniť poznámky s odpoveďami (otvorený hárok výsledkov)', 'addAnswerNotes')
    .addItem('Usporiadať hárky výsledkov (najnovšie vľavo)', 'organizeResults')
    .addItem('Zmeniť adresu webovej aplikácie', 'changeUrl')
    .addSeparator()
    .addItem('Nový kľúč učiteľa (odhlási všetky zariadenia)', 'newTeacherKey')
    .addToUi();
}
// Keď kľúč videl niekto iný (napr. QR kód na projektore): nový kľúč, starý odkaz a QR kód prestanú platiť všade.
function newTeacherKey() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.alert('Nový kľúč učiteľa',
    'Starý odkaz a QR kód aplikácie učiteľa prestanú fungovať na všetkých zariadeniach, kde boli otvorené (aj u žiakov, ak ho naskenovali). ' +
    'Prestanú platiť aj odkazy a papiere pre dozor k doterajším testom. Svoj telefón potom pripojíš znova. Pokračovať?', ui.ButtonSet.YES_NO);
  if (r !== ui.Button.YES) return;
  setOwnProp_('TKEY', Utilities.getUuid().replace(/-/g, ''));
  showTeacherLink();
}
// Kontrola banky otázok priamo v tabuľke: zoznam testov s počtami a chyby v riadkoch.
function checkQuestions() {
  ensureBaseSheets_();
  const b = readBank_(), ui = SpreadsheetApp.getUi();
  const lines = b.tests.map(function (x) { return '• ' + x.name + ': ' + x.n + ' otázok' + (x.A || x.B ? ' (len A: ' + x.A + ', len B: ' + x.B + ', obe: ' + x.both + ')' : ''); });
  const errs = b.errors.slice(0, 25).map(function (e) { return '• riadok ' + e.row + ': ' + e.msg; });
  ui.alert('Kontrola otázok', (lines.length ? lines.join('\n') : 'V hárku Otázky zatiaľ nie je žiadna aktívna otázka.') +
    (errs.length ? '\n\nTieto riadky sa do testu nedostanú:\n' + errs.join('\n') + (b.errors.length > 25 ? '\n…' : '') : '\n\nBez chýb.'), ui.ButtonSet.OK);
}
// Pre hárky výsledkov zo staršej verzie: doplní poznámky s celým znením odpovedí do otvoreného hárka „Res_…“.
function addAnswerNotes() {
  const ui = SpreadsheetApp.getUi(), sh = ss_().getActiveSheet(), m = /^(?:Res_|Výsledky )(.+)$/.exec(sh.getName());
  if (!m) { ui.alert('Najprv otvor hárok výsledkov (Res_…).'); return; }
  const f = findTest_(aliases_()[m[1]] || m[1]);
  if (!f) { ui.alert('Test ' + m[1] + ' sa v hárku Testy nenašiel.'); return; }
  const test = f.test, pack = loadPack_(test.id), tb = tableOf_(sh), first = tb.need('body') + 1;
  sh.getRange(1, first + 1, 1, test.keys.length).setNotes([test.keys.map(function (k) { return headNote_(pack.q[k]); })]);
  let n = 0;
  readResults_(test).forEach(function (r) {
    if (r.absent) return;
    sh.getRange(r.row, first + 1, 1, test.keys.length).setNotes([test.keys.map(function (k) { return r.keys.indexOf(k) < 0 ? '' : noteFor_(pack.q[k], r.ans[k]); })]);
    n++;
  });
  ui.alert('Poznámky doplnené pri ' + n + ' žiakoch. Ukážu sa po prejdení myšou na bunku.');
}
// Jednorazovo po výmene skriptu: v editore vybrať povolitDisk a Spustiť, potvrdiť povolenia (Disk, internet).
// Webová aplikácia sama o povolenie nepožiada, bez neho ukladanie písomiek na Disk zlyhá.
function povolitDisk() {
  const f = DriveApp.createFolder('test povolenia');
  f.setTrashed(true);
  UrlFetchApp.fetch('https://www.google.com', { muteHttpExceptions: true });
}
function deployId_(url) { const m = /\/s\/([-\w]+)\/(exec|dev)/.exec(url || ''); return m ? m[1] : ''; }
function execUrl_() {
  const saved = ownProp_('URL');
  if (saved) return saved;
  let live = '';
  try { live = ScriptApp.getService().getUrl() || ''; } catch (e) { live = ''; }
  if (/\/exec$/.test(live)) { setOwnProp_('URL', live); return live; }
  return '';
}
function askUrl_() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt(APP_NAME, 'Vlož adresu webovej aplikácie. Nájdeš ju v editore skriptu: Nasadiť > Spravovať nasadenia. Končí na /exec.', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return '';
  const u = r.getResponseText().trim().split('?')[0];
  if (!/^https:\/\/script\.google\.com\/.*\/s\/[-\w]+\/exec$/.test(u)) { ui.alert('Toto nie je adresa webovej aplikácie. Má tvar https://script.google.com/macros/s/…/exec'); return ''; }
  setOwnProp_('URL', u);
  return u;
}
function changeUrl() { if (askUrl_()) showTeacherLink(); }
function showTeacherLink() {
  const url = execUrl_() || askUrl_();
  if (!url) return;
  ensureBaseSheets_();
  const link = APP_URL + 'ucitel.html#s=' + deployId_(url) + '&k=' + teacherKey_();
  // QR kód je skrytý pod tlačidlom: okno býva na projektore a žiaci ho inak hneď naskenujú.
  const icon = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-6px;margin-right:6px">' +
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>' +
    '<path d="M14 14h3v3h-3zM18 18h3v3h-3zM14 20h2M20 14v2"/></svg>';
  const html = HtmlService.createHtmlOutput(
    '<div style="font:14px/1.45 sans-serif;color:#18262a">' +
    '<p><a href="' + link + '" target="_blank" style="font-size:18px;font-weight:bold;color:#1c4f8a">Otvoriť aplikáciu učiteľa</a></p>' +
    '<p><button id="qb" type="button" style="font:inherit;font-weight:bold;padding:8px 14px;border:1px solid #c9d3cd;border-radius:8px;background:#fff;cursor:pointer;color:#18262a">' +
    icon + '<span>QR kód pre telefón</span></button></p>' +
    '<div id="qbox" style="display:none"><p>Naskenuj ho svojím telefónom. Aplikácia si tabuľku zapamätá.</p><div id="qr" style="width:220px"></div></div>' +
    '<p style="color:#a2420b"><b>Odkaz aj QR kód sú tvoj kľúč k tabuľke. Žiakom ich neukazuj, ani na projektore.</b></p>' +
    '<p style="color:#56666a;font-size:12px">Ak kľúč videl niekto iný: ' + APP_NAME + ' → Nový kľúč učiteľa.<br>Webová aplikácia: ' + url + '</p></div>' +
    '<script src="' + APP_URL + 'js/qrcode.js"></script>' +
    '<script>document.getElementById("qb").onclick=function(){var b=document.getElementById("qbox"),on=b.style.display==="none";b.style.display=on?"block":"none";' +
    'this.lastChild.textContent=on?"Skryť QR kód":"QR kód pre telefón";if(on&&!document.getElementById("qr").firstChild){try{var q=qrcode(0,"M");q.addData(' + JSON.stringify(link) + ');q.make();' +
    'document.getElementById("qr").innerHTML=q.createSvgTag({cellSize:4,margin:2,scalable:true});}catch(e){document.getElementById("qr").textContent="QR kód sa nepodarilo vytvoriť.";}}};</script>'
  ).setWidth(400).setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, APP_NAME);
}

/* ---------- banka otázok ---------- */
// Obrázok: odkaz na súbor na Disku (zdieľaný „každý s odkazom“) sa zmení na priamy odkaz na obrázok, iné odkazy ostanú.
function imageUrl_(v) {
  const s = s_(v);
  if (!s) return '';
  const m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=|thumbnail\?(?:[^#]*&)?id=)([-\w]{20,})/.exec(s) || /docs\.google\.com\/uc\?(?:[^#]*&)?id=([-\w]{20,})/.exec(s);
  if (m) return 'https://drive.google.com/thumbnail?id=' + m[1] + '&sz=w1200';
  return /^https:\/\//.test(s) ? s : '';
}
// Hárok Otázky: Test | Skupina (A, B alebo prázdne = obe) | Otázka | A … F (možnosti, aspoň dve) | Správna (písmeno) | Obrázok | Aktívna.
// Vráti testy (podľa stĺpca Test) s otázkami a zoznam chýb v riadkoch. Kľúč otázky je číslo riadku v hárku.
function readBank_() {
  const sh = sheetByNames_(SH.questions);
  if (!sh) fail_('no_sheet', SH.questions[0]);
  const t = tableOf_(sh);
  const cT = t.need(['test']), cG = t.col(['skupina', 'group']), cQ = t.need(['otazka', 'question']), cK = t.need(['spravna', 'correct']);
  const cI = t.col(['obrazok', 'image']), cA = t.col(['aktivna', 'aktivny', 'active']);
  const cO = LETTERS.map(function (L) { return t.exact(L); });
  if (cO[0] < 0 || cO[1] < 0) fail_('no_col', t.label + ': A, B');
  const tests = {}, order = [], errors = [];
  t.rows.forEach(function (row, i) {
    const r = i + 2, name = s_(row[cT]), text = s_(row[cQ]);
    if (!name && !text) return;
    if (cA >= 0 && s_(row[cA]) !== '' && !yes_(row[cA])) return;
    if (!name) { errors.push({ row: r, msg: 'chýba názov testu' }); return; }
    if (!text) { errors.push({ row: r, msg: 'chýba otázka (' + name + ')' }); return; }
    // možnosti idú za sebou: prázdne políčko uprostred sa preskočí, písmená sa posunú
    const opts = [], map = {};
    cO.forEach(function (c, j) { if (c >= 0 && s_(row[c]) !== '') { map[LETTERS[j]] = opts.length; opts.push(s_(row[c])); } });
    if (opts.length < 2) { errors.push({ row: r, msg: 'menej ako dve možnosti (' + name + ')' }); return; }
    const kl = normName(row[cK]).toUpperCase().replace(/\s/g, '');
    if (!kl) { errors.push({ row: r, msg: 'chýba správna odpoveď (' + name + ')' }); return; }
    if (map[kl] === undefined) { errors.push({ row: r, msg: 'správna odpoveď „' + s_(row[cK]) + '“ nie je medzi možnosťami (' + name + ')' }); return; }
    const gn = cG >= 0 ? normName(row[cG]).split(' ').pop() : '';
    const g = gn === 'a' ? 'A' : gn === 'b' ? 'B' : '';
    const key = normName(name);
    if (!tests[key]) { tests[key] = { name: name, qs: [] }; order.push(key); }
    tests[key].qs.push({ k: 'r' + r, row: r, g: g, q: text, opts: opts, ok: map[kl], img: cI >= 0 ? imageUrl_(row[cI]) : '' });
  });
  return {
    errors: errors,
    tests: order.map(function (k) {
      const x = tests[k], A = x.qs.filter(function (q) { return q.g === 'A'; }).length, B = x.qs.filter(function (q) { return q.g === 'B'; }).length;
      return { name: x.name, n: x.qs.length, A: A, B: B, both: x.qs.length - A - B, qs: x.qs };
    })
  };
}

/* ---------- žiaci ---------- */
function pupilKey_(cls, label) { return normName(cls) + '|' + normName(label); }
// Hárok Žiaci: Trieda | Meno („Priezvisko Meno“) | Skupina (A/B, voliteľne) | Aktívny. Voliteľne samostatný stĺpec Priezvisko.
function readPupils_() {
  const sh = sheetByNames_(SH.pupils);
  if (!sh) fail_('no_sheet', SH.pupils[0]);
  const t = tableOf_(sh);
  const cC = t.need(['trieda', 'class']), cS = t.col(['priezvisko', 'surname', 'last name']), cN = t.need(['meno', 'name', 'ziak']), cA = t.col(['aktivny', 'active']);
  const cG = t.col(['skupina', 'group']);
  const out = [], used = {};
  t.rows.forEach(function (row) {
    const cls = s_(row[cC]), label = ((cS >= 0 && cS !== cN ? s_(row[cS]) + ' ' : '') + s_(row[cN])).trim();
    if (!cls || !label) return;
    let id = pupilKey_(cls, label);
    if (used[id]) id += '#' + (++used[id]); else used[id] = 1;
    const g = cG >= 0 ? normName(row[cG]).split(' ').pop() : '';   // „A“, „b“, „Skupina B“
    out.push({ id: id, cls: cls, label: label, group: g === 'a' ? 'A' : g === 'b' ? 'B' : '', active: cA >= 0 ? yes_(row[cA]) : true });
  });
  return out;
}
// Skupiny tried: {trieda: {A: počet, B: počet, none: [mená bez skupiny]}}.
function classGroups_(pupils) {
  const out = {};
  pupils.forEach(function (p) {
    if (!p.active) return;
    const o = out[p.cls] = out[p.cls] || { A: 0, B: 0, none: [] };
    if (p.group) o[p.group]++; else o.none.push(p.label);
  });
  return out;
}

/* ---------- testy ---------- */
function testsTable_() {
  ensureCols_(ensureSheet_(SH.tests, TEST_HEAD), TEST_HEAD);
  return tableOf_(ss_().getSheetByName(SH.tests));
}
function testObj_(t, row) {
  const g = function (p) { const i = t.col(p); return i < 0 ? '' : row[i]; };
  const st = normName(g('stav'));
  const list = function (v) { return s_(v).split(';').map(function (x) { return x.trim(); }).filter(String); };
  const keysA = list(g('otazky a')), keysB = list(g('otazky b'));
  return {
    id: s_(g('id testu')), created: s_(g('vytvoreny')), cls: s_(g('trieda')), bank: s_(g('test z banky')), title: s_(g('nazov')),
    state: st === normName(STATE.closed) ? 'closed' : st === normName(STATE.ready) ? 'ready' : 'open',
    total: Math.max(1, num_(g('celkovy cas')) || 10), groups: keysB.length > 0,
    shuffle: yes_(g('miesat')), reveal: normName(g('ziak po')) === normName(REVEAL.pct) ? 'pct' : 'all',
    keysA: keysA, keysB: keysB, keys: uniq_(keysA.concat(keysB)),
    closedMs: msOf_(g('uzavrety o')), review: REVIEW_MIN
  };
}
// Čas zo stĺpca „uzavretý o“ (dátum alebo text „yyyy-MM-dd HH:mm:ss“) v ms; prázdne = 0.
function msOf_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return v.getTime();
  const m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)(?::(\d\d))?/.exec(s_(v));
  if (!m) return 0;
  const d = Utilities.parseDate(m[1] + '-' + m[2] + '-' + m[3] + ' ' + m[4] + ':' + m[5] + ':' + (m[6] || '00'), tz_(), 'yyyy-MM-dd HH:mm:ss');
  return d ? d.getTime() : 0;
}
// Zostávajúci čas na prezeranie výsledkov po uzavretí (ms); 0 = už sa nezobrazujú.
function reviewLeft_(test) { return test.closedMs ? Math.max(0, test.closedMs + REVIEW_MIN * 60000 - Date.now()) : 0; }
function uniq_(a) { const o = {}, r = []; a.forEach(function (x) { if (!o[x]) { o[x] = 1; r.push(x); } }); return r; }
// Otázky, ktoré píše žiak danej skupiny (test bez skupín: všetky).
function groupKeys_(test, g) { return test.groups ? (g === 'B' ? test.keysB : test.keysA) : test.keys; }
function findTest_(testId) {
  const t = testsTable_(), c = t.need('id testu');
  for (let i = 0; i < t.rows.length; i++) if (s_(t.rows[i][c]) === testId) return { t: t, rowIndex: i + 2, test: testObj_(t, t.rows[i]) };
  return null;
}
// Test z vyrovnávacej pamäte (žiaci sa pýtajú často); po zmene učiteľom sa pamäť maže.
function testCached_(testId) {
  const key = 'T1_' + testId;
  try { const c = cache_().get(key); if (c) return JSON.parse(c); } catch (e) { /* čítame z hárka */ }
  const f = findTest_(testId);
  if (!f) return null;
  try { cache_().put(key, JSON.stringify(f.test), 60); } catch (e) { /* nevadí */ }
  return f.test;
}
function forgetTest_(testId) { try { cache_().remove('T1_' + testId); } catch (e) { /* nevadí */ } }

/* ---------- balík testu: otázky so správnymi odpoveďami (snímka v čase vytvorenia testu) ---------- */
// Zmeny v hárku Otázky sa už spusteného testu nedotknú; opraviť správnu odpoveď sa dá v aplikácii učiteľa.
function savePack_(id, pack) {
  const json = JSON.stringify(pack);
  const sh = ensureSheet_(SH.packs, ['id testu', 'časť', 'obsah'], true);
  // starý obsah balíka toho istého testu (oprava kľúča) sa najprv zmaže
  const old = sh.getDataRange().getValues();
  for (let i = old.length - 1; i >= 1; i--) if (s_(old[i][0]) === id) sh.deleteRow(i + 1);
  const rows = [];
  for (let i = 0, n = 0; i < json.length; i += CHUNK, n++) rows.push([id, n, '#' + json.substr(i, CHUNK)]);
  const start = sh.getLastRow() + 1;
  sh.getRange(start, 3, rows.length, 1).setNumberFormat('@');
  sh.getRange(start, 1, rows.length, 3).setValues(rows);
  cachePack_(id, rows.map(function (r) { return r[2]; }));
}
function cachePack_(id, parts) {
  try {
    const m = {};
    parts.forEach(function (p, i) { m['Q1_' + id + '_' + i] = p; });
    m['Q1_' + id + '_n'] = String(parts.length);
    cache_().putAll(m, 21600);
  } catch (e) { /* vyrovnávacia pamäť je len zrýchlenie */ }
}
function loadPack_(id) {
  try {
    const n = +cache_().get('Q1_' + id + '_n');
    if (n) {
      const keys = []; for (let i = 0; i < n; i++) keys.push('Q1_' + id + '_' + i);
      const got = cache_().getAll(keys);
      if (keys.every(function (k) { return got[k]; })) return JSON.parse(keys.map(function (k) { return got[k].slice(1); }).join(''));
    }
  } catch (e) { /* čítame z hárka */ }
  const sh = ss_().getSheetByName(SH.packs);
  if (!sh) fail_('no_pack');
  const parts = sh.getDataRange().getValues().filter(function (r) { return s_(r[0]) === id; }).sort(function (a, b) { return a[1] - b[1]; }).map(function (r) { return String(r[2]); });
  if (!parts.length) fail_('no_pack');
  cachePack_(id, parts);
  return JSON.parse(parts.map(function (p) { return p.slice(1); }).join(''));
}
// Otázky pre žiaka: bez správnej odpovede.
function publicQs_(pack, keys) {
  const out = {};
  keys.forEach(function (k) { const q = pack.q[k]; if (q) out[k] = { q: q.q, opts: q.opts, img: q.img || '' }; });
  return out;
}

/* ---------- prihlásenia (zámok mena na jedno zariadenie) ---------- */
function logins_(id) { try { return JSON.parse(props_().getProperty('L1_' + id)) || { p: {}, f: [] }; } catch (e) { return { p: {}, f: [] }; } }
function saveLogins_(id, L) { if (L.f.length > 30) L.f = L.f.slice(-30); props_().setProperty('L1_' + id, JSON.stringify(L)); }
// Začiatok písania a počet odchodov každého žiaka: {žiak: [čas začiatku v ms, odchody]}. Samostatne od prihlásení,
// aby po odomknutí (iné zariadenie) žiak pokračoval so zvyšným časom a odchody sa nestratili. Nový pokus ich maže.
function starts_(id) { try { return JSON.parse(props_().getProperty('S1_' + id)) || {}; } catch (e) { return {}; } }
function saveStarts_(id, S) { props_().setProperty('S1_' + id, JSON.stringify(S)); }
// Vlastnosti skriptu majú obmedzené miesto: prihlásenia testov starších než 60 dní (podľa stĺpca vytvorený v hárku Testy) sa mažú.
// Výsledky v tabuľke ostávajú.
function pruneLogins_(t) {
  const cI = t.col('id testu'), cV = t.col('vytvoreny');
  if (cI < 0 || cV < 0) return;
  const limit = Utilities.formatDate(new Date(Date.now() - 60 * 864e5), tz_(), 'yyyy-MM-dd'), old = {};
  t.rows.forEach(function (r) { const id = s_(r[cI]), c = s_(r[cV]).slice(0, 10); if (id && /^\d{4}-\d\d-\d\d$/.test(c) && c < limit) old[id] = 1; });
  Object.keys(props_().getProperties()).forEach(function (k) {
    const m = /^[LS]1_(.+)$/.exec(k);
    if (m && old[m[1]]) props_().deleteProperty(k);
  });
}

/* ---------- výsledky ---------- */
// Hárok výsledkov sa volá „Res_<id testu>“ (do verzie 1.2 „Výsledky <id>“; starý názov sa pri prvom použití premenuje).
function resultsName_(id) { return 'Res_' + id; }
function oldResultsName_(id) { return 'Výsledky ' + id; }
function resultsGet_(id) {
  const sh = ss_().getSheetByName(resultsName_(id));
  if (sh) return sh;
  const old = ss_().getSheetByName(oldResultsName_(id));
  if (old) old.setName(resultsName_(id));
  return old;
}
// Nový hárok výsledkov ide hneď za hárok Testy, takže najnovší je vľavo.
function afterTests_() { const t = ss_().getSheetByName(SH.tests); return t ? t.getIndex() : ss_().getSheets().length; }
// Popis otázky v hlavičke výsledkov: „A3. Text otázky“ (bez skupín „3. …“), aby učiteľ v tabuľke vedel, o ktorú ide.
function qLabels_(test, pack) {
  return test.keys.map(function (k) {
    const q = pack.q[k] || {}, ga = test.keysA.indexOf(k), gb = test.keysB.indexOf(k);
    const tag = !test.groups ? (test.keys.indexOf(k) + 1) + '.' : ga >= 0 && gb >= 0 ? 'A' + (ga + 1) + '/B' + (gb + 1) + '.' : ga >= 0 ? 'A' + (ga + 1) + '.' : 'B' + (gb + 1) + '.';
    const txt = String(q.q || k);
    return tag + ' ' + (txt.length > 60 ? txt.slice(0, 58) + '…' : txt);
  });
}
// Hárok výsledkov: odoslané | žiak | skupina | výsledok (%) | body | otázky (písmeno a ✓ / ✗) | odchody | odpovede | príznak.
// Stĺpce otázok idú hneď za stĺpcom body v poradí test.keys.
function createResultsSheet_(test, pack) {
  const names = qLabels_(test, pack), head = RES_FIXED.concat(names).concat(RES_TAIL);
  const sh = ss_().insertSheet(resultsName_(test.id), afterTests_());
  if (sh.getMaxColumns() < head.length) sh.insertColumnsAfter(sh.getMaxColumns(), head.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#d9d9d9').setWrap(true);
  sh.setFrozenRows(1); sh.setFrozenColumns(2);
  sh.getRange(2, 4, 500, 1).setNumberFormat('0%');
  if (names.length) {
    sh.getRange(2, RES_FIXED.length + 1, 500, names.length).setHorizontalAlignment('center');
    // celé znenie otázky s možnosťami ako poznámka k hlavičke
    sh.getRange(1, RES_FIXED.length + 1, 1, names.length).setNotes([test.keys.map(function (k) { return headNote_(pack.q[k]); })]);
  }
  return sh;
}
function resultsSheet_(test, pack) { return resultsGet_(test.id) || createResultsSheet_(test, pack || loadPack_(test.id)); }
// Text do bunky otázky: písmeno odpovede (podľa hárka Otázky) so značkou správne/nesprávne.
function cellFor_(q, a, ended) {
  if (a === null || a === undefined) return ended ? WHY.ended : WHY.none;
  return LETTERS[a] + (a === q.ok ? ' ✓' : ' ✗');
}
// Poznámky k bunkám: celé znenie odpovede žiaka a správnej odpovede (písmená podľa hárka Otázky).
function optText_(q, i) { return LETTERS[i] + ') ' + q.opts[i]; }
function noteFor_(q, a) {
  if (!q) return '';
  const ok = 'Správne: ' + optText_(q, q.ok);
  if (a === null || a === undefined) return 'Bez odpovede\n' + ok;
  return a === q.ok ? 'Zvolil: ' + optText_(q, a) + ' ✓' : 'Zvolil: ' + optText_(q, a) + '\n' + ok;
}
function headNote_(q) {
  if (!q) return '';
  return q.q + '\n\n' + q.opts.map(function (o, i) { return LETTERS[i] + ') ' + o + (i === q.ok ? '  ✓' : ''); }).join('\n');
}
// Body a percentá: správne odpovede / počet otázok žiaka, za prvý odchod mínus LEAVE_PENALTY (najmenej 0).
function scoreOf_(pack, keys, ans, leaves) {
  let ok = 0;
  keys.forEach(function (k) { const q = pack.q[k]; if (q && ans[k] === q.ok) ok++; });
  const p = keys.length ? ok / keys.length : 0;
  return { ok: ok, n: keys.length, pct: Math.max(0, p - (leaves > 0 ? LEAVE_PENALTY : 0)) };
}
function appendResult_(sh, vals, cells, notes) {
  const t = tableOf_(sh), row = t.head.map(function () { return ''; }), nrow = row.slice();
  Object.keys(vals).forEach(function (k) { const i = t.col(k); if (i >= 0) row[i] = vals[k]; });
  const first = t.need('body') + 1;
  (cells || []).forEach(function (v, i) { if (first + i < row.length) row[first + i] = v; });
  (notes || []).forEach(function (v, i) { if (first + i < row.length) nrow[first + i] = v; });
  const r = sh.getLastRow() + 1, rng = sh.getRange(r, 1, 1, row.length);
  rng.setValues([row]);
  if (notes && notes.length) rng.setNotes([nrow]);
}
// Riadky výsledkov. Neprítomný žiak má riadok s textom „neprítomný“ namiesto percent; učiteľ má riadok s menom Učiteľ.
function readResults_(test) {
  const sh = resultsGet_(test.id);
  if (!sh) return [];
  const t = tableOf_(sh), cN = t.need('ziak'), cS = t.col('odoslane'), cO = t.col('odpovede'), cF = t.col('priznak'), cR = t.need('vysledok'), cG = t.col('skupina'), cL = t.col('odchody'), cB = t.col('body');
  const out = [];
  t.rows.forEach(function (row, ri) {
    if (!s_(row[cN])) return;
    const g = cG >= 0 ? s_(row[cG]).toUpperCase() : '';
    let ans = {}; try { ans = JSON.parse(String(row[cO]) || '{}') || {}; } catch (e) { ans = {}; }
    const rv = row[cR];
    out.push({ row: ri + 2, pupilId: pupilKey_(test.cls, row[cN]), name: s_(row[cN]), sent: s_(row[cS]), group: g, keys: groupKeys_(test, g), leaves: cL >= 0 ? num_(row[cL]) || 0 : 0,
      ans: ans, pct: typeof rv === 'number' ? rv : null, points: cB >= 0 ? s_(row[cB]) : '', ended: cF >= 0 && /ukončený po druhom odchode/.test(s_(row[cF])), flag: cF >= 0 ? s_(row[cF]) : '',
      absent: typeof rv !== 'number' && normName(rv) === normName(ABSENT), teacher: normName(row[cN]) === normName(TEACHER) });
  });
  return out;
}
// Zmaže riadky „neprítomný“ daného žiaka (prišiel neskôr alebo učiteľ označenie zrušil).
function clearAbsentRows_(test, label) {
  const sh = resultsGet_(test.id);
  if (!sh || sh.getLastRow() < 2) return;
  const t = tableOf_(sh), cN = t.need('ziak'), cR = t.need('vysledok');
  for (let i = t.rows.length - 1; i >= 0; i--) {
    const v = t.rows[i][cR];
    if (normName(t.rows[i][cN]) === normName(label) && typeof v !== 'number' && normName(v) === normName(ABSENT)) sh.deleteRow(i + 2);
  }
}
function teacherId_(test) { return pupilKey_(test.cls, TEACHER); }
// Kto sa prihlasuje: žiak zo zoznamu triedy alebo učiteľ (na vyskúšanie, nepočíta sa do priemeru).
function player_(test, pupilId) {
  if (pupilId === teacherId_(test)) return { id: pupilId, label: TEACHER, teacher: true, group: '' };
  const me = readPupils_().filter(function (p) { return p.cls === test.cls && p.active && p.id === pupilId; })[0];
  if (!me) fail_('not_in_class');
  return { id: me.id, label: me.label, group: me.group };
}
// Skupina v teste so skupinami: zo stĺpca Skupina; učiteľ a žiak bez skupiny píšu A.
function groupFor_(test, me) { return test.groups ? (me.group === 'B' ? 'B' : 'A') : ''; }

/* ---------- priebežne uložené odpovede (vyrovnávacia pamäť, 6 hodín) ---------- */
// Žiak ukladá odpovede počas testu; pri výmene zariadenia (odomknutí) pokračuje s nimi a učiteľ v prehľade vidí, koľko má hotovo.
function progKey_(testId, pupilId) { return 'G1_' + testId + '_' + Utilities.base64EncodeWebSafe(Utilities.newBlob(pupilId).getBytes()).replace(/=+$/, '').slice(0, 180); }
function progGet_(testId, pupilId) { try { return JSON.parse(cache_().get(progKey_(testId, pupilId)) || 'null'); } catch (e) { return null; } }
function progPut_(testId, pupilId, p) { try { cache_().put(progKey_(testId, pupilId), JSON.stringify(p), 21600); } catch (e) { /* len záloha */ } }
function progDel_(testId, pupilId) { try { cache_().remove(progKey_(testId, pupilId)); } catch (e) { /* nevadí */ } }
// Odpovede z aplikácie: {kľúč otázky: poradové číslo možnosti v hárku (0 = A)} len pre otázky žiakovej skupiny.
function cleanAns_(ans, keys, pack) {
  const out = {};
  if (!ans || typeof ans !== 'object') return out;
  keys.forEach(function (k) {
    const a = ans[k], q = pack && pack.q[k];
    if (typeof a === 'number' && a >= 0 && a < LETTERS.length && Math.floor(a) === a && (!q || a < q.opts.length)) out[k] = a;
  });
  return out;
}

/* ---------- žiak (verejné, bez kľúča) ---------- */
function pupilInit_(req) {
  const test = testCached_(String(req.t || ''));
  if (!test) fail_('no_test');
  const L = logins_(test.id);
  const names = readPupils_().filter(function (p) { return p.cls === test.cls && p.active; })
    .map(function (p) { const e = L.p[p.id]; return { id: p.id, label: p.label, done: !!(e && e.done) }; })
    .sort(function (a, b) { return a.label.localeCompare(b.label, 'sk'); });
  const tid = teacherId_(test), te = L.p[tid];
  names.push({ id: tid, label: TEACHER, done: !!(te && te.done), teacher: true });
  return { v: VERSION, id: test.id, cls: test.cls, state: test.state, total: test.total, n: test.keysA.length || test.keys.length, groups: test.groups, penalty: LEAVE_PENALTY,
    title: test.title, names: names };
}
function pupilLogin_(req) {
  const testId = String(req.t || ''), device = String(req.d || '').slice(0, 32);
  const test = testCached_(testId);
  if (!test) fail_('no_test');
  if (test.state === 'ready') fail_('not_started');
  if (test.state !== 'open') fail_('closed');
  const me = player_(test, String(req.p || ''));
  let wasAbsent = false;
  withLock_(function () {
    const L = logins_(testId), e = L.p[me.id];
    if (e && e.done) fail_('done');
    if (e && e.d !== device) {
      L.f.push({ p: me.id, t: now_('HH:mm:ss'), k: 'pokus o prihlásenie z iného zariadenia' });
      saveLogins_(testId, L);
      fail_('taken');
    }
    if (!e) {
      L.p[me.id] = { d: device, t: now_('HH:mm:ss'), n: me.label };
      if (L.a && L.a[me.id]) { delete L.a[me.id]; wasAbsent = true; }
      saveLogins_(testId, L);
    }
    if (wasAbsent) clearAbsentRows_(test, me.label);
  });
  const group = groupFor_(test, me), keys = groupKeys_(test, group), pack = loadPack_(testId);
  // Ak už žiak začal (napr. na inom zariadení pred odomknutím), pokračuje so zvyšným časom a s uloženými odpoveďami.
  const st = starts_(testId)[me.id], prog = progGet_(testId, me.id);
  const out = { ok: true, pid: me.id, name: me.label, group: group, total: test.total, penalty: LEAVE_PENALTY, shuffle: test.shuffle, keys: keys, qs: publicQs_(pack, keys), begun: !!st };
  if (st) { out.left = st[0] + test.total * 60000 - Date.now(); out.leaves = st[1] || 0; }
  if (prog) { out.ans = cleanAns_(prog.ans, keys, pack); out.marks = (prog.mk || []).filter(function (k) { return keys.indexOf(k) >= 0; }); }
  return out;
}
// Žiak ťukol na Začať: od tejto chvíle beží jeho celkový čas (na serveri, aby ho obnovenie stránky ani iné zariadenie nevrátilo).
function pupilBegin_(req) {
  const testId = String(req.t || ''), pupilId = String(req.p || ''), device = String(req.d || '').slice(0, 32);
  const test = testCached_(testId);
  if (!test) fail_('no_test');
  return withLock_(function () {
    const e = logins_(testId).p[pupilId];
    if (!e || e.d !== device) fail_('not_logged');
    if (e.done) fail_('done');
    const S = starts_(testId);
    if (!S[pupilId]) { S[pupilId] = [Date.now(), 0]; saveStarts_(testId, S); }
    return { ok: true, left: S[pupilId][0] + test.total * 60000 - Date.now(), total: test.total, leaves: S[pupilId][1] || 0 };
  });
}
// Priebežné uloženie odpovedí počas písania (len vyrovnávacia pamäť, do tabuľky sa píše až pri odovzdaní).
function pupilSave_(req) {
  const testId = String(req.t || ''), pupilId = String(req.p || ''), device = String(req.d || '').slice(0, 32);
  const e = logins_(testId).p[pupilId];
  if (!e || e.d !== device) fail_('not_logged');
  if (e.done) return { ok: true };
  const ans = cleanAns_(req.ans, Object.keys(req.ans || {}).slice(0, 200), null);
  const mk = [].concat(req.mk || []).map(String).filter(function (k) { return k.length < 40; }).slice(0, 200);
  progPut_(testId, pupilId, { ans: ans, mk: mk, n: Object.keys(ans).length, at: now_('HH:mm:ss') });
  return { ok: true };
}
// Žiak opustil test (iná karta alebo aplikácia). Zapíše sa hneď, aby to učiteľ videl v prehľade; leave = poradie odchodu.
function pupilEvent_(req) {
  const testId = String(req.t || ''), pupilId = String(req.p || ''), device = String(req.d || '').slice(0, 32);
  withLock_(function () {
    const L = logins_(testId), e = L.p[pupilId];
    if (!e || e.d !== device) return;
    L.f.push({ p: pupilId, t: now_('HH:mm:ss'), k: String(req.what || '').slice(0, 80) });
    saveLogins_(testId, L);
    const n = Math.min(9, Math.max(0, parseInt(req.leave, 10) || 0));
    if (n) {
      const S = starts_(testId);
      if (S[pupilId] && (S[pupilId][1] || 0) < n) { S[pupilId][1] = n; saveStarts_(testId, S); }
    }
  });
  return { ok: true };
}
function pupilSubmit_(req) {
  const testId = String(req.t || ''), pupilId = String(req.p || ''), device = String(req.d || '').slice(0, 32);
  const test = testCached_(testId);
  if (!test) fail_('no_test');
  const L0 = logins_(testId), e0 = L0.p[pupilId];
  if (!e0 || e0.d !== device) fail_('not_logged');
  if (e0.done) return { ok: true, already: true };
  const me = player_(test, pupilId), group = groupFor_(test, me);
  const keys = groupKeys_(test, group), pack = loadPack_(testId), ans = cleanAns_(req.ans, keys, pack);
  const st = starts_(testId)[pupilId] || null, ended = !!req.ended;
  const leaves = Math.max(Math.min(9, parseInt(req.leaves, 10) || 0), st ? st[1] || 0 : 0, ended ? 2 : 0);
  const sc = scoreOf_(pack, keys, ans, leaves), miss = [];
  const cells = test.keys.map(function (k) {
    if (keys.indexOf(k) < 0) return '';
    if (ans[k] === undefined) miss.push(keys.indexOf(k) + 1);
    return cellFor_(pack.q[k], ans[k], ended);
  });
  const notes = test.keys.map(function (k) { return keys.indexOf(k) < 0 ? '' : noteFor_(pack.q[k], ans[k]); });
  withLock_(function () {
    const L = logins_(testId), e = L.p[pupilId];
    if (e && e.done) return;
    const sh = resultsSheet_(test, pack);
    const flags = L.f.filter(function (x) { return x.p === pupilId && x.k.indexOf('odchod') !== 0; }).map(function (x) { return x.k + ' ' + x.t; });
    if (leaves > 0) flags.push('odchod z testu: ' + leaves + '× (−' + Math.round(LEAVE_PENALTY * 100) + ' %)');
    if (ended) flags.push('test ukončený po druhom odchode');
    if (st && Date.now() > st[0] + test.total * 60000 + GRACE_MS) flags.push('odovzdané po čase (+' + Math.round((Date.now() - st[0]) / 60000 - test.total) + ' min)');
    if (miss.length) flags.push((ended ? 'nedokončené: ' : 'bez odpovede: ') + miss.length + '×');
    appendResult_(sh, { odoslane: now_(), ziak: me.label, skupina: group, vysledok: sc.pct, body: sc.ok + '/' + sc.n, odchody: leaves, odpovede: JSON.stringify(ans), priznak: flags.join('; ') }, cells, notes);
    L.p[pupilId] = { d: device, t: e ? e.t : now_('HH:mm:ss'), n: me.label, done: 1 };
    saveLogins_(testId, L);
  });
  progDel_(testId, pupilId);
  return { ok: true };
}
function pupilState_(req) {
  const test = testCached_(String(req.t || ''));
  if (!test) fail_('no_test');
  return { state: test.state };
}
// Po uzavretí testu: výsledok žiaka, pri nastavení „odpovede“ aj jeho odpovede so správnymi.
function pupilResult_(req) {
  const testId = String(req.t || ''), pupilId = String(req.p || ''), device = String(req.d || '').slice(0, 32);
  const test = testCached_(testId);
  if (!test) fail_('no_test');
  if (test.state !== 'closed') fail_('not_closed');
  const left = reviewLeft_(test);
  if (!left) fail_('review_over');
  const e = logins_(testId).p[pupilId];
  if (!e || e.d !== device) fail_('not_logged');
  const mine = readResults_(test).filter(function (r) { return r.pupilId === pupilId.split('#')[0] && !r.absent; }).pop();
  if (!mine) fail_('no_result');
  const pack = loadPack_(testId), sc = scoreOf_(pack, mine.keys, mine.ans, mine.leaves);
  const out = { name: mine.name, cls: test.cls, title: test.title, sent: mine.sent, group: mine.group, ok: sc.ok, n: sc.n, pct: sc.pct, leaves: mine.leaves, penalty: LEAVE_PENALTY,
    ended: mine.ended, reveal: test.reveal, left: left };
  if (test.reveal === 'all') {
    out.keys = mine.keys; out.ans = mine.ans; out.qs = {};
    mine.keys.forEach(function (k) { const q = pack.q[k]; if (q) out.qs[k] = { q: q.q, opts: q.opts, img: q.img || '', ok: q.ok }; });
  }
  return out;
}

/* ---------- usporiadanie hárkov výsledkov a premenovanie starých id (pred 1.3: 9A-261025-1949 -> 9A_10-25_19:49) ---------- */
// Zoradí hárky výsledkov hneď za hárok Testy: najnovší test vľavo.
function organizeResults_() {
  const tests = ss_().getSheetByName(SH.tests);
  if (!tests) return;
  const t = testsTable_(), cI = t.need('id testu'), active = ss_().getActiveSheet();
  // riadky v hárku Testy idú podľa času vytvorenia; najstarší sa presúva prvý, každý ďalší sa vloží pred neho
  t.rows.forEach(function (r) {
    const id = s_(r[cI]), sh = id ? resultsGet_(id) : null;
    if (!sh) return;
    const ti = tests.getIndex(), si = sh.getIndex();
    ss_().setActiveSheet(sh);
    ss_().moveActiveSheet(si < ti ? ti : ti + 1);
  });
  if (active) try { ss_().setActiveSheet(active); } catch (e) { /* nevadí */ }
}
function organizeResults() { withLock_(function () { renameOldIds_(); organizeResults_(); }); setOwnProp_('RESORD', '1'); }
// Staré id ostávajú ako prezývky: odkazy, QR kódy a odkazy pre dozor so starým id fungujú ďalej.
function aliases_() { try { return JSON.parse(ownProp_('ALIAS') || '{}') || {}; } catch (e) { return {}; } }
function renameOldIds_() {
  const t = testsTable_(), cI = t.need('id testu'), al = aliases_(), map = {};
  const ids = t.rows.map(function (r) { return s_(r[cI]); });
  ids.forEach(function (id, i) {
    const m = /^([0-9A-Za-z]*)-\d\d(\d\d)(\d\d)-(\d\d)(\d\d)([a-z]?)$/.exec(id);
    if (!m) return;
    let nid = (m[1] || 'test') + '_' + m[2] + '-' + m[3] + '_' + m[4] + ':' + m[5] + m[6];
    for (let k = 97; ids.indexOf(nid) >= 0 || ss_().getSheetByName(resultsName_(nid)); k++) nid = nid.replace(/[a-z]?$/, String.fromCharCode(k));
    map[id] = nid; ids[i] = nid;
  });
  const olds = Object.keys(map);
  if (!olds.length) return;
  // hárok Testy
  t.sheet.getRange(2, cI + 1, ids.length, 1).setNumberFormat('@').setValues(ids.map(function (x) { return [x]; }));
  // hárky výsledkov
  olds.forEach(function (o) {
    const sh = ss_().getSheetByName(resultsName_(o)) || ss_().getSheetByName(oldResultsName_(o));
    if (sh) sh.setName(resultsName_(map[o]));
  });
  // balíky testov
  const pk = ss_().getSheetByName(SH.packs);
  if (pk && pk.getLastRow() > 1) {
    const rng = pk.getRange(2, 1, pk.getLastRow() - 1, 1), v = rng.getValues();
    rng.setNumberFormat('@').setValues(v.map(function (r) { const o = s_(r[0]); return [map[o] || o]; }));
  }
  // prihlásenia a začiatky písania
  const all = props_().getProperties();
  Object.keys(all).forEach(function (k) {
    const m = /^([LS]1_)(.+)$/.exec(k);
    if (m && map[m[2]]) { props_().setProperty(m[1] + map[m[2]], all[k]); props_().deleteProperty(k); }
  });
  olds.forEach(function (o) { al[o] = map[o]; forgetTest_(o); });
  Object.keys(al).forEach(function (o) { if (map[al[o]]) al[o] = map[al[o]]; });
  setOwnProp_('ALIAS', JSON.stringify(al));
}

/* ---------- písomky žiakov ako PDF na Disk ---------- */
const EXPORT_DIR = 'Písomky – žiaci';
function exportFolder_(testId) {
  const it = DriveApp.getFileById(ss_().getId()).getParents(), root = it.hasNext() ? it.next() : DriveApp.getRootFolder();
  const sub = function (parent, name) { const f = parent.getFoldersByName(name); return f.hasNext() ? f.next() : parent.createFolder(name); };
  return sub(sub(root, EXPORT_DIR), testId);
}
// Obrázok otázky vložený priamo do PDF (prevod HTML na PDF obrázky z internetu sám nesťahuje). Chyba = bez obrázka.
const IMG_MEMO = {};
function imgData_(url) {
  if (IMG_MEMO[url] !== undefined) return IMG_MEMO[url];
  let out = '';
  try {
    const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
    const b = r.getBlob(), ct = b.getContentType() || '';
    if (r.getResponseCode() === 200 && /^image\//.test(ct) && b.getBytes().length < 3e6) out = 'data:' + ct + ';base64,' + Utilities.base64Encode(b.getBytes());
  } catch (e) { out = ''; }
  IMG_MEMO[url] = out;
  return out;
}
function h_(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
// Písomka jedného žiaka: hlavička s výsledkom, potom každá otázka so všetkými možnosťami; zvolená a správna sú vyznačené.
function pupilSheetHtml_(test, pack, r) {
  const sc = scoreOf_(pack, r.keys, r.ans, r.leaves);
  let html = '<html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,sans-serif;font-size:11pt;color:#18262a;margin:0}h1{font-size:16pt;margin:0 0 2pt}' +
    '.meta{color:#56666a;font-size:9.5pt;margin-bottom:10pt}.score{font-size:13pt;font-weight:bold;margin:6pt 0 12pt}' +
    '.q{border-top:1px solid #c9d3cd;padding:7pt 0;page-break-inside:avoid}.qt{font-weight:bold;margin-bottom:4pt}' +
    '.tag{font-weight:normal;font-size:9pt;padding:1pt 5pt;border-radius:3pt;margin-left:6pt}.ok{background:#dcefe2;color:#1d6b38}.bad{background:#f7dede;color:#9c2a2a}.none{background:#eee;color:#56666a}' +
    '.o{margin:1.5pt 0 1.5pt 10pt}.o.right{color:#1d6b38;font-weight:bold}.o.wrong{color:#9c2a2a;text-decoration:line-through}' +
    '.note{color:#56666a;font-size:9pt;margin-top:10pt}img{max-width:300pt;max-height:180pt;margin:3pt 0}</style></head><body>';
  html += '<h1>' + h_(r.name) + '</h1><div class="meta">' + h_([test.title, 'trieda ' + test.cls, r.group ? 'skupina ' + r.group : '', 'odovzdané ' + r.sent].filter(String).join(' · ')) + '</div>';
  html += '<div class="score">Výsledok: ' + Math.round(sc.pct * 100) + ' % (' + sc.ok + ' z ' + sc.n + ')' +
    (r.leaves > 0 ? ' <span style="font-weight:normal;font-size:10pt">· za odchod z testu −' + Math.round(LEAVE_PENALTY * 100) + ' %</span>' : '') + '</div>';
  r.keys.forEach(function (k, i) {
    const q = pack.q[k]; if (!q) return;
    const a = r.ans[k], has = a !== undefined && a !== null;
    const tag = !has ? '<span class="tag none">bez odpovede</span>' : a === q.ok ? '<span class="tag ok">správne</span>' : '<span class="tag bad">nesprávne</span>';
    const img = q.img ? imgData_(q.img) : '';
    html += '<div class="q"><div class="qt">' + (i + 1) + '. ' + h_(q.q) + tag + '</div>' + (img ? '<img src="' + img + '">' : '');
    q.opts.forEach(function (o, j) {
      const cls = j === q.ok ? 'right' : j === a ? 'wrong' : '';
      const mark = j === q.ok && j === a ? ' ✓ (odpoveď žiaka)' : j === q.ok ? ' ✓ správna' : j === a ? ' ✗ (odpoveď žiaka)' : '';
      html += '<div class="o ' + cls + '">' + LETTERS[j] + ') ' + h_(o) + mark + '</div>';
    });
    html += '</div>';
  });
  html += '<div class="note">Písmená možností sú podľa hárka Otázky; ak sa v teste miešali, žiak ich mohol vidieť v inom poradí.</div></body></html>';
  return html;
}
// Uloží písomku jedného žiaka (riadok hárka výsledkov) ako PDF do priečinka testu. Rovnomenný starší súbor ide do koša.
function tExportPupil_(req) {
  const f = findTest_(String(req.t || ''));
  if (!f) fail_('no_test');
  const test = f.test, pack = loadPack_(test.id), row = parseInt(req.row, 10);
  const r = readResults_(test).filter(function (x) { return x.row === row && !x.absent; })[0];
  if (!r) fail_('no_result');
  const folder = exportFolder_(test.id);
  const name = (test.cls + ' ' + r.name + '.pdf').replace(/[\\/:*?"<>|]/g, '_');
  const old = folder.getFilesByName(name); while (old.hasNext()) old.next().setTrashed(true);
  const pdf = Utilities.newBlob(pupilSheetHtml_(test, pack, r), 'text/html', name).getAs('application/pdf').setName(name);
  const file = folder.createFile(pdf);
  return { url: file.getUrl(), folderUrl: folder.getUrl() };
}

/* ---------- učiteľ (s kľúčom) a dozor (s kľúčom jedného testu) ---------- */
function tInit_() {
  ensureBaseSheets_();
  // jednorazovo po aktualizácii na 1.3: premenovanie starších testov a hárkov výsledkov, zoradenie
  if (ownProp_('RESORD') !== '1') { try { withLock_(function () { renameOldIds_(); organizeResults_(); }); setOwnProp_('RESORD', '1'); } catch (e) { /* skúsi sa znova nabudúce */ } }
  const pupils = readPupils_(), classes = {};
  pupils.filter(function (p) { return p.active; }).forEach(function (p) { (classes[p.cls] = classes[p.cls] || []).push(p.label); });
  const t = testsTable_();
  const tests = t.rows.map(function (r) { return testObj_(t, r); }).filter(function (x) { return x.id; })
    .map(function (x) { return { id: x.id, created: x.created, cls: x.cls, bank: x.bank, title: x.title, n: (x.groups ? x.keysA : x.keys).length, groups: x.groups, total: x.total, state: x.state }; });
  return { v: VERSION, classes: classes, groups: classGroups_(pupils), penalty: LEAVE_PENALTY, tests: tests, bank: readBank_(), sheetUrl: ss_().getUrl(), sheetName: ss_().getName() };
}
// cfg: {cls, bank (názov testu v hárku Otázky), title, total (min), state, shuffle, reveal ('all'|'pct'), only ('all'|'A'|'B' pri triede bez skupín)}
// Otázky si skript prečíta z hárka Otázky sám a uloží ich snímku (balík) k testu.
function tCreateTest_(req) {
  const cfg = req.cfg || {}, cls = String(cfg.cls || '').trim();
  if (!cls) fail_('bad_request');
  const bank = readBank_().tests.filter(function (x) { return normName(x.name) === normName(cfg.bank); })[0];
  if (!bank || !bank.qs.length) fail_('no_questions', String(cfg.bank || ''));
  const cg = classGroups_(readPupils_())[cls] || { A: 0, B: 0, none: [] };
  const qsA = bank.qs.filter(function (q) { return q.g !== 'B'; }), qsB = bank.qs.filter(function (q) { return q.g !== 'A'; });
  const groups = bank.A > 0 && bank.B > 0 && cg.A > 0 && cg.B > 0;
  let keysA, keysB = [];
  const ks = function (list) { return list.map(function (q) { return q.k; }); };
  if (groups) { keysA = ks(qsA); keysB = ks(qsB); }
  else keysA = ks(cfg.only === 'A' ? qsA : cfg.only === 'B' ? qsB : bank.qs);
  if (!keysA.length) fail_('no_questions', bank.name);
  const total = Math.max(1, Math.min(240, Math.round(Number(cfg.total) || 10)));
  const pack = { v: 1, bank: bank.name, q: {} };
  bank.qs.forEach(function (q) { if (keysA.indexOf(q.k) >= 0 || keysB.indexOf(q.k) >= 0) pack.q[q.k] = { q: q.q, opts: q.opts, ok: q.ok, img: q.img, g: q.g, row: q.row }; });
  return withLock_(function () {
    const t = testsTable_();
    // id: trieda_mesiac-deň_hodina:minúta, napr. 9A_10-25_19:49 (pri zhode sa pridá písmeno: 9A_10-25_19:49a)
    let id = (cls.replace(/[^0-9A-Za-z]/g, '').slice(0, 8) || 'test') + '_' + now_('MM-dd_HH:mm');
    const ids = t.rows.map(function (r) { return s_(r[t.need('id testu')]); });
    for (let k = 97; ids.indexOf(id) >= 0 || ss_().getSheetByName(resultsName_(id)) || ss_().getSheetByName(oldResultsName_(id)); k++) id = id.replace(/[a-z]?$/, String.fromCharCode(k));
    const row = t.head.map(function () { return ''; });
    const put = function (p, v) { const i = t.col(p); if (i >= 0) row[i] = v; };
    put('id testu', id); put('vytvoreny', now_('yyyy-MM-dd HH:mm')); put('trieda', cls); put('test z banky', bank.name);
    put('nazov', String(cfg.title || bank.name).slice(0, 80)); put('stav', cfg.state === 'ready' ? STATE.ready : STATE.open); put('celkovy cas', total);
    put('pocet', keysA.length); put('skupiny', groups ? 'A/B' : cfg.only === 'A' || cfg.only === 'B' ? 'len ' + cfg.only : '');
    put('miesat', cfg.shuffle === false ? 'nie' : 'áno'); put('ziak po', cfg.reveal === 'pct' ? REVEAL.pct : REVEAL.all);
    put('otazky a', keysA.join('; ')); put('otazky b', keysB.join('; '));
    const r = t.sheet.getLastRow() + 1;
    t.sheet.getRange(r, 1, 1, row.length).setNumberFormat('@').setValues([row.map(function (v) { return typeof v === 'number' ? v : String(v); })]);
    const test = { id: id, groups: groups, keysA: keysA, keysB: keysB, keys: uniq_(keysA.concat(keysB)) };
    savePack_(id, pack);
    createResultsSheet_(test, pack);
    try { pruneLogins_(testsTable_()); } catch (e) { /* upratovanie nie je dôležité */ }
    return { id: id, cls: cls, dk: dozorKey_(id), total: total, n: keysA.length, groups: groups };
  });
}
function tTest_(req) {
  const f = findTest_(String(req.t || ''));
  if (!f) fail_('no_test');
  const test = f.test, L = logins_(test.id), S = starts_(test.id);
  const pupils = readPupils_().filter(function (p) { return p.cls === test.cls && p.active; })
    .map(function (p) { return { id: p.id, label: p.label, group: test.groups ? p.group || 'A' : '', nogroup: test.groups && !p.group }; })
    .sort(function (a, b) { return a.label.localeCompare(b.label, 'sk'); });
  pupils.push({ id: teacherId_(test), label: TEACHER, teacher: true, group: test.groups ? 'A' : '' });
  // Priebeh písania: koľko odpovedí má žiak uložených, odkedy píše a koľkokrát odišiel.
  const prog = {}, writing = Object.keys(L.p).filter(function (id) { return !L.p[id].done; });
  if (writing.length) {
    let got = {};
    try { got = cache_().getAll(writing.map(function (id) { return progKey_(test.id, id); })); } catch (e) { got = {}; }
    writing.forEach(function (id) {
      let p = null; try { p = JSON.parse(got[progKey_(test.id, id)] || 'null'); } catch (e) { p = null; }
      const st = S[id];
      if (p || st) prog[id] = { n: p ? p.n || 0 : 0, mk: p && p.mk ? p.mk.length : 0, lv: st ? st[1] || 0 : 0, left: st ? st[0] + test.total * 60000 - Date.now() : null };
    });
  }
  const out = { test: test, pupils: pupils, logins: L, prog: prog, penalty: LEAVE_PENALTY, results: readResults_(test) };
  if (!req.dozor) { out.dk = dozorKey_(test.id); if (req.withPack) out.pack = loadPack_(test.id); }
  return out;
}
function tSetTest_(req) {
  const f = findTest_(String(req.t || ''));
  if (!f) fail_('no_test');
  const patch = req.patch || {}, t = f.t;
  const set = function (p, v) { const i = t.col(p); if (i >= 0) t.sheet.getRange(f.rowIndex, i + 1).setValue(v); };
  if (patch.state) {
    set('stav', STATE[patch.state] || STATE.open);
    // čas uzavretia: od neho beží REVIEW_MIN minút, keď žiaci vidia výsledky
    const c = t.col('uzavrety o');
    if (c >= 0) t.sheet.getRange(f.rowIndex, c + 1).setNumberFormat('@').setValue(patch.state === 'closed' ? now_() : '');
  }
  if (patch.reveal && !req.dozor) set('ziak po', patch.reveal === 'pct' ? REVEAL.pct : REVEAL.all);
  forgetTest_(f.test.id);
  return { ok: true };
}
// Oprava správnej odpovede pri jednej otázke už vytvoreného testu (chyba v kľúči): zmení balík a prepočíta výsledky.
function tFixKey_(req) {
  const f = findTest_(String(req.t || ''));
  if (!f) fail_('no_test');
  const test = f.test, k = String(req.q || ''), ok = parseInt(req.ok, 10);
  return withLock_(function () {
    const pack = loadPack_(test.id), q = pack.q[k];
    if (!q || !(ok >= 0 && ok < q.opts.length)) fail_('bad_request');
    q.ok = ok;
    savePack_(test.id, pack);
    const sh = resultsGet_(test.id);
    let n = 0;
    if (sh && sh.getLastRow() > 1) {
      const tb = tableOf_(sh), cR = tb.need('vysledok'), cB = tb.need('body'), ci = cB + 1 + test.keys.indexOf(k);
      const rng = sh.getRange(2, 1, sh.getLastRow() - 1, tb.head.length), vals = rng.getValues();
      readResults_(test).forEach(function (r) {
        if (r.absent) return;
        const v = vals[r.row - 2], sc = scoreOf_(pack, r.keys, r.ans, r.leaves);
        v[cR] = sc.pct; v[cB] = sc.ok + '/' + sc.n;
        if (r.keys.indexOf(k) >= 0) { v[ci] = cellFor_(q, r.ans[k], r.ended); sh.getRange(r.row, ci + 1).setNote(noteFor_(q, r.ans[k])); }
        n++;
      });
      rng.setValues(vals);
      sh.getRange(1, ci + 1).setNote(headNote_(q));
    }
    return { ok: true, n: n };
  });
}
// Odomknutie: žiak sa prihlási na inom zariadení a pokračuje (čas aj odchody ostávajú).
// Pri žiakovi, ktorý už odovzdal, je to nový pokus: začína od začiatku, s celým časom.
function tUnlock_(req) {
  const testId = String(req.t || ''), pid = String(req.p || '');
  withLock_(function () {
    const L = logins_(testId), e = L.p[pid];
    if (e && e.done) { const S = starts_(testId); if (S[pid]) { delete S[pid]; saveStarts_(testId, S); } progDel_(testId, pid); }
    delete L.p[pid]; saveLogins_(testId, L);
  });
  return { ok: true };
}
// Neprítomný žiak: v hárku výsledkov dostane riadok s textom „neprítomný“. on=false označenie zruší.
function tAbsent_(req) {
  const f = findTest_(String(req.t || ''));
  if (!f) fail_('no_test');
  const test = f.test, pid = String(req.p || '');
  if (pid === teacherId_(test)) fail_('bad_request');
  const me = readPupils_().filter(function (p) { return p.cls === test.cls && p.id === pid; })[0];
  if (!me) fail_('not_in_class');
  withLock_(function () {
    const L = logins_(test.id);
    L.a = L.a || {};
    if (req.on) {
      if (L.p[pid]) fail_('logged_in');
      if (!L.a[pid]) {
        appendResult_(resultsSheet_(test), { odoslane: now_(), ziak: me.label, skupina: groupFor_(test, me), vysledok: ABSENT, priznak: ABSENT }, []);
        L.a[pid] = 1;
      }
    } else {
      delete L.a[pid];
      clearAbsentRows_(test, me.label);
    }
    saveLogins_(test.id, L);
  });
  return { ok: true };
}
