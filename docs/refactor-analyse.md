# MES Kersten -- Refactor Analyse

> Oorspronkelijk gegenereerd: 2026-03-20
> Bijgewerkt: 2026-03-21
> Doel: Per module duplicatie, inconsistentie en structuurproblemen identificeren op basis van docs/architecture.md, docs/coding-standards.md en de daadwerkelijke code.

---

## Stand van zaken na herstructurering

De modulestructuur is gewijzigd ten opzichte van de oorspronkelijke analyse:

- **Voorraadbeheer** is samengevoegd: PlateStock en Opslaglocaties zitten nu in dezelfde API-, service- en schema-bestanden.
- **Orders** is uitgebreid met een orderreeks-fundering. LaserplannerService maakt automatisch een Orderreeks + Order aan bij het koppelen van een job aan een fase. De sidebar heeft een Orders-submenu met aparte pagina's per productieproces.
- **BOM** is als navigatiepagina toegevoegd (`/stuklijst`) maar is nog een placeholder -- de achterliggende posnummer/bestand-routes zitten nog in de Laserplanner API.
- **Audit logging** in OrderService en PosnummerService is gecorrigeerd: juiste AuditAction/EntityType labels, `db.commit()` na `log_action()`, en posnummer logging is geactiveerd.
- **csrf.py** gebruikt nu `datetime.now(timezone.utc)` in plaats van het deprecated `datetime.utcnow()`.

Onderstaande bevindingen zijn bijgewerkt om alleen nog relevante items te bevatten.

---

## Module: Authenticatie & Gebruikersbeheer

### Duplicatie
- **Rolextractie uit User wordt op drie plekken herhaald**: `backend/api/auth.py` (`user.roles[0].role`), `backend/models/user.py` (`@property role`), en `backend/utils/permissions.py` (`[role.role for role in current_user.roles]`). Het User-model heeft al een `role` property, maar de route en permissions gebruiken die niet -- ze bouwen elke keer een eigen rollenlijst. Beter: altijd `user.role` of een `user.role_names` property gebruiken.
- **UUID-serialisatie in Pydantic schemas**: `backend/schemas/user.py` definieert `serialize_id` met `field_serializer`. Hetzelfde patroon komt terug in `schemas/platestock.py`, en elke andere Response-klasse. Dit is herhaald boilerplate dat in een gedeelde base-klasse kan.

### Inconsistentie
- **Login-logica direct in de route**: `backend/api/auth.py` bevat volledige business logic (user ophalen, wachtwoord verifieren, token aanmaken, cookie zetten). Volgens `docs/coding-standards.md` zijn routes "dunne wrappers" en hoort alle logica in een service. Dit is de enige module zonder dedicated service.
- **Login response handmatig opgebouwd**: `backend/api/auth.py` bouwt het response-dict handmatig op in plaats van het `UserResponse` Pydantic-schema te gebruiken. Andere modules gebruiken altijd `response_model` om serialisatie af te handelen.
- **Geen audit logging bij login/logout**: Ondanks dat `AuditAction.LOGIN` en `AuditAction.LOGOUT` gedefinieerd zijn in `backend/utils/audit.py`, worden deze nooit aangeroepen in `api/auth.py`.

### Structuur
- **Geen AuthService klasse**: Alle andere modules volgen het patroon `api/ -> service/ -> model/`. Authenticatie slaat de service-laag over. Dit maakt het onmogelijk om login-logica her te gebruiken (bijv. voor toekomstige API-key authenticatie of user CRUD).
- **ProtectedRoute controleert geen rollen**: `frontend/src/components/ProtectedRoute.tsx` controleert alleen of `user` niet null is. Er is geen rolgebaseerde route-bescherming in de frontend. Een `tekenaar` kan technisch alle pagina's bezoeken (de backend blokkeert, maar de UI toont de pagina's).
- **UserCreate en UserUpdate schemas bestaan maar worden nergens gebruikt**: `backend/schemas/user.py` definieert `UserCreate` en `UserUpdate`, maar er zijn geen API-endpoints die deze consumeren. Er is geen user management via de API.

---

## Module: Voorraadbeheer (PlateStock + Opslaglocaties)

