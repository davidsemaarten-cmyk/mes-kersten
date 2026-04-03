# UI/UX Verbeterplan — MES Kersten

Datum: 3 april 2026
Methode: Volledige site-audit via browser, alle pagina's en modals doorlopen als admin-gebruiker.

## Samenvatting

De applicatie is technisch solide en de kernmodules (Voorraadbeheer, Laserplanner, Projecten) werken goed. De grootste blokkades voor productief gebruik zitten in ontbrekende functionaliteit in de werkvoorbereider-flow: bestandsbeheer op fase-niveau bestaat nog niet, posnummers kunnen niet bewerkt worden vanuit de tabel, en er is geen manier om vanuit de materiaallijst direct een laserjob of order aan te sturen. De navigatie en informatiearchitectuur zijn helder, maar de verbinding tussen modules (Project > Fase > Materiaallijst > Laserjob > Order) is nog niet doorlopend.

---

## Ideale werkvoorbereider-workflow

Hieronder de ideale stap-voor-stap workflow voor het scenario: "Een werkvoorbereider maakt een nieuw project aan, voegt een fase toe, uploadt bestanden, controleert alles, en geeft een order uit."

| Stap | Pagina | Actie | Data |
|------|--------|-------|------|
| 1 | Projecten | Klik "Nieuw Project" | Projectcode (bijv. BRUG01), naam, beschrijving |
| 2 | Projectdetail | Klik "Nieuwe Fase" | Fasenummer (001), beschrijving, montage datum |
| 3 | Fase > Materiaallijst | Upload CSV (materiaallijst uit Almacam/SolidWorks) | CSV-bestand met posnummers, materiaal, afmetingen, aantallen |
| 4 | Fase > Materiaallijst | Upload DXF-bestanden per posnummer | DXF-bestanden die automatisch matchen op posnummer |
| 5 | Fase > Materiaallijst | Upload PDF-tekeningen | Werkplaats-tekeningen, gesplitst per pagina/posnummer |
| 6 | Fase > Materiaallijst | Controleer: alle posnummers hebben tekening + DXF | Visuele check via iconen in de tabel |
| 7 | Fase > Materiaallijst | Upload NC-bestanden (.nc1) voor relevante posnummers | NC-bestanden voor de zaagmachine |
| 8 | Fase > Materiaallijst | Upload STEP-bestanden voor 3D-controle | STEP-bestanden voor complexe onderdelen |
| 9 | Fase > Orders | Klik "Nieuwe Orderreeks", selecteer bewerkingen | Titel (Volledig), bewerkingen (Zagen > Boren > Kanten > Lassen > Afmonteren) |
| 10 | Fase > Orders | Koppel posnummers aan de orderreeks | Selecteer welke posnummers in deze reeks vallen |
| 11 | Laserplanner | Maak laserjob aan vanuit de fase-materiaallijst | Automatisch of handmatig: plaat-posnummers naar een laserjob |
| 12 | Laserplanner > Job | Upload CSV, DXF, PDF voor de laserjob | Controle dat alles compleet is |
| 13 | Laserplanner > Job | Markeer "Gereed voor Almacam" en exporteer | Export naar Almacam-formaat |
| 14 | Voorraadbeheer | Claim platen voor het project/fase | Platen reserveren voor lasersnijden |
| 15 | Fase > Overzicht | Overzicht: alle posnummers, orders, bestanden, claims | Werkvoorbereider ziet dat alles klaar is |

---

## Gap-analyse

