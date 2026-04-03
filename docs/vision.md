# MES Kersten — Vision Document

## Wat is MES Kersten?

MES Kersten is het interne Manufacturing Execution System van M.C. Kersten Amsterdam, een gespecialiseerd metaalverwerkend bedrijf. Het systeem begeleidt productiewerk van planning tot uitvoering: van tekening tot afgemonteerd onderdeel.

Het MES is niet gebouwd als vervanging van bestaande systemen. Het vult de gaten op waar papier tekortschiet en waar AFAS niet voor bedoeld is — de dagelijkse uitvoering op de werkvloer.

---

## Het probleem dat we oplossen

### Papier werkt niet goed genoeg

M.C. Kersten werkt van oudsher op papier. Dat voelt vertrouwd, maar het heeft serieuze nadelen:

- **Tekeningen raken kwijt.** Oude, verkeerde versies blijven rondslingeren. Onderdelen worden soms op basis van een verouderde tekening gemaakt.
- **Checklists worden niet ingevuld**, en als ze ingevuld zijn, worden ze vervolgens niet gescand of gearchiveerd. Traceability — zoals het lotnummer van de lasdraad voor een constructie — gaat daardoor verloren. Als er later een probleem is met een constructie, kunnen we niet meer terugvinden met welk materiaal het gemaakt is.
- **Het overzicht ontbreekt bij grote fases.** Meerdere lassers werken aan dezelfde fase. Papieren boekjes met samenstellingen worden opgesplitst. Wie heeft wat gemaakt? Is alles gemaakt? Is alles naar de poedercoater?
- **Uitzoekwerk kost veel tijd.** Is een onderdeel wel gesneden door de lasersnijder? Dit wordt nu handmatig nagetrokken — en het antwoord is vaak onzeker.

### Wat we *niet* vervangen

AFAS blijft doen wat het doet: bestellingen plaatsen, factuurcontrole, urenregistratie, projectnamen en fasenummers aanmaken. MES raakt hier niet aan.

MES doet geen boekhouding, geen inkoop, geen klantcontact en geen HR.

---

## De visie

### Over 2 jaar: papierloos

Het doel is een volledig papierloze werkplaats binnen twee jaar. Dat is ambitieus. Het vereist dat mensen die gewend zijn aan papier — en daar goed in zijn — overstappen naar een digitale manier van werken.

Dat lukt alleen als het systeem zichzelf verkoopt. Niet door features, maar door frustraties weg te nemen. Het MES moet makkelijker zijn dan papier, niet moeilijker.

### Lange termijn: verbonden fabriek

De eindvisie is een fabriek waarin alle systemen met elkaar verbonden zijn via een Unified Namespace (UNS): MES, AFAS, machines, urenregistratie. Elk onderdeel is van begin tot eind te volgen — van tekenuitgifte en lasersnijden tot fabricage, afmontage en montage op locatie. Wijzigingen in de planning zijn direct door de hele fabriek zichtbaar. De planning blijft vloeibaar en past zich aan de vraag aan.

---

## Ontwerpprincipes

### 1. Zo dicht mogelijk bij papier
Medewerkers zijn gewend aan papier. Het MES moet aanvoelen als een digitale versie van wat ze al kennen — niet als een ERP-systeem. Geen overbodige schermen, geen complexe navigatie, geen handleiding nodig.

### 2. Werkt zonder uitleg
Elke functie moet vanzelfsprekend zijn. Als een gebruiker moet nadenken over hoe iets werkt, is de interface niet goed genoeg. De app overtuigt door direct bruikbaar te zijn.

### 3. Frustraties oplossen, geen nieuwe creëren
Functies worden alleen toegevoegd als ze een concreet probleem oplossen. Complexiteit om complexiteit is geen doel.

### 4. Traceability by default
Alles wat in het systeem gebeurt wordt gelogd. Wie heeft wat gedaan, wanneer, met welk materiaal. Niet als extra stap, maar automatisch — zodat we later altijd kunnen terugvinden wat er is gebeurd.

### 5. Geblokkeerde volgende stap
Een volgende stap in het productieproces kan pas doorgaan als de vorige stap correct afgerond is. Zo worden checklists niet overgeslagen en raken we geen informatie kwijt.

---

## Gebruikers & adoptie