> Na de samenvoeging bevatten `backend/api/platestock.py`, `backend/services/platestock.py` en `backend/schemas/platestock.py` nu ook de opslaglocatie-logica. De aparte bestanden `api/storage_locations.py`, `services/storage_location.py` en `schemas/storage_location.py` bestaan nog maar worden niet meer als losse module behandeld.

### Duplicatie
- **`strip_notes` validator herhaald in drie schemas**: `backend/schemas/platestock.py` bevat identieke `strip_notes` validatoren in PlateBase, RemnantRequest en ClaimBase. Dit kan een gedeelde mixin of util-functie zijn.
- **`field_serializer` voor UUIDs herhaald in elke Response**: `PlateResponse`, `MaterialResponse`, `ClaimResponse`, `UserSummary` -- allemaal hetzelfde patroon. Extractie naar een `UUIDSerializerMixin` zou dit elimineren.
- **Plate-area berekening op drie plekken**: `backend/models/plate.py` (`calculate_area`), `backend/schemas/platestock.py` (`area_m2` property), en `backend/services/platestock.py` (via `calculate_plate_area` static method). Drie implementaties van dezelfde berekening `(width * length) / 1_000_000`.
- **Error handling boilerplate in elke route**: Elke endpoint in `backend/api/platestock.py` heeft een try/except blok dat `ServiceError` subklassen omzet naar `HTTPException`. Dit patroon (30+ keer) zou via een decorator of middleware opgelost kunnen worden.

### Inconsistentie
- **`plate_data.dict()` vs `material.model_dump()`**: `backend/api/platestock.py` gebruikt op sommige plekken het Pydantic v1 `dict()` terwijl elders `model_dump()` wordt gebruikt. Het hele project zou `model_dump()` moeten gebruiken (Pydantic v2).
- **Deprecated kolommen in Claim**: `backend/models/claim.py` bevat `project_number` en `area_needed` gemarkeerd als DEPRECATED. Deze staan ook in `ClaimResponse`. Ze worden niet gebruikt maar vervuilen het model en de API-responses.
- **`from_orm()` in route-laag**: `backend/api/platestock.py` roept `PlateResponse.from_orm()` en `.dict()` aan in de route. Dit is Pydantic v1-syntax en data transformatie die in de service hoort.
- **`PlateBase.location` is een vrij tekstveld**: `backend/schemas/platestock.py` definieert `location` als vrije string, terwijl er een `storage_locations` tabel met FK bestaat. Het Plate-model heeft zowel `location` (tekst) als een potentiele FK `locatie_id`. De migratierichting is onduidelijk.
- **StorageLocationService gooit `LookupError` en `ValueError`**: Nu de service in `platestock.py` is samengevoegd, gooit het deel voor opslaglocaties `LookupError` en `ValueError` in plaats van `ServiceError`-subklassen. Er bestaan geen `StorageLocationNotFoundError` of `StorageLocationNameExistsError` in `exceptions.py`.
- **Opslaglocatie route accepteert `location_id: str` in plaats van `UUID`**: De storage_locations_router definieert `location_id` als `str`, terwijl alle andere modules `UUID` type hints gebruiken.

### Structuur
- **Route-bestand is 700+ regels**: `backend/api/platestock.py` bevat nu materials + plates + claims + statistics + storage locations endpoints in een enkel bestand. Door de samenvoeging is het bestand groter geworden. Opsplitsen naar sub-routers (materials, plates, claims, storage-locations) zou de navigeerbaarheid verbeteren.
- **Bulk claims berekent total_m2 in de route**: `backend/api/platestock.py` doet losse queries per claim in een loop. Dit is een N+1 query in de route-laag, wat in strijd is met `docs/coding-standards.md`.
- **Geen directe FK-koppeling plates-opslaglocaties in gebruik**: `storage_locations` is nu onderdeel van voorraadbeheer, maar plates gebruiken nog steeds een vrij tekstveld `location` in plaats van een FK naar `storage_locations`.

---

## Module: Projectbeheer