| Stap | Werkt? | Bevinding |
|------|--------|-----------|
| 1 | Ja | Nieuw Project modal werkt correct |
| 2 | Ja | Nieuwe Fase modal werkt correct, inclusief montage datum |
| 3 | Deels | CSV-upload bestaat in Materiaallijst tab, maar alleen in de Laserplanner. Op fase-niveau is de materiaallijst tab een weergave van data die via de Laserplanner is geimporteerd -- niet direct bewerkbaar vanuit de fase |
| 4 | Deels | DXF-upload bestaat in Materiaallijst tab, maar enkel via de Laserplanner |
| 5 | Deels | PDF-upload bestaat in Materiaallijst tab, maar enkel via de Laserplanner |
| 6 | Ja | Iconen in de materiaallijst-tabel tonen of DXF/PDF/NC/STEP aanwezig is |
| 7 | Deels | NC-upload bestaat, maar enkel via de Laserplanner |
| 8 | Deels | STEP-upload knoppen zijn zichtbaar, STEP-viewer icoon is aanwezig |
| 9 | Ja | Nieuwe Orderreeks modal werkt, bewerkingstypes selecteerbaar |
| 10 | Nee | Er is geen zichtbare manier om posnummers aan een orderreeks/order te koppelen vanuit de UI |
| 11 | Nee | Er is geen directe link vanuit fase-materiaallijst naar het aanmaken van een laserjob |
| 12 | Ja | Upload CSV/DXF/PDF/NC werkt in de Laserplanner job detail |
| 13 | Ja | "Gereed voor Almacam melden" knop is aanwezig |
| 14 | Ja | Bulk Claim en individuele claim werken in Voorraadbeheer |
| 15 | Deels | Overzicht tab toont aantallen maar mist een completeness-indicator (bijv. "3 van 39 posnummers hebben nog geen tekening") |

---

## Blockers (moet opgelost voor productief gebruik)

### B1 — Bestandsbeheer op fase-niveau ontbreekt
**Probleem:** Het tabblad "Bestanden" in de fase-detailpagina toont alleen een placeholder: "Bestandsupload en -beheer wordt binnenkort toegevoegd". De werkvoorbereider heeft geen plek om algemene fase-documenten (werkplaats-tekeningen, revisie-PDFs, montage-instructies) te uploaden die niet specifiek aan een laserjob gekoppeld zijn.
**Impact:** De werkvoorbereider kan geen tekeningen klaarzetten voor de werkplaats. Dit is de kernfunctie van het systeem.
**Oplossing:** Implementeer bestandsupload en -beheer op fase-niveau. Minimaal: drag-and-drop upload van PDF/DXF/STEP, lijst met geuploadde bestanden, preview/download mogelijkheid.
**Betrokken pagina's:** FaseDetail > Bestanden tab

### B2 — Posnummers niet koppelbaar aan orders
**Probleem:** In de Orders tab kunnen orderreeksen aangemaakt worden met bewerkingstypes, maar er is geen zichtbare manier om posnummers aan orders te koppelen. De koppeltabel `order_posnummers` bestaat in de database, maar de UI biedt geen interface om deze te vullen.
**Impact:** Orders zijn lege shells zonder inhoud. De werkplaats weet niet welke onderdelen bij welke order horen.
**Oplossing:** Voeg aan elke order in de orderreeks een sectie toe waar posnummers geselecteerd en gekoppeld kunnen worden. Toon per order welke posnummers eraan gekoppeld zijn.
**Betrokken pagina's:** FaseDetail > Orders tab

### B3 — Geen verbinding tussen Materiaallijst en Laserplanner
**Probleem:** De materiaallijst op fase-niveau en de Laserplanner zijn twee aparte werelden. De werkvoorbereider moet handmatig een laserjob aanmaken in de Laserplanner en daar opnieuw een CSV uploaden. Er is geen flow om vanuit een fase een laserjob te genereren of te koppelen.
**Impact:** Dubbel werk, risico op inconsistentie tussen de materiaallijst in de fase en de materiaallijst in de laserjob.
**Oplossing:** Voeg een actieknop toe in de fase-materiaallijst: "Laserjob aanmaken" die automatisch de plaat-posnummers naar een nieuwe laserjob kopieert en deze koppelt aan de fase. Of: maak de koppeling zichtbaar zodat een bestaande laserjob aan een fase gekoppeld kan worden.
**Betrokken pagina's:** FaseDetail > Materiaallijst tab, Laserplanner

### B4 — Gebruikersbeheer mist CRUD-acties
**Probleem:** De Admin-pagina toont een lijst gebruikers met "Nieuwe Gebruiker" knop, maar er zijn geen bewerk- of verwijderknoppen per gebruiker. Een admin kan geen wachtwoord resetten, rol wijzigen, of gebruiker deactiveren.
**Impact:** Gebruikersbeheer is niet functioneel. Bij een verkeerd aangemaakt account of rolwijziging moet de database direct bewerkt worden.
**Oplossing:** Voeg per gebruiker een bewerk-modal toe (naam, email, rol wijzigen, wachtwoord resetten, deactiveren).
**Betrokken pagina's:** Admin

---

## Belangrijk (verbetert workflow significant)

