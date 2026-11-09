# Zmeny

## 1.5 (2026-11-09) – treba vymeniť skript tabuľky

- **Otázky s dopisovaním.** V hárku Otázky nechaj A–F prázdne a do stĺpca Správna napíš správnu odpoveď, viac odpovedí oddeľ
  bodkočiarkou (`Dunaj; Danube`). Žiak dostane namiesto možností políčko (bez automatických opráv a napovedania telefónu).
  Porovnáva sa bez ohľadu na veľké písmená, diakritiku, interpunkciu a medzery, pomlčka a lomka = medzera, desatinná čiarka = bodka.
- **Kontrola učiteľom.** Odpoveď, ktorá sa od správnej líši o preklep (do 6 písmen 1, dlhšie 2; krátke slová a čísla nie),
  je v hárku výsledkov označená `?` a je za 0 bodov, kým ju učiteľ nerozhodne. V aplikácii učiteľa (Prehľad upozorní, záložka Otázky)
  sú pri každej otázke na dopísanie rôzne odpovede žiakov s počtami: **Uznať** / **Zamietnuť**, uznať sa dá aj nesprávna (✗)
  a rozhodnutie sa dá zrušiť. Uznaná odpoveď platí pre všetkých, čo ju napísali rovnako, pripíše sa do stĺpca Správna v hárku Otázky
  a výsledky, bunky, poznámky aj výsledky žiakov sa prepočítajú.
- Dopisovanie je aj v poznámkach hárka výsledkov, v PDF písomkach a vo výsledkoch žiaka po uzavretí („učiteľ ešte skontroluje“).
- **Zväčšenie obrázka.** Ťuknutie na obrázok otázky (lupa v rohu) ho otvorí na celú obrazovku: dva prsty, dvojité ťuknutie,
  koliesko myši alebo +/−, posúvanie ťahaním, zatvorenie krížikom. Nepočíta sa to ako odchod z testu. Funguje aj vo výsledkoch.
- V tabuľke Písomky je zo stĺpca Správna odstránený rozbaľovací zoznam A–F a hárok Návod je doplnený.

## 1.4 (2026-10-26)

- **Stráž zmenšeného okna:** rozdelená obrazovka, plávajúce okno alebo zmenšený prehliadač počas testu hneď zakryje test. Ak žiak okno do 4 s nezväčší, počíta sa to ako odchod (raz za jedno zmenšenie). Otočenie telefónu ani priblíženie stránky (Ctrl +) to nespustí.
- **Kontrola pred začiatkom:** ak je okno oproti obrazovke príliš malé (napr. už rozdelená obrazovka), tlačidlo Začať žiaka nepustí, kým okno nezväčší.
- **Dôvod odchodu v udalostiach:** pri každom odchode sa zapíše aj dôvod (iná karta alebo aplikácia, iné okno, zatvorená alebo obnovená stránka, zmenšené okno). Odchody, ktoré nastanú naraz (napr. rozdelená obrazovka = iné okno aj zmenšené okno), sa rátajú ako jeden.
- Skript tabuľky sa nemení.

## 1.3 (2026-10-25) – treba vymeniť skript tabuľky

- **Id testu** má tvar `trieda_MM-dd_HH:mm`, napr. `9A_10-25_19:49`. **Hárok výsledkov** sa volá `Res_<id>` (napr. `Res_9A_10-25_19:49`)
  a nový ide hneď za hárok Testy: najnovší vľavo.
- Pri prvom otvorení aplikácie učiteľa po výmene skriptu sa staré testy premenujú (hárok Testy, výsledky, balíky, prihlásenia)
  a hárky zoradia. Staré odkazy, QR kódy a odkazy pre dozor fungujú ďalej. Znova: ponuka Písomky → Usporiadať hárky výsledkov.
- **Uložiť písomky na Disk (PDF)** v prehľade testu: pre každého žiaka PDF s výsledkom a všetkými otázkami, zvolená odpoveď
  a správna sú vyznačené. Ukladá sa do priečinka `Písomky – žiaci/<id testu>` vedľa tabuľky. Po výmene skriptu treba raz povoliť Disk: v editore skriptu vybrať funkciu `povolitDisk`, Spustiť a potvrdiť všetky povolenia, potom nasadiť novú verziu.

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