### De werkvoorbereider is de primaire gebruiker
Werkvoorbereiders plannen, coördineren en hebben overzicht nodig over meerdere projecten tegelijk. Zij zijn de drijvende kracht achter het systeem en de eersten die er intensief mee gaan werken.

### De laseroperator is de eerste brug naar de werkvloer
De laseroperator (nieuw in dienst, open voor digitaal werken) is de eerste werkvloer-gebruiker. Via de Orders module is er een directe samenwerking tussen werkvoorbereider en laseroperator mogelijk. Dit is de eerste echte adoptie-kans buiten de werkvoorbereiding.

### De werkvloer volgt later
Bankwerkers, zagers en andere medewerkers zijn van oudsher gewend aan papier. Zij zijn voorlopig nog geen actieve gebruikers. Pas wanneer het systeem bewezen heeft te werken voor werkvoorbereiders en laseroperator, wordt uitrol naar de bredere werkvloer realistisch.

### De leidinggevende is de gatekeeper
De directe leidinggevende — zelf voormalig werkvoorbereider — werkt bij voorkeur op papier en is kritisch op digitale systemen. Zijn instelling: als het op papier al niet duidelijk is, wordt het digitaal ook niet duidelijk. Dat is een terechte eis. Het MES moet hem overtuigen door eenvoudig en transparant te zijn, niet door hem te overladen met mogelijkheden.

---

## Scope

| Wel | Niet |
|-----|------|
| Productie-executie en voortgang | Inkoop / bestellingen |
| Voorraadbeheer (platen, materialen, locaties) | Boekhouding / facturatie |
| Orders per productieproces (laser, zaag, boor, extern) | Klantcontact / CRM |
| Checklists & traceability | HR / urenregistratie |
| Bestandsbeheer (tekeningen, DXF, NC, STEP) | Projectcalculatie |
| Digitale handtekeningen & goedkeuring | Vervangen van AFAS |
| Fotodocumentatie & kwaliteitsborging | Nesting & snijbestanden (→ Almacam) |
| Almacam export als onderdeel van plaatlaserorder | |

---

## Modulestructuur

### Huidige modules

| Module | Status | Doel |
|--------|--------|------|
| **Authenticatie & Gebruikersbeheer** | Operationeel | Inloggen, rollen, rechten |
| **Voorraadbeheer** | Operationeel | Platen, materialen, opslaglocaties, claims, statusflow |
| **Projecten** | Operationeel (basis) | Projecten, fases, BOM per fase (alle te maken onderdelen met tekeningen, bestanden, aantallen en materiaal) |
| **Orders** | Basis operationeel | Orders per productieproces: plaatlaser, buislaser, zagen, boren, extern. Gegenereerd vanuit de BOM. Inclusief Almacam export voor plaatlaserorders. |
| **Audit Logging** | Operationeel | Cross-cutting — alle acties worden automatisch gelogd |

### Geplande modules

| Module | Status | Doel |
|--------|--------|------|
| **Planning** | Gepland | Gantt chart, capaciteitsplanning, volgorde en timing van orders |
| **Werkplaats** | Gepland | Uitvoering op de vloer: voortgang bijhouden, checklists afwerken, digitale handtekeningen |
| **Fotodocumentatie** | Gepland | Foto's koppelen aan orders en onderdelen voor kwaliteitsborging en aansprakelijkheid |
| **Certificaatexport** | Gepland | PDF-generatie voor kwaliteitscertificaten per fase |
| **Notificaties** | Gepland | In-app meldingen bij statuswijzigingen |

### Toekomstige integraties

- **AFAS koppeling** — projecten en fases automatisch importeren uit AFAS in plaats van handmatig aanmaken
- **UNS** — verbinding tussen MES, AFAS, machines en urenregistratie via een Unified Namespace

---

## Technische context

Het MES is gebouwd als een moderne webapplicatie (FastAPI + React) die op een interne server draait. De architectuur is voorbereid op een toekomstige migratie naar cloudopslag (Supabase/S3) en integratie met een Unified Namespace.

Authenticatie en autorisatie zijn volledig operationeel met 8 rollen en strikte scheiding tussen plannen en uitvoeren. Alle acties worden geaudit.

*Technische details: zie `architecture.md` en `data-model.md`.*
