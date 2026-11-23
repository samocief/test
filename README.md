# Písomky

Online písomky s možnosťami A–F, s dopisovaním krátkej odpovede aj s číselnou odpoveďou pre žiakov na telefóne. Otázky, žiaci aj výsledky sú v Google Tabuľke učiteľa,
aplikácia beží na GitHub Pages: <https://samocief.github.io/test/>.

Funguje rovnako ako písomka v [Slepej mape](https://github.com/samocief/blindmap): žiaci naskenujú QR kód, vyberú svoje meno,
majú jeden spoločný čas, voľne sa presúvajú medzi otázkami, môžu si ich označiť vlajkou a vracať sa k nim.
Kto odíde z testu (iná karta, aplikácia alebo okno, zamknutie telefónu) na viac než 5 s, tomu sa test zamkne a čas zastaví;
učiteľ ho v prehľade vráti bez trestu, so strhnutím 10 %, alebo mu test ukončí. Kratšie výpadky sa len zapíšu.
Ak písomka nestačí na čas, učiteľ v prehľade pridá žiakovi (alebo všetkým naraz) 2 minúty, aj opakovane. Žiakovi, ktorý už odovzdal, sa tým test znova otvorí s jeho odpoveďami (kým nie je test uzavretý).

## Tabuľka učiteľa

| Hárok | Kto ho píše | Obsah |
|---|---|---|
| **Otázky** | učiteľ | Test, Skupina (A/B/prázdne = obe), Otázka, A–F (aspoň dve, pri dopisovaní prázdne), Správna (písmeno, odpovede oddelené `;` alebo číslo s odchýlkou `~`), Obrázok (odkaz), Aktívna |
| **Žiaci** | učiteľ | zasadací poriadok skopírovaný z Excelu: Trieda, Rad, A, B, A, B … (alebo zoznam: Trieda, Meno, Skupina, Aktívny) |
| **Čas** | učiteľ | Meno, Čas: žiaci, ktorí majú na písomku viac času (prázdny Čas = +50 %, inak napr. `25 %` alebo `5 min`) |
| Testy, Res_…, _balíky | skript | spustené písomky, výsledky (písmeno alebo napísaná odpoveď, ✓ / ✗ / ? na kontrolu), snímka otázok |
| Archív | skript | výsledky archivovaných písomiek (jeden hárok pre všetky) |

- **Názov písomky** (od verzie 1.12) je zároveň jej id: odkaz a QR kód, hárok výsledkov `Res_<názov>` aj priečinok s PDF na Disku.
  Len písmená bez diakritiky, číslice, `-` a `_`, najviac 40 znakov, unikátny bez ohľadu na veľké písmená. Predvyplní sa podľa testu;
  ak nie je platný alebo už existuje, je červený a písomka sa nedá spustiť.

- Všetky riadky s rovnakým názvom v stĺpci **Test** tvoria jeden test.
- **Skupiny:** ak test má otázky pre A aj B a trieda má v hárku Žiaci žiakov v A aj B, každá skupina píše svoje otázky
  (otázky bez skupiny píšu obe). Trieda bez skupín píše podľa voľby učiteľa všetky otázky, len A alebo len B.
- **Zasadací poriadok v hárku Žiaci** (od verzie skriptu 1.7): celú tabuľku zasadacieho poriadku stačí skopírovať zo svojho Excelu do hárka Žiaci. Hlavička: `Trieda | Rad | A | B | A | B | …`. Každá bunka pod písmenom je jedno miesto, skupina žiaka je písmeno v hlavičke jeho stĺpca, prázdna bunka je prázdne miesto. Riadok bez triedy patrí k triede nad ním, zopakovaná hlavička sa preskočí, trieda „7A“ je to isté ako „7.A“. Skupiny teda idú po stĺpcoch: vedľa seba sedia rôzne skupiny, za sebou tá istá. Prepínač **Šachovnica** pri novom teste skupiny v každom druhom rade prehodí (podľa stĺpca Rad), takže inú skupinu má aj sused vpredu a vzadu. Hlavička môže mať aj ďalšie písmená (A/B/C), testy však zatiaľ majú len dve sady (A a B), žiaci ďalších skupín píšu A. Starší tvar hárka (Trieda | Meno | Skupina | Aktívny) funguje ďalej.
- **Viac času** (od verzie skriptu 1.9): do hárka Čas (vytvorí sa sám) skopíruj mená žiakov ako v hárku Žiaci, poradie mena a priezviska ani diakritika nevadí. Dostanú o 50 % viac (zaokrúhlené nahor na celé minúty), inú hodnotu napíš do stĺpca Čas. Čas sa žiakovi zafixuje, keď ťukne na Začať. Vidí ho len žiak sám, v prehľade učiteľa ani vo výsledkoch sa nezobrazuje.
- **Úprava pre dyslexiu** (od verzie skriptu 1.13): žiaci z hárka Čas majú v teste väčšie písmo a riadkovanie a tlačidlo s reproduktorom, ktoré prečíta otázku aj možnosti (hlasom telefónu, so slúchadlami). Meno „Učiteľ“ v hárku Čas zapne úpravu pre prihlásenie Učiteľ (na vyskúšanie).
- **Archív** (od verzie skriptu 1.14): v zozname písomiek **Archivovať** presunie výsledky uzavretej písomky do hárka Archív a hárok `Res_…` zmaže; **Obnoviť** ich vráti späť, **Vymazať** (len archivovaná) písomku zmaže natrvalo. PDF na Disku ostávajú.
- **PDF jedného žiaka:** tlačidlo PDF pri žiakovi v prehľade (napr. na rozhovor s rodičom), súbor s rovnakým menom sa nahradí.
- **Tlačiť / PDF:** v Novej písomke po výbere testu. Test na papier (skupiny na samostatných stranách), voliteľne väčšie písmo a riadkovanie pre dyslexiu a kľúč so správnymi odpoveďami. PDF cez „Uložiť ako PDF“ v okne tlače.
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
  `750000000~5%~20%` do ±5 % plné body, potom lineárne menej až po 0 pri ±20 %. Body za otázku na stotiny (celé percentá).

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