### V1 — Posnummers niet bewerkbaar vanuit de tabel
**Probleem:** De Posnummers tab op fase-niveau toont een tabel met posnummers, maar er is geen manier om een posnummer te bewerken (klikken opent geen modal of inline-editor). Er is alleen een verwijder-icoon.
**Oplossing:** Voeg inline editing toe of een bewerkmodal bij klik op een posnummer-rij. Velden: materiaal, profiel, afmetingen, aantal, notities.
**Betrokken pagina's:** FaseDetail > Posnummers tab

### V2 — Fase-overzicht mist completeness-indicatoren
**Probleem:** Het Overzicht tab van een fase toont aantallen (posnummers, orders, bestanden, geclaimde platen), maar geen indicatie van compleetheid. De werkvoorbereider kan niet in een oogopslag zien: "12 van 39 posnummers missen nog een tekening" of "3 orders hebben nog geen posnummers gekoppeld".
**Oplossing:** Voeg voortgangsindicatoren toe per categorie. Bijv: "Tekeningen: 27/39 compleet", "NC-bestanden: 15/39", "Orders: 0/3 afgerond".
**Betrokken pagina's:** FaseDetail > Overzicht tab

### V3 — Dashboard biedt geen operationeel overzicht
**Probleem:** Het dashboard toont alleen API-status, twee snelkoppelingen (Voorraad en Claims), en een lijst "binnenkort beschikbaar" modules. Een werkvoorbereider die inlogt ziet niets van zijn lopende werk.
**Oplossing:** Toon op het dashboard: recente projecten met voortgang, openstaande orders, laserjobs die actie vereisen, recent gewijzigde fases. Dit is het startpunt van de werkdag.
**Betrokken pagina's:** Dashboard

### V4 — Orderreeksen niet verwijderbaar of bewerkbaar
**Probleem:** In de Orders tab zijn orderreeksen (met namen als "hoi", "q", "Volledig") zichtbaar, maar er is geen manier om een orderreeks te verwijderen of de titel te bewerken. Testdata blijft daardoor rondslingeren.
**Oplossing:** Voeg verwijder- en bewerkacties toe per orderreeks. Bewerken: titel wijzigen. Verwijderen: met bevestiging, cascade naar onderliggende orders.
**Betrokken pagina's:** FaseDetail > Orders tab

### V5 — Materialen beheer mist bewerkfunctie
**Probleem:** De Materialen-sectie op de Admin-pagina toont materialen met prefix, materiaalgroep, specificatie, oppervlaktebewerking, kleur en aantal platen, maar er zijn geen zichtbare bewerk- of verwijderacties (de Acties-kolom is leeg of niet zichtbaar).
**Oplossing:** Voeg bewerk-modal toe per materiaal. Verwijderen alleen toestaan als er geen platen aan gekoppeld zijn.
**Betrokken pagina's:** Admin > Materialen sectie

### V6 — Geen zoek- of filterfunctie in Laserplanner
**Probleem:** De Laserplanner job-lijst heeft tab-filters op status (Concept, Gereed voor Almacam, Geexporteerd) maar geen zoekfunctie. Bij een groeiend aantal jobs wordt het lastig om een specifieke job te vinden.
**Oplossing:** Voeg een zoekveld toe boven de job-lijst dat filtert op jobnaam, projectcode, of fasenummer.
**Betrokken pagina's:** Laserplanner (Plaatlaser)

### V7 — Fase-informatie (beschrijving, opmerkingen) niet zichtbaar of bewerkbaar
**Probleem:** Bij het aanmaken van een fase kunnen opmerkingen intern en werkplaats ingevuld worden, maar in de fase-detailpagina zijn deze velden niet zichtbaar. Er is ook geen manier om de fase-beschrijving achteraf te bewerken.
**Oplossing:** Voeg een informatiesectie toe aan het Overzicht tab met: beschrijving, opmerkingen intern, opmerkingen werkplaats, montage datum. Maak deze velden bewerkbaar.
**Betrokken pagina's:** FaseDetail > Overzicht tab