### Duplicatie
- **Hardcoded `order_count=0, posnummer_count=0, file_count=0`**: `backend/api/projects.py` zet deze computed fields handmatig op 0 op meerdere plekken. De service zou deze altijd meegeven, of de Pydantic-response zou ze als default 0 hebben (wat al het geval is in het schema).
- **Project-ophalen patroon**: `ProjectService.get_project`, `get_project_by_code`, `list_projects` -- alle drie filteren op `is_active == True` apart. Een base-querymethode die standaard `is_active` filtert zou duplicatie verminderen.

### Inconsistentie
- **Exception als string vs ServiceError**: `ProjectService.create_project` gooit `ProjectCodeExistsError` met een Engelse message, maar foutmeldingen moeten volgens `docs/coding-standards.md` in het Nederlands zijn.
- **`current_user` als parameter vs `user_id`**: ProjectService methoden ontvangen `current_user: User` als parameter, terwijl PlateStockService `user_id: UUID` ontvangt. Dit is inconsistent tussen modules.
- **Geen try/except en rollback in ProjectService**: `ProjectService.create_project` heeft geen exception handling met rollback, in tegenstelling tot het verplichte patroon in `docs/coding-standards.md`.
- **Type hints ontbreken in hooks**: `useProjects.ts` definieert eigen lokale types (`Project`, `Fase`, etc.) in het hooks-bestand zelf, terwijl `docs/coding-standards.md` stelt dat alle domeintypen in `types/database.ts` horen.

### Structuur
- **Statistieken met meerdere losse queries**: `ProjectService.get_project_statistics` doet 4 aparte queries (project ophalen, fases tellen, orders tellen, posnummers tellen). Dit kan in 1-2 queries met JOINs.
- **Fase CRUD zit in ProjectService**: `backend/services/project.py` bevat zowel project- als fase-logica. Als fases complexer worden (orderreeksen, posnummers), wordt dit bestand te groot. Overweeg een aparte `FaseService`.

---

## Module: Orders & Laserplanner

> Orders is uitgebreid met de orderreeks-fundering. LaserplannerService maakt nu automatisch een Orderreeks + Order "Plaat snijden" aan bij het koppelen van een job aan een fase. De sidebar heeft een Orders-submenu met pagina's per productieproces.

### Duplicatie
- **Upload-resultaat feedback patroon herhaald in 3 hooks**: `useUploadDXFFiles`, `useUploadNCFiles`, `useUploadStepFiles` in `useLaserplanner.ts` bevatten identieke matched/unmatched toast-logica. Dit kan in een gedeelde helper.
- **File-opslag direct in LaserplannerService**: NC- en STEP-bestanden worden direct via `Path`/`os` opgeslagen in de service, terwijl DXF en PDF via `DXFStorage`/`PDFStorage` gaan. Drie verschillende patronen voor bestandsopslag.
- **`require_admin_or_werkvoorbereider(current_user)` als functie-aanroep in route-body**: `backend/api/orders.py` roept permissie-functies aan als gewone functie in de route-body, in plaats van als `Depends()` in de functie-signature. Andere modules gebruiken `Depends()`. Dit mengt autorisatie-logic in de route.
- **Upload-succes toast ontbreekt in order mutations**: `useCreateOrderreeks` en andere order-mutaties in `useOrders.ts` missen `toast.success()` in `onSuccess`, terwijl alle andere modules dit wel doen.

### Inconsistentie
- **`ValueError` in plaats van `ServiceError` subklassen in OrderService**: `OrderService.update_orderreeks`, `delete_orderreeks`, `assign_order` gooien `ValueError` voor not-found cases, terwijl `OrderReeksNotFoundError` en `OrderNotFoundError` al gedefinieerd zijn in `exceptions.py`.
- **`except Exception as e` met generieke foutmelding in het Engels**: `backend/api/orders.py` vangt alle exceptions met Engelse berichten ("Failed to create orderreeks", "Failed to fetch orders"). Foutmeldingen moeten Nederlands zijn.
- **Geen `staleTime` in useOrders query hooks**: `useOrders.ts` hooks specificeren geen `staleTime`, terwijl `docs/coding-standards.md` 30 seconden voorschrijft voor statusgevoelige data.
- **Import van `api` verschilt**: `useLaserplanner.ts` importeert `import api from '../lib/api'` (default import), terwijl `usePlateStock.ts` en `useProjects.ts` `import { api } from '../lib/api'` (named import) gebruiken. Beide werken, maar het is inconsistent.
- **Geen dedicated AuditAction voor PDF/NC/STEP operaties**: Er bestaan `UPLOAD_DXF` en `DELETE_DXF` in AuditAction, maar er zijn geen equivalenten voor PDF, NC, of STEP bestanden. Die operaties worden ofwel niet gelogd, ofwel onder generieke acties.
- **PosnummerService gebruikt verkeerde AuditActions**: De posnummer service-functies gebruiken `AuditAction.CREATE_ORDER`, `UPDATE_ORDER` en `DELETE_ORDER` voor posnummer-operaties. Er bestaan geen posnummer-specifieke AuditActions, waardoor audit trails misleidend zijn.

