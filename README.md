# Písomky

Online písomky s možnosťami A–F pre žiakov na telefóne. Otázky, žiaci aj výsledky sú v Google Tabuľke učiteľa,
aplikácia beží na GitHub Pages: <https://samocief.github.io/test/>.

Funguje rovnako ako písomka v [Slepej mape](https://github.com/samocief/blindmap): žiaci naskenujú QR kód, vyberú svoje meno,
majú jeden spoločný čas, voľne sa presúvajú medzi otázkami, môžu si ich označiť vlajkou a vracať sa k nim.
Prvý odchod z testu (iná karta, iná aplikácia, zamknutie telefónu) strhne 10 % z výsledku, druhý test ukončí a odovzdá.

## Tabuľka učiteľa

| Hárok | Kto ho píše | Obsah |
|---|---|---|
| **Otázky** | učiteľ | Test, Skupina (A/B/prázdne = obe), Otázka, A–F (aspoň dve), Správna (písmeno), Obrázok (odkaz), Aktívna |
| **Žiaci** | učiteľ | Trieda, Meno („Priezvisko Meno“), Skupina (A/B), voliteľne Aktívny |
| Testy, Výsledky …, _balíky | skript | spustené písomky, výsledky (písmeno odpovede, ✓ / ✗), snímka otázok |

- Všetky riadky s rovnakým názvom v stĺpci **Test** tvoria jeden test.
- **Skupiny:** ak test má otázky pre A aj B a trieda má v hárku Žiaci žiakov v A aj B, každá skupina píše svoje otázky
  (otázky bez skupiny píšu obe). Trieda bez skupín píše podľa voľby učiteľa všetky otázky, len A alebo len B.
- Poradie otázok sa mieša vždy, poradie možností voliteľne (predvolene áno).
- Správne odpovede neodchádzajú do prehliadača žiaka. Opravuje skript tabuľky.
- Spustený test má vlastnú snímku otázok. Zmeny v hárku Otázky sa ho netýkajú; chybný kľúč sa opraví v aplikácii učiteľa
  (záložka Otázky, ťuknutím na písmeno správnej možnosti) a výsledky sa prepočítajú.
- Obrázok k otázke: odkaz na súbor na Disku zdieľaný „Každý, kto má odkaz“, alebo iný verejný odkaz (https).

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
