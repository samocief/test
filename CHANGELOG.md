# Zmeny

## 1.15 (2026-11-24) – treba vymeniť skript tabuľky

- **Ponuka ⋯ pri každej písomke** (v zozname písomiek aj v prehľade písomky). V riadku zoznamu ostalo jedno tlačidlo: **Otvoriť**,
  pri archivovanej **Obnoviť**. Všetko ostatné je v ponuke; čo sa práve nedá, je sivé s vysvetlením (napr. „Najprv písomku uzavri“).
  Ponuka sa ovláda aj klávesnicou (šípky, Esc) a na telefóne sa zmestí na obrazovku. Dozor ponuku nemá.
- **Premenovať** (nie počas písania): nový názov = nové id. Premenuje sa hárok výsledkov `Res_…`, riadky v `_balíky` a v Archíve
  a priečinok s PDF na Disku. Starý odkaz, QR kód aj papier pre dozor fungujú ďalej (starý názov ostane obsadený, kým písomku nevymažeš).
  Dá sa premenovať aj späť alebo zmeniť len veľké a malé písmená.
- **Duplikovať / náhradný termín**: nová písomka s otázkami pôvodnej (aj s opraveným kľúčom, uznanými a anulovanými otázkami).
  - **Kto píše:** celá trieda, alebo **len tí, čo pôvodnú nepísali** (neprítomní a neprihlásení; okno ich vypíše). Ostatní sa
    na náhradný termín neprihlásia a v prehľade sú len títo žiaci. Názov sa predvyplní (`…_N`, pri kópii `…_2`).
  - **Otázky** (test so skupinami): ako pôvodná, **prehodiť skupiny** (skupina A píše otázky B a naopak), všetci A, všetci B alebo všetci všetko.
  - Pri kópii sa dá zvoliť iná trieda a čas. V hárku Testy pribudli stĺpce **žiaci** (náhradný termín) a **zdroj** (z ktorej písomky).
- **Prepočítať body**: po oprave kľúča v hárku Otázky. Aplikácia najprv ukáže, čo sa zmenilo (napr. „A3. … správna B → C“, nové
  správne odpovede na dopísanie, číslo a odchýlka, znenie), potom prepočíta body, percentá, bunky aj poznámky všetkých žiakov.
  Otázka sa hľadá podľa znenia, pri zmenenom znení podľa riadku. Otázku s iným počtom možností alebo iným typom vynechá (a povie prečo),
  lebo odpovede žiakov sú uložené ako poradie možnosti.
- **Anulovať otázku** (záložka Otázky, tlačidlo Anulovať pri otázke; z ponuky „Anulovať otázku…“): okno sa opýta, či
  **plný bod pre všetkých**, alebo **nezapočítať** (písomka má o bod menej, napr. 9 z 9). Dá sa zmeniť aj zrušiť. Výsledky sa prepočítajú,
  v hárku výsledkov je pri otázke `⊘`, žiak vo výsledkoch vidí „anulovaná – …“, v PDF tiež. Štatistika otázky ostáva skutočná.
- **Kopírovať známky**: okno so žiakmi podľa abecedy, percentami a známkou, nad tým stupnica (predvolene 1 od 90 %, 2 od 75 %, 3 od 50 %,
  4 od 25 %), dá sa zmeniť a zapamätá sa. Skopíruje sa meno a známka (dva stĺpce bez hlavičky), kto nepísal, má známku prázdnu.
- **Otvoriť otázky / Otvoriť výsledky v tabuľke**: otvorí hárok Otázky na prvom riadku testu, resp. hárok výsledkov (pri archivovanej Archív na jej riadkoch).
- **Náhľad ako žiak**: stránka žiaka v novej karte s otázkami písomky (výber skupiny, aj s úpravou pre dyslexiu). Nič sa neukladá,
  odchod z testu sa nestráži, po odovzdaní sa hneď ukáže vyhodnotenie.
- **Tlačiť / PDF** z ponuky: otázky spustenej písomky (s opraveným kľúčom), skupina A aj B / len A / len B, dyslexia, kľúč.
- **Poznámka k písomke** (len pre teba): v zozname pod názvom a v prehľade. Nový stĺpec **poznámka** v hárku Testy.
- **Výsledky v hárku `Res_…` sú vždy podľa abecedy** (učiteľ na konci; ďalší pokus žiaka hneď pod predošlým). Nový hárok výsledkov má
  **filter** na celom hárku. Staršie hárky filter nedostanú (pridáš ho sám: Údaje → Vytvoriť filter).
- **Kopírovať výsledky pre Excel** je tiež vždy podľa abecedy.
- Uloženie PDF jedného žiaka nájde žiaka podľa mena (riadky sa teraz pri odovzdaní presúvajú).
- So skriptom 1.14 aplikácia funguje ďalej; akcie, ktoré potrebujú nový skript, sú v ponuke sivé („Potrebuje skript tabuľky 1.15“).

## 1.14 (2026-11-23) – treba vymeniť skript tabuľky

