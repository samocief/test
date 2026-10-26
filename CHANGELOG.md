# Zmeny

## 1.3 (2026-10-25) – treba vymeniť skript tabuľky

- **Id testu** má tvar `trieda_MM-dd_HH:mm`, napr. `9A_10-25_19:49`. **Hárok výsledkov** sa volá `Res_<id>` (napr. `Res_9A_10-25_19:49`)
  a nový ide hneď za hárok Testy: najnovší vľavo.
- Pri prvom otvorení aplikácie učiteľa po výmene skriptu sa staré testy premenujú (hárok Testy, výsledky, balíky, prihlásenia)
  a hárky zoradia. Staré odkazy, QR kódy a odkazy pre dozor fungujú ďalej. Znova: ponuka Písomky → Usporiadať hárky výsledkov.
- **Uložiť písomky na Disk (PDF)** v prehľade testu: pre každého žiaka PDF s výsledkom a všetkými otázkami, zvolená odpoveď
  a správna sú vyznačené. Ukladá sa do priečinka `Písomky – žiaci/<id testu>` vedľa tabuľky. Po výmene skriptu treba raz povoliť Disk: v editore skriptu vybrať funkciu `organizeResults`, Spustiť a potvrdiť povolenia.

## 1.2 (2026-10-25)

- **Výsledky len 15 minút po uzavretí.** Žiak vidí svoje vyhodnotenie 15 minút od uzavretia testu, potom zmizne zo stránky
  a ani po znovuotvorení odkazu sa už nezobrazí (chýbajúci žiaci ho o týždeň neuvidia). Dĺžka je `REVIEW_MIN` v Code.gs.
  Opätovným otvorením a uzavretím testu sa 15 minút spustí znova.
- **Poznámky s odpoveďami v hárku výsledkov.** Bunka otázky má poznámku „Zvolil: … / Správne: …“ s celým znením,
  hlavička otázky celé znenie otázky so všetkými možnosťami. Staršie hárky: ponuka Písomky → Doplniť poznámky s odpoveďami.

## 1.1 (2026-10-25)

- **Pás času a pás otázok sú pod sebou**, rovnako dlhé a začínajú na rovnakom mieste. Hneď vidno, či žiak stíha (pás otázok kratší ako pás času) alebo mešká.

## 1.0 (2026-10-23)

Prvá verzia, postavená na písomke zo Slepej mapy (2.15).

- Banka testov v hárku Otázky (Test, Skupina, Otázka, A–F, Správna, Obrázok, Aktívna), kontrola chýb v riadkoch.
- Skupiny A/B podľa hárka Žiaci; trieda bez skupín píše všetko, len A alebo len B.
- Žiak: výber mena, jeden celkový čas, voľná navigácia, vlajky, dve časomiery, miešanie otázok aj možností, odovzdanie s prehľadom.
- Stráženie odchodu: prvý odchod −10 %, druhý ukončí a odovzdá; obnovenie stránky sa ráta ako odchod.
- Opravovanie na serveri, správne odpovede nejdú do prehliadača žiaka počas písania.
- Učiteľ: pripravenie/spustenie, QR, dozor s papierom na tlač, prehľad, odomknutie, nový pokus, neprítomní, kopírovanie výsledkov,
  štatistika otázok s rozložením odpovedí a oprava kľúča s prepočtom výsledkov.
- Po uzavretí žiak vidí výsledok a podľa nastavenia aj svoje odpovede so správnymi.