### Structuur -- Nieuwe bevindingen na ombouw

- **BOM-pagina is een placeholder zonder eigen backend**: `frontend/src/pages/BOMPage.tsx` bestaat als navigatiepagina op `/stuklijst`, maar alle posnummer/DXF/PDF/NC/STEP routes zitten nog in `backend/api/laserplanner.py`. De BOM-module heeft geen eigen router of service. Dit betekent dat de navigatiestructuur (BOM als aparte module) niet aansluit op de backend-structuur (alles via laserplanner).
- **Sidebar Orders submenu heeft routes zonder backend**: Buislaser (`/orders/buislaser`) heeft een frontend pagina maar geen backend-endpoints specifiek voor buislaser-orders. Zagen en Boren zijn disabled in de sidebar maar hebben al frontend routes gedefinieerd. Dit kan verwarring veroorzaken bij gebruikers en ontwikkelaars.
- **LaserplannerService.create_job() zoekt stilzwijgend op OrderType naam**: Bij het aanmaken van een job met `fase_id` zoekt de service op `OrderType.name == "Plaat snijden"`. Als die naam niet in de database staat, wordt de hele orderreeks/order-koppeling stilzwijgend overgeslagen zonder foutmelding of logging. Dit maakt het moeilijk om te debuggen waarom een job niet gekoppeld is.
- **Bestaande LaserJobs hebben `order_id = NULL`**: `LaserJob` heeft nu een `order_id` FK, maar bestaande jobs zijn niet retroactief gekoppeld aan orders. Er is geen migratiescript dat bestaande jobs aan orders koppelt. Dit betekent dat de order-koppeling alleen werkt voor nieuw aangemaakte jobs.
- **Order-list endpoint negeert query parameters**: `backend/api/orders.py` accepteert `status_filter` en `assigned_to_me` als parameters maar geeft ze niet door aan `OrderService.get_orders_for_user()`. De service negeert ze compleet.
- **`split_orderreeks` is een lege placeholder**: `backend/services/order.py` bevat een dummy-methode die altijd een lege lijst retourneert. Het is niet achter een feature flag verborgen.

### Structuur -- Bestaande bevindingen

- **Laserplanner API-bestand is 820+ regels**: `backend/api/laserplanner.py` bevat 30+ endpoints voor jobs, CSV, DXF, PDF, NC, STEP en Almacam export. Dit is een kandidaat voor opsplitsing.
- **Laserplanner service-bestand is het grootste in het project**: `backend/services/laserplanner.py` bevat alle business logic voor 6 bestandstypes en job-management. Opsplitsing naar `LaserJobService`, `LaserFileService` (of per bestandstype) zou de navigeerbaarheid verbeteren.
- **`file_storage.py` is onvolledig**: `backend/services/file_storage.py` bevat `DXFStorage` en `PDFStorage`, maar NC- en STEP-bestanden gaan er niet doorheen. Er zou een generieke `FileStorage` klasse moeten zijn.
- **`_safe_int`, `_safe_float`, `_extract_thickness` als module-level functies**: `backend/services/laserplanner.py` definieert helper-functies op module-niveau. Deze horen in een utility-bestand of als private methods op de service-klasse.

---

## Module: Audit Logging

### Duplicatie
- Geen duplicatie in de audit-module zelf. De module is goed gestructureerd als cross-cutting concern.