- **Archív.** V zozname písomiek je pri uzavretej (aj nespustenej) písomke tlačidlo **Archivovať**. Hárok výsledkov `Res_<názov>` sa presunie
  do jedného spoločného hárka **Archív** (na konci tabuľky) a zmaže sa. Písomka ostane v zozname so stavom **Archivovaný** a dátumom.
  - Hárok Archív: písomka | č. | odoslané | žiak | skupina | výsledok (%) | body | riadok (dáta). Dá sa v ňom filtrovať podľa písomky;
    posledný stĺpec je celý pôvodný riadok, podľa ktorého sa písomka obnoví – ten neupravuj.
  - **Obnoviť** vráti hárok výsledkov späť (aj s poznámkami s odpoveďami) a riadky z Archívu odstráni. Písomka je potom uzavretá
    (nespustená ostane nespustená).
  - **Vymazať** je len pri archivovanej písomke, s potvrdením: zmaže ju natrvalo (Archív, hárok Testy, _balíky). PDF na Disku ostávajú.
    Názov sa tým uvoľní pre novú písomku.
  - Otvorenú písomku archivovať nemožno. Odkaz a QR kód archivovanej písomky žiakom ukážu, že test je uzavretý.
- **PDF jedného žiaka.** V prehľade písomky je pri každom, kto odovzdal, tlačidlo **PDF**: uloží jeho písomku do priečinka písomky na Disku
  (rovnaký ako pri „Uložiť písomky na Disk“) a ukáže odkaz na súbor. Ak súbor už existuje, nahradí sa. Dozor tlačidlo nemá.

## 1.13 (2026-11-20) – treba vymeniť skript tabuľky

- **Úprava pre dyslexiu pre žiakov z hárka Čas** (okrem viac času, ten sa nemení – predvolene +50 %, alebo hodnota v stĺpci Čas):
  - väčšie písmo, riadkovanie a medzery medzi písmenami a slovami (úvod, otázky, možnosti, políčko na odpoveď aj výsledky),
  - tlačidlo s reproduktorom vedľa otázky: prečíta nahlas otázku a možnosti v poradí, v akom ich žiak vidí („A: …, B: …“), práve čítaná časť sa zvýrazní.
    Ďalšie ťuknutie čítanie zastaví, pri prechode na inú otázku sa zastaví samo. Používa hlas telefónu (slovenský, ak ho nemá, český) – žiak potrebuje slúchadlá.
  - Ostatní žiaci nič nevidia. Na vyskúšanie napíš do hárka Čas meno **Učiteľ**: prihlásenie Učiteľ v teste dostane úpravu (čas navyše nie).
- **Tlačiť / PDF** v Novej písomke (vedľa Ukázať otázky): test z hárka Otázky na papier. Hlavička s menom, triedou, dátumom a bodmi,
  otázky v poradí z hárka, pri otázke na dopísanie alebo s číslom čiara. Voľby: skupina A aj B (každá na samostatných stranách), len A, len B
  alebo všetky otázky spolu; **väčšie písmo a riadkovanie (dyslexia)** – 14 bodov, riadkovanie 1,7, možnosti pod sebou, viac miesta na písanie;
  **so správnymi odpoveďami** (kľúč). PDF: v okne tlače vyber „Uložiť ako PDF“. Voľby si aplikácia pamätá.

## 1.12 (2026-11-19) – treba vymeniť skript tabuľky

- **Názov písomky je jej id.** Pri novej písomke sa názov predvyplní podľa testu z hárka Otázky; podľa neho sa volá odkaz a QR kód,
  hárok výsledkov (`Res_<názov>`) aj priečinok s PDF na Disku.
- Povolené sú len písmená bez diakritiky, číslice, `-` a `_` (bez medzier a bodiek), najviac 40 znakov. Názov musí byť unikátny,
  na veľkých a malých písmenách nezáleží (`Geo7A_EuFy` = `geo7a_eufy`). Neplatný alebo už použitý názov je červený a písomka sa nedá spustiť,
  kým ho nezmeníš. Predvyplnený názov z testu s diakritikou alebo medzerami treba tiež upraviť. V hárku Otázky môžu byť názvy testov ľubovoľné.
- V zozname písomiek je namiesto id čas vytvorenia a spustenia („vytvorená 18.11. 08:38 · spustená 08:41“, pripravená písomka „nespustená“).
  Čas spustenia je v novom stĺpci **spustený** v hárku Testy (prvé otvorenie, znovuotvorenie uzavretej písomky ho nemení).
- Staršie písomky si nechávajú svoje id, hárky aj priečinky; odkazy a QR kódy fungujú ďalej.

## 1.11 (2026-11-18) – treba vymeniť skript tabuľky

- **Pridať čas v prehľade.** Pri každom žiakovi, ktorý píše (aj pri zamknutom), je tlačidlo **+2 min**. Dá sa ťukať opakovane, každé ťuknutie pridá 2 minúty.
  Nad tabuľkou je **+2 min všetkým** pre všetkých, ktorí práve píšu (napr. keď je písomka na čas pridlhá).