### V8 — Locatiebeheer staat los van Voorraadbeheer
**Probleem:** Locatiebeheer is een apart menu-item in de sidebar. In de visie-documentatie staat het beschreven als onderdeel van Voorraadbeheer. De huidige navigatie-structuur creert een extra klik voor een functie die logisch bij Voorraad hoort.
**Oplossing:** Overweeg Locatiebeheer te verplaatsen naar een tab of sectie binnen Voorraadbeheer, of onder een "Voorraadbeheer" submenu in de sidebar (Platen, Locaties).
**Betrokken pagina's:** Sidebar navigatie, Locatiebeheer

---

## Nice-to-have

### N1 — Kaartweergave mist "Nieuwe Plaat" knop in tabelweergave
**Probleem:** In kaartweergave is de knop "Platen Toevoegen" zichtbaar, maar in tabelweergave ontbreekt deze knop. De gebruiker moet eerst naar kaartweergave schakelen.
**Oplossing:** Toon de "Platen Toevoegen" knop consistent in beide weergaven.
**Betrokken pagina's:** Voorraad

### N2 — Projectkaarten tonen geen beschrijving
**Probleem:** De projectkaarten op de Projecten-pagina tonen code, naam, aantal fases en datum, maar niet de beschrijving. Bij meerdere projecten met cryptische codes (KLPRO25, SCCI) is het lastig om te herinneren waar elk project over gaat.
**Oplossing:** Toon de eerste regel van de beschrijving op de projectkaart, of toon een tooltip bij hover.
**Betrokken pagina's:** Projecten

### N3 — Profiel: digitale handtekening is placeholder
**Probleem:** De profielpagina toont "Handtekening upload functionaliteit komt binnenkort" maar dit is niet blokkerend voor de huidige fase.
**Oplossing:** Implementeer wanneer de werkplaatsmodule actief wordt en digitale goedkeuring nodig is.
**Betrokken pagina's:** Profiel

### N4 — Buislaser, Zagen, Boren zijn placeholders
**Probleem:** Buislaser toont "In ontwikkeling", Zagen en Boren zijn disabled in de navigatie. Dit is verwarrend voor gebruikers die niet weten welke modules beschikbaar zijn.
**Oplossing:** Verberg niet-beschikbare modules uit de navigatie, of markeer ze duidelijker als "nog niet beschikbaar" met een consistente stijl. Overweeg een enkele "Orders" pagina met tabs per type, zodat alleen beschikbare types zichtbaar zijn.
**Betrokken pagina's:** Sidebar navigatie, Buislaser pagina

### N5 — Materiaallijst horizontale scroll is niet duidelijk
**Probleem:** De materiaallijst-tabel op fase-niveau en in de Laserplanner is breed (DXF, DXF-bestand, Tekening, NC, STEP, Posnr, Profiel, Plaatdikte, Kwaliteit, Aantal, Acties). Op kleinere schermen of bij standaard viewport vereist dit horizontaal scrollen, maar er is geen visuele indicatie dat er meer kolommen rechts zijn.
**Oplossing:** Voeg een scrollschaduw toe aan de rechterkant van de tabel wanneer er meer kolommen buiten beeld zijn, of maak de eerste kolom (DXF preview) sticky.
**Betrokken pagina's:** FaseDetail > Materiaallijst, Laserplanner > Job detail

### N6 — Relatieve datums inconsistent
**Probleem:** Projectkaarten tonen "4 maanden geleden", Laserplanner toont "2 weken geleden", maar de fase-detailpagina toont absolute datums. Dit is inconsistent.
**Oplossing:** Gebruik consistent relatieve datums in lijsten en kaarten, en absolute datums in detail-pagina's.
**Betrokken pagina's:** Doorsnijdend

### N7 — Geen breadcrumb-navigatie op alle pagina's
**Probleem:** De fase-detailpagina heeft breadcrumbs (Projecten > STAGR > Fase 001), maar de Laserplanner job-detail heeft alleen een terugpijl. Dit maakt het moeilijk om te orienteren.
**Oplossing:** Voeg consistente breadcrumbs toe aan alle detail-pagina's.
**Betrokken pagina's:** Laserplanner detail

### N8 — Test-data in orders vervuilt de UI
**Probleem:** Orderreeksen met namen als "hoi" en "q" zijn duidelijk testdata. Er is geen manier om deze op te ruimen vanuit de UI (zie V4).
**Oplossing:** Los op via V4 (verwijderfunctie voor orderreeksen). Overweeg ook een "testdata opruimen" functie voor de admin.
**Betrokken pagina's:** FaseDetail > Orders tab
