# Zmeny

## 1.8 (2026-11-10) – treba vymeniť skript tabuľky

- Body za číselnú otázku sa zaokrúhľujú na 0,01 (celé percentá), nie na 0,1. Odpoveď tesne za pásmom plných bodov
  (napr. odchýlka 10,2 % pri `~10%~25%`) dostane 0,99 b, nie 1 b. Body žiaka sú na stotiny (`7,35/10`).

## 1.7 (2026-11-10) – treba vymeniť skript tabuľky

- **Hárok Žiaci = zasadací poriadok.** Celú tabuľku zo Skola.xlsx (hárok Sedenie) stačí vložiť do hárka Žiaci: `Trieda | Rad | A | B | A | B …`.
  Skupina žiaka je písmeno v hlavičke jeho stĺpca, prázdna bunka je prázdne miesto. Riadok bez triedy patrí k triede nad ním, zopakovaná hlavička sa preskočí.
  Starý tvar (Trieda | Meno | Skupina | Aktívny) funguje ďalej.
- **Šachovnica** (nový test, trieda so skupinami zo zasadacieho poriadku): v každom druhom rade sa skupiny prehodia, takže inú skupinu má aj sused vpredu a vzadu.
  Uloží sa do nového stĺpca `šachovnica` v hárku Testy. Bez nej idú skupiny po stĺpcoch (za sebou sedí tá istá skupina).
- Trieda „7A“ a „7.A“ je tá istá (staršie testy s „9.A“ nájdu žiakov aj po prechode na zasadací poriadok).
- Hlavička môže mať aj písmeno C a ďalšie (šachovnica ich posúva A→B→C→A), testy však majú zatiaľ len dve sady otázok; ďalšie skupiny píšu A.

## 1.6 (2026-11-10) – treba vymeniť skript tabuľky

- **Číselné otázky.** A–F prázdne, v stĺpci Správna číslo: `1989` (presne), `1989~5` (±5), `750000000~20%` (±20 %),
  `750000000~5%~20%` (do ±5 % plné body, potom lineárne menej až po 0 bodov pri ±20 %). Namiesto `~` sa dá napísať aj `±`,
  v čísle smú byť medzery a desatinná čiarka. Body za otázku sa zaokrúhľujú na 0,1.
- Žiak má pri číselnej otázke klávesnicu s číslicami a pod políčkom vidí, ako test číslo prečítal (`= 750 000 000`).
  Prijme sa aj `750.000.000`, `1,5 mld.` alebo `750 mil.`.
- Body v hárku výsledkov, v aplikácii učiteľa, v PDF aj u žiaka sú na desatiny (`7,3/10`). Bunka číselnej otázky: prečítané číslo
  a ✓ / ✗ alebo body (`780 000 000 (0,9 b)`). V záložke Otázky sú odpovede od najbližšej k správnej a úspešnosť je priemer bodov.
- Samotné číslo v stĺpci Správna (napr. `1989`) je odteraz číselná otázka (predtým dopisovanie): `1 989` alebo `1989.` je tiež správne.
- Chybný zápis (napr. prvá odchýlka väčšia ako druhá) ukáže Písomky → Skontrolovať otázky.

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