### Inconsistentie
- **PosnummerService gebruikt ORDER-acties voor POSNUMMER-entiteiten**: Zoals hierboven vermeld bij Orders & Laserplanner. De combinatie `AuditAction.CREATE_ORDER` + `EntityType.POSNUMMER` is verwarrend in audit trails.
- **`get_entity_audit_trail` en `get_user_activity` zijn niet via API beschikbaar**: `backend/utils/audit.py` definieert functies om audit trails op te halen, maar er zijn geen endpoints die deze aanroepen. De data is alleen via directe database-toegang beschikbaar.

### Structuur
- **AuditAction enum groeit ongecontroleerd**: `backend/utils/audit.py` bevat 35+ acties. Bij elke nieuwe feature moet hier een actie toegevoegd worden. Er is geen validatie dat services de juiste actie gebruiken.
- **Geen index op `entity_type + entity_id`**: Het `AuditLog` model (`backend/models/audit_log.py`) heeft geen composite index op `(entity_type, entity_id)`, terwijl `get_entity_audit_trail` op deze combinatie filtert. Bij groeiend gebruik wordt dit een performance-probleem.

---

## Samenvatting

De top-10 meest impactvolle bevindingen, gerangschikt op ernst en breedte van impact:

1. **Authenticatie heeft geen service-laag** -- Login/logout logica staat direct in de route. Dit breekt het fundamentele lagenmodel van het project en maakt de enige module zonder service. (api/auth.py)

2. **BOM-module is een navigatie-placeholder zonder eigen backend** -- De frontend toont BOM als aparte module op `/stuklijst`, maar alle achterliggende routes zitten in de Laserplanner API. Dit mismatch tussen navigatie en architectuur moet opgelost worden zodra de BOM-module echt gebouwd wordt. (pages/BOMPage.tsx, api/laserplanner.py)

3. **LaserplannerService.create_job() faalt stilzwijgend bij ontbrekende OrderType** -- Als "Plaat snijden" niet in de database staat, wordt de orderreeks-koppeling overgeslagen zonder foutmelding. Dit maakt debugging moeilijk en kan leiden tot ongekoppelde jobs. (services/laserplanner.py)

4. **UUID-serialisatie en `strip_notes` validatoren herhaald in elk schema** -- Boilerplate die in 10+ bestanden voorkomt. Een gedeelde base-klasse of mixin elimineert dit en voorkomt toekomstige inconsistenties. (schemas/*.py)

5. **Error handling boilerplate in elke route** -- Elk endpoint heeft hetzelfde try/except patroon. Een generieke exception handler of decorator bespaart honderden regels en maakt het onmogelijk om een exception-mapping te vergeten. (api/*.py)

6. **Laserplanner API en service zijn te groot** -- 820+ regels API, 900+ regels service. Dit maakt navigatie, review en testen moeilijk. Opsplitsing naar sub-modules (jobs, files per type, export) is noodzakelijk voor onderhoudbaarheid. (api/laserplanner.py, services/laserplanner.py)

7. **Inconsistent exception-patroon** -- StorageLocationService gooit `ValueError`/`LookupError`, OrderService gooit `ValueError`, PosnummerService gebruikt verkeerde AuditActions, terwijl alle andere services `ServiceError`-subklassen gebruiken. Dit maakt error handling in routes onvoorspelbaar. (services/order.py, services/platestock.py)

8. **Sidebar Orders heeft routes zonder backend** -- Buislaser heeft een pagina zonder backend; Zagen/Boren zijn disabled met reeds gedefinieerde routes. Dit kan verwarring veroorzaken en wijkt af van het principe dat frontend en backend synchroon ontwikkeld worden.

9. **PosnummerService wijkt af van klasse-patroon** -- Losse functies in plaats van een klasse met `@staticmethod`. Dit is de enige service die het patroon breekt. (services/posnummer.py)

10. **Frontend type-definities verspreid over hooks en types/** -- `useProjects.ts` definieert eigen `Project`, `Fase` interfaces lokaal, terwijl `types/database.ts` de centrale locatie moet zijn. Dit kan leiden tot type-divergentie wanneer backend-schemas wijzigen. (hooks/useProjects.ts)
