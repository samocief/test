# Písomky

Online písomky s možnosťami A–F, s dopisovaním krátkej odpovede aj s číselnou odpoveďou pre žiakov na telefóne. Otázky, žiaci aj výsledky sú v Google Tabuľke učiteľa,
aplikácia beží na GitHub Pages: <https://samocief.github.io/test/>.

Funguje rovnako ako písomka v [Slepej mape](https://github.com/samocief/blindmap): žiaci naskenujú QR kód, vyberú svoje meno,
majú jeden spoločný čas, voľne sa presúvajú medzi otázkami, môžu si ich označiť vlajkou a vracať sa k nim.
Prvý odchod z testu (iná karta, iná aplikácia, zamknutie telefónu) strhne 10 % z výsledku, druhý test ukončí a odovzdá.

## Tabuľka učiteľa

| Hárok | Kto ho píše | Obsah |
|---|---|---|
| **Otázky** | učiteľ | Test, Skupina (A/B/prázdne = obe), Otázka, A–F (aspoň dve, pri dopisovaní prázdne), Správna (písmeno, odpovede oddelené `;` alebo číslo s odchýlkou `~`), Obrázok (odkaz), Aktívna |
| **Žiaci** | učiteľ | zasadací poriadok skopírovaný z Excelu: Trieda, Rad, A, B, A, B … (alebo zoznam: Trieda, Meno, Skupina, Aktívny) |
| Testy, Res_…, _balíky | skript | spustené písomky, výsledky (písmeno alebo napísaná odpoveď, ✓ / ✗ / ? na kontrolu), snímka otázok |

- Všetky riadky s rovnakým názvom v stĺpci **Test** tvoria jeden test.
- **Skupiny:** ak test má otázky pre A aj B a trieda má v hárku Žiaci žiakov v A aj B, každá skupina píše svoje otázky
  (otázky bez skupiny píšu obe). Trieda bez skupín píše podľa voľby učiteľa všetky otázky, len A alebo len B.
- **Zasadací poriadok v hárku Žiaci** (od verzie skriptu 1.7): celú tabuľku zasadacieho poriadku stačí skopírovať zo svojho Excelu do hárka Žiaci. Hlavička: `Trieda | Rad | A | B | A | B | …`. Každá bunka pod písmenom je jedno miesto, skupina žiaka je písmeno v hlavičke jeho stĺpca, prázdna bunka je prázdne miesto. Riadok bez triedy patrí k triede nad ním, zopakovaná hlavička sa preskočí, trieda „7A“ je to isté ako „7.A“. Skupiny teda idú po stĺpcoch: vedľa seba sedia rôzne skupiny, za sebou tá istá. Prepínač **Šachovnica** pri novom teste skupiny v každom druhom rade prehodí (podľa stĺpca Rad), takže inú skupinu má aj sused vpredu a vzadu. Hlavička môže mať aj ďalšie písmená (A/B/C), testy však zatiaľ majú len dve sady (A a B), žiaci ďalších skupín píšu A. Starší tvar hárka (Trieda | Meno | Skupina | Aktívny) funguje ďalej.
- Poradie otázok sa mieša vždy, poradie možností voliteľne (predvolene áno).
- Správne odpovede neodchádzajú do prehliadača žiaka. Opravuje skript tabuľky.
- Spustený test má vlastnú snímku otázok. Zmeny v hárku Otázky sa ho netýkajú; chybný kľúč sa opraví v aplikácii učiteľa
  (záložka Otázky, ťuknutím na písmeno správnej možnosti) a výsledky sa prepočítajú.
- Obrázok k otázke: odkaz na súbor na Disku zdieľaný „Každý, kto má odkaz“, alebo iný verejný odkaz (https).
  Obrázok vložený priamo do bunky skript neprečíta. Žiak si obrázok ťuknutím otvorí na celú obrazovku a môže ho zväčšiť.
- **Otázka s dopisovaním:** A–F prázdne, v stĺpci Správna jedna alebo viac správnych odpovedí oddelených bodkočiarkou (`Dunaj; Danube`).
  Na veľkých písmenách, diakritike, interpunkcii a medzerách nezáleží. Odpoveď s preklepom je „na kontrolu“ (0 bodov, kým ju učiteľ
  v záložke Otázky neuzná). Uznaná sa pripíše do stĺpca Správna a výsledky sa prepočítajú.
- **Číselná otázka:** A–F prázdne, v stĺpci Správna číslo, voliteľne s odchýlkou: `1989` presne, `1989~5` ±5, `750000000~20%` ±20 %,
  `750000000~5%~20%` do ±5 % plné body, potom lineárne menej až po 0 pri ±20 %. Body za otázku na desatiny.

## Nasadenie skriptu (raz)

1. Otvor tabuľku, **Rozšírenia → Apps Script**.
2. Celý obsah súboru `Code.gs` nahraď súborom [`apps-script/Code.gs`](apps-script/Code.gs) a ulož.
3. **Nasadiť → Nové nasadenie → Typ: Webová aplikácia.** Spustiť ako: *ja*, Kto má prístup: *ktokoľvek*. Nasadiť a povoliť prístup.
4. Obnov tabuľku. V ponuke **Písomky → Otvoriť aplikáciu učiteľa** vlož pri prvom otvorení adresu webovej aplikácie (končí na `/exec`).

Po úprave `Code.gs`: **Nasadiť → Spravovať nasadenia → ceruzka → Verzia: Nová verzia → Nasadiť.** Adresa ostane rovnaká.

## Súbory

- `index.html`, `js/pupil.js`: stránka žiaka (`?s=<skript>&t=<test>`)
- `ucitel.html`, `js/teacher.js`: stránka učiteľa a dozoru
- `js/core.js`: spoločné pomôcky, `lang/sk.json`: všetky texty, `css/app.css`: vzhľad
- `apps-script/Code.gs`: skript tabuľky

© samocief