- Pri stave žiaka je „pridané +n min“, vo výsledkoch v stĺpci príznak „pridaný čas +n min“. Čas z hárka Čas sa v prehľade naďalej nezobrazuje.
- Žiak sa o pridanom čase dozvie do pol minúty (aj skôr, keď odpovedá), časomiera sa posunie a zobrazí sa mu „Učiteľ ti pridal čas: +2 min“.
  Keď mu čas vyprší, aplikácia sa ešte opýta servera, či čas nebol pridaný, až potom test odovzdá. Pridať čas teda stačí kedykoľvek, kým žiak neodovzdá.
- Žiak, ktorému učiteľ test ukončí počas písania, sa to dozvie do pol minúty (doteraz až pri ďalšom odchode alebo odovzdaní).
- **Aj žiakovi, ktorý už odovzdal** (kým test neuzavrieš): po potvrdení sa mu test znova otvorí s jeho odpoveďami. Pokračuje so zvyšným časom
  z chvíle odovzdania + 2 min (kto odovzdal po čase, má 2 min). Čas mu začne bežať, až keď sa do testu vráti; telefón mu test otvorí sám do pár sekúnd,
  inak po obnovení stránky. V prehľade je „Pridaný čas po odovzdaní – čaká, kým sa vráti do testu“. Po novom odovzdaní sa jeho predošlý riadok
  vo výsledkoch nahradí novým (príznak „pokračoval po odovzdaní“).
- **+2 min všetkým** sa týka len tých, ktorí práve píšu; kto už odovzdal, tomu sa test sám neotvorí.
- Tlačidlá môže použiť aj dozor.

## 1.10 (2026-11-17) – treba vymeniť skript tabuľky

- **Odchod z testu sa už netrestá automaticky.** Ak je žiak mimo testu (iná karta alebo aplikácia, iné okno, zmenšené okno, zamknutý telefón, zatvorená stránka):
  - do 1 s sa nič nedeje,
  - do 5 s (obnovenie stránky do 10 s) sa vráti sám a pokračuje; učiteľ vidí v prehľade „krátko mimo testu n×“,
  - dlhšie: **test sa zamkne a čas sa mu zastaví** od chvíle, keď odišiel. Odpovede ostanú uložené, žiak čaká na učiteľa.
- V prehľade učiteľa (aj dozoru) je zamknutý žiak zvýraznený s časom a dôvodom, nad tabuľkou je upozornenie „Na vrátenie do testu čaká…“,
  v názve karty počet a pri novom zamknutí krátke pípnutie. Prehľad sa vtedy obnovuje každé 3 s. Tlačidlá:
  **Vrátiť** (bez trestu), **Vrátiť −10 %** (strhnutie najviac raz), **Ukončiť** (test sa hneď odovzdá s uloženými odpoveďami).
  Žiak pokračuje s rovnakým zvyšným časom, aký mal pri odchode.
- Učiteľ vidí aj žiaka, ktorý je práve mimo testu (napr. zamknutý telefón vo vrecku), a môže ho vrátiť alebo mu test ukončiť skôr, než sa vráti.
- Zamknutie ostane aj po obnovení stránky. Druhý odchod test už neukončuje.
- Stĺpec **odchody** v hárku výsledkov = počet odchodov, za ktoré učiteľ strhol body (0 alebo 1). V stĺpci príznak sú zamknutia a vrátenia s časom.
- Aplikácia potrebuje skript 1.10, so starším skriptom žiak test nezačne a učiteľ vidí upozornenie.

## 1.9 (2026-11-17) – treba vymeniť skript tabuľky

- **Viac času na písomku pre vybraných žiakov:** hárok **Čas** (vytvorí sa sám pri otvorení aplikácie učiteľa) so stĺpcami Meno | Čas. Do stĺpca Meno stačí skopírovať mená žiakov;
  dostanú o 50 % viac času (zaokrúhlené nahor na celé minúty, napr. 20 → 30 min). Iná hodnota pri žiakovi v stĺpci Čas, napr. `25 %` alebo `5 min`.
  Meno ako v hárku Žiaci, poradie mena a priezviska ani diakritika nevadí.
- Žiak vidí svoj čas len na svojej obrazovke (úvod, časomiera). V prehľade učiteľa ani vo výsledkoch to nevidno, hárok má zámerne nenápadný názov.
- Čas sa zafixuje, keď žiak ťukne na Začať; neskoršia zmena hárka ho už nezmení. Upozornenie „odovzdané po čase“ sa ráta z jeho času.

## 1.8.1 (2026-11-12) – treba vymeniť skript tabuľky

- Čas odovzdania v PDF písomkách (Uložiť písomky na Disk), v prehľade učiteľa a vo výsledku žiaka je presne ten z tabuľky. Doteraz sa mohol posunúť na pacifický čas.

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
