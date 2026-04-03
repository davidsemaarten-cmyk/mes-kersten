# MES Kersten -- Refactor Rapport

> Gegenereerd: 2026-03-20
> Doel: Volledig overzicht van alle modules, bestanden, afhankelijkheden, ontbrekende koppelingen en technische schuld.

---

## 1. Module-overzicht

### 1.1 Authenticatie & Gebruikersbeheer

**Status:** Operationeel

| Laag | Bestanden |
|------|-----------|
| Model | `backend/models/user.py`, `backend/models/user_role.py` |
| Schema | `backend/schemas/user.py` |
| API | `backend/api/auth.py` (login, logout, me, csrf-token) |
| Service | Geen dedicated service -- logica zit direct in `api/auth.py` |
| Utils | `backend/utils/auth.py`, `backend/utils/permissions.py`, `backend/utils/csrf.py` |
| Frontend pagina | `frontend/src/pages/Login.tsx`, `frontend/src/pages/Profile.tsx`, `frontend/src/pages/Admin.tsx` |
| Frontend hook | `frontend/src/hooks/useAuth.tsx`, `frontend/src/hooks/usePermissions.ts` |
| Frontend types | `frontend/src/types/roles.ts`, `frontend/src/types/database.ts` (User-types) |
| Frontend component | `frontend/src/components/ProtectedRoute.tsx` |
| Migraties | `001_core_tables.sql`, `004_expand_roles_system.sql`, `006_seed_test_users.sql`, `007_fix_test_user_passwords.sql` |

---

### 1.2 PlateStock (Plaatvoorraadbeheer)

**Status:** Operationeel

| Laag | Bestanden |
|------|-----------|
| Model | `backend/models/material.py`, `backend/models/plate.py`, `backend/models/claim.py` |
| Schema | `backend/schemas/platestock.py` |
| API | `backend/api/platestock.py` (materials CRUD, plates CRUD, claims CRUD, stats, naar-laser, van-laser, consume, remnant) |
| Service | `backend/services/platestock.py` (`PlateStockService`) |
| Frontend pagina | `frontend/src/pages/Voorraad.tsx`, `frontend/src/pages/Claims.tsx` |
| Frontend hook | `frontend/src/hooks/usePlateStock.ts` |
| Frontend componenten | `AddMaterialModal.tsx`, `AddPlatesModal.tsx`, `BulkClaimModal.tsx`, `ConsumeButton.tsx`, `LocationReturnButton.tsx`, `NaarLaserButton.tsx`, `PlateCard.tsx`, `PlateDetailsModal.tsx`, `PlateGroupModal.tsx`, `QuickClaimButton.tsx`, `RemnantButton.tsx`, `RemnantModal.tsx`, `ProjectPhaseCombobox.tsx` |
| Frontend config | `frontend/src/config/columns.tsx` (kolomdefinities voor voorraadtabel) |
| Frontend types | `frontend/src/types/database.ts` (Plate, Material, Claim, OverviewStats, etc.) |
| Migraties | `002_platestock_tables.sql`, `003_refactor_materials.sql`, `005_add_heatnummer_to_plates.sql` |

---

### 1.3 Projectbeheer (Projecten, Fases, Posnummers)

**Status:** Operationeel (basis)

| Laag | Bestanden |
|------|-----------|
| Model | `backend/models/project.py`, `backend/models/fase.py`, `backend/models/posnummer.py` |
| Schema | `backend/schemas/project.py`, `backend/schemas/posnummer.py` |
| API | `backend/api/projects.py` (projects CRUD, fases CRUD, statistieken), `backend/api/posnummers.py` (posnummers CRUD) |
| Service | `backend/services/project.py` (`ProjectService`), `backend/services/posnummer.py` (losse functies, geen klasse) |
| Frontend pagina | `frontend/src/pages/Projects.tsx`, `frontend/src/pages/ProjectDetail.tsx`, `frontend/src/pages/FaseDetail.tsx` |
| Frontend hook | `frontend/src/hooks/useProjects.ts`, `frontend/src/hooks/usePosnummers.ts` |
| Frontend componenten | `CreateProjectModal.tsx`, `ProjectCard.tsx`, `CreateFaseModal.tsx`, `FaseCard.tsx`, `FaseCombobox.tsx`, `CreatePosnummerModal.tsx`, `PosnummerTable.tsx` |
| Frontend types | `frontend/src/types/database.ts` (Project, Phase, Posnummer) |
| Migraties | `005_core_hierarchy.sql` |

---

### 1.4 Orderbeheer (Orderreeksen, Orders)

**Status:** Basis operationeel

| Laag | Bestanden |
|------|-----------|
| Model | `backend/models/orderreeks.py`, `backend/models/order.py`, `backend/models/order_type.py`, `backend/models/order_posnummer.py` |
| Schema | `backend/schemas/orderreeks.py`, `backend/schemas/order.py`, `backend/schemas/order_type.py` |
| API | `backend/api/orders.py` (orderreeksen CRUD, orders list/detail/assign/link-posnummers), `backend/api/order_types.py` (list order types) |
| Service | `backend/services/order.py` (`OrderService`) |
| Frontend pagina | Geen eigen pagina -- orders worden getoond binnen `FaseDetail.tsx` |
| Frontend hook | `frontend/src/hooks/useOrders.ts` |
| Frontend componenten | `CreateOrderreeksModal.tsx`, `OrderreeksCard.tsx` |
| Frontend types | `frontend/src/types/database.ts` (Order, OrderResponse, Orderreeks, OrderType) |
| Migraties | `009_orders_system.sql` |

---

### 1.5 Laserplanner

**Status:** Operationeel

| Laag | Bestanden |
|------|-----------|
| Model | `backend/models/laser_job.py`, `backend/models/laser_line_item.py`, `backend/models/laser_csv_import.py`, `backend/models/laser_dxf_file.py`, `backend/models/laser_pdf_file.py`, `backend/models/laser_nc_file.py`, `backend/models/laser_step_file.py` |
| Schema | `backend/schemas/laserplanner.py` |
| API | `backend/api/laserplanner.py` (jobs CRUD, CSV parse/import, DXF upload/list/delete, PDF upload/preview/confirm/download/delete, NC upload/list/geometry/download/delete, STEP upload/list/download/delete, Almacam export, line-item patch/delete) |
| Service | `backend/services/laserplanner.py` (`LaserplannerService`) |
| Hulp-services | `backend/services/dxf_service.py` (DXF processing), `backend/services/pdf_service.py` (PDF splitting/thumbnails), `backend/services/file_storage.py` (DXFStorage, PDFStorage), `backend/services/dstv_parser.py` (NC1 parsing) |
| Frontend pagina | `frontend/src/pages/Laserplanner.tsx`, `frontend/src/pages/LaserplannerDetail.tsx`, `frontend/src/pages/NCViewerPage.tsx`, `frontend/src/pages/StepViewerPage.tsx` |
| Frontend hook | `frontend/src/hooks/useLaserplanner.ts` |
| Frontend componenten | `AlmacamExportFlow.tsx`, `CreateJobModal.tsx`, `DXFUploadZone.tsx`, `DXFViewerModal.tsx`, `PDFUploadDialog.tsx`, `PDFViewerModal.tsx`, `UploadCSVModal.tsx` |
| Frontend viewer | `frontend/src/components/viewer/measurements/` (MeasurementPanel, MeasurementToolbar, annotations, computations, setupBVH, types, useMeasurements, useRaycastPicker) |
| Frontend types | `frontend/src/types/database.ts` (LaserJob, LaserLineItem, LaserDXFFile, LaserPDFFile, LaserNCFile, LaserStepFile, NCGeometry) |
| Migraties | `011_laserplanner_system.sql`, `012_laser_csv_version_history.sql`, `013_laser_dxf_files.sql`, `014_dxf_file_path.sql`, `015_dxf_finalize.sql`, `016_laser_pdf_files.sql`, `017_almacam_export.sql`, `019_laser_nc_files.sql`, `020_laser_step_files.sql` |
| Data-migratie | `backend/migrations/014_migrate_dxf_to_disk.py` (Python-script voor DXF content -> disk) |

---

### 1.6 Opslaglocaties (Storage Locations)

**Status:** Operationeel

| Laag | Bestanden |
|------|-----------|
| Model | `backend/models/storage_location.py` |
| Schema | `backend/schemas/storage_location.py` |
| API | `backend/api/storage_locations.py` (CRUD) |
| Service | `backend/services/storage_location.py` (`StorageLocationService`) |
| Frontend pagina | `frontend/src/pages/StorageLocations.tsx` |
| Frontend hook | `frontend/src/hooks/useStorageLocations.ts` |
| Frontend types | Onderdeel van `frontend/src/types/database.ts` (impliciet via PlateStock) |
| Migraties | `005_storage_locations.sql` |

---

### 1.7 Audit Logging

**Status:** Operationeel (cross-cutting concern, geen eigen module)

| Laag | Bestanden |
|------|-----------|
| Model | `backend/models/audit_log.py` |
| Utils | `backend/utils/audit.py` (`log_action()`, `AuditAction`, `EntityType`) |
| Frontend | Geen -- audit logs zijn niet zichtbaar in de UI |
| Migraties | Onderdeel van `001_core_tables.sql` |

---

## 2. Status per module

| Module | Status | Toelichting |
|--------|--------|-------------|
| Authenticatie & Gebruikersbeheer | Operationeel | Login/logout/CSRF werkt. Geen gebruikersbeheer-CRUD (aanmaken/wijzigen/verwijderen users) via de API -- alleen via database of `create_test_db.py`. |
| PlateStock | Operationeel | Volledig CRUD, claims, statusflow, statistieken. |
| Projectbeheer | Operationeel (basis) | CRUD voor projecten, fases, posnummers. Statistieken beschikbaar. |
| Orderbeheer | Basis operationeel | Orderreeksen en orders aanmaken, toewijzen. Geen volledige werkflow-executie (start/complete/approve ontbreekt grotendeels in frontend). |
| Laserplanner | Operationeel | Meest uitgebreide module. Jobs, CSV-import, DXF/PDF/NC/STEP-bestanden, Almacam export. |
| Opslaglocaties | Operationeel | CRUD, gekoppeld aan platen via FK. |
| Audit Logging | Operationeel | Cross-cutting, wordt aangeroepen vanuit alle services. Geen UI om logs te bekijken. |
| Checklists | Gepland | Geen code, geen datamodel. |
| Bestandsbeheer | Gepland | Geen eigen module. Bestandsbeheer is momenteel ingebouwd in Laserplanner. |
| Orderuitvoering | Gepland | Geen code. |
| Fotodocumentatie | Gepland | Geen code, geen datamodel. |
| Certificaatexport | Gepland | Geen code, geen datamodel. |
| Notificaties | Gepland | Geen code, geen datamodel. |

---

## 3. Afhankelijkheden tussen modules

```
Authenticatie & Rollen
  |
  +---> PlateStock (claims vereisen ingelogde user)
  |       |
  |       +---> Opslaglocaties (platen verwijzen naar locatie via FK)
  |
  +---> Projectbeheer (created_by vereist user)
  |       |
  |       +---> Orderbeheer (orderreeksen hangen aan fases, orders aan orderreeksen)
  |       |       |
  |       |       +---> Posnummers (orders linken aan posnummers via koppeltabel)
  |       |
  |       +---> Laserplanner (laser_jobs optioneel gekoppeld aan project/fase via SET NULL FK)
  |
  +---> Audit Logging (alle modules loggen acties met user_id)
```

**Concrete FK-afhankelijkheden:**
- `plates.locatie_id` -> `storage_locations.id` (SET NULL)
- `claims.plate_id` -> `plates.id` (CASCADE)
- `claims.claimed_by` -> `users.id`
- `fases.project_id` -> `projects.id` (CASCADE)
- `posnummers.fase_id` -> `fases.id` (CASCADE)
- `orderreeksen.fase_id` -> `fases.id` (CASCADE)
- `orders.orderreeks_id` -> `orderreeksen.id` (CASCADE)
- `order_posnummers.order_id` -> `orders.id` (CASCADE)
- `order_posnummers.posnummer_id` -> `posnummers.id` (CASCADE)
- `laser_jobs.project_id` -> `projects.id` (SET NULL)
- `laser_jobs.fase_id` -> `fases.id` (SET NULL)
- `laser_line_items.laser_job_id` -> `laser_jobs.id` (CASCADE)
- `laser_dxf_files.laser_job_id` -> `laser_jobs.id` (CASCADE)
- `laser_pdf_files.laser_job_id` -> `laser_jobs.id` (CASCADE)
- `laser_nc_files.laser_job_id` -> `laser_jobs.id` (CASCADE)
- `laser_step_files.laser_job_id` -> `laser_jobs.id` (CASCADE)

---

## 4. Ontbrekende koppelingen

### 4.1 Backend-endpoints zonder frontend

| Endpoint | Bestand | Probleem |
|----------|---------|----------|
| `GET /api/auth/csrf-token` | `api/auth.py` | Wordt automatisch aangeroepen via axios interceptor, geen zichtbare UI nodig -- OK |
| `GET /api/orders` (lijst alle orders) | `api/orders.py` | Hook bestaat (`useOrders`), maar er is geen eigen Orders-overzichtspagina |
| `PUT /api/orders/{id}/assign` | `api/orders.py` | Hook bestaat, maar de toewijzings-UI in FaseDetail is minimaal |
| `POST /api/orders/{id}/link-posnummers` | `api/orders.py` | Hook bestaat, maar er is geen volledige UI om posnummers aan orders te koppelen |
| `GET /api/platestock/stats/projects` | `api/platestock.py` | Hook niet gevonden -- statistiekenpagina bestaat niet |
| Geen user management endpoints | `api/auth.py` | Geen CRUD voor gebruikers (create/update/delete/list). Admin-pagina toont alleen materialen. |

### 4.2 Frontend-pagina's/componenten zonder volledig backend

| Frontend | Probleem |
|----------|----------|
| `pages/Dashboard.tsx` | Pagina bestaat, maar roept geen specifieke dashboard-API aan. Toont statische content of gebruikt bestaande stats-endpoints. |
| `pages/Admin.tsx` | Toont alleen materiaalenbeheer. Geen gebruikersbeheer, geen systeeminstellingen. De naam "Admin" suggereert meer functionaliteit dan er is. |
| `pages/Profile.tsx` | Profielpagina bestaat, maar er is geen `PUT /api/auth/me` endpoint om profielgegevens te wijzigen. |

---

## 5. Technische schuld

### 5.1 Naamconflicten en inconsistenties

| Item | Locatie | Toelichting |
|------|---------|-------------|
| `actief` vs `is_active` | `claims`, `storage_locations` | Migratie 018 hernoemt `actief` naar `is_active` in de database. De Python-modellen gebruiken nu `is_active`. Dit is opgelost **mits** migratie 018 is uitgevoerd. |
| Deprecated kolommen in claims | `backend/models/claim.py` | `project_number` en `area_needed` staan nog in het model en schema (als nullable, gemarkeerd als DEPRECATED). Ze worden niet actief gebruikt, maar zijn niet verwijderd. |
| `Plate.location` (deprecated) | `frontend/src/types/database.ts` | Het TypeScript `Plate` type bevat nog `location?: string` (het oude vrij-tekstveld). Het backend-model gebruikt `locatie_id` als FK naar `storage_locations`. |
| Drie migraties met nummer 005 | `database/migrations/` | `005_add_heatnummer_to_plates.sql`, `005_core_hierarchy.sql`, `005_storage_locations.sql` -- historisch probleem, gedocumenteerd in data-model.md. |

### 5.2 Architectuurafwijkingen

| Item | Locatie | Toelichting |
|------|---------|-------------|
| Auth logica in route-laag | `backend/api/auth.py` | Login/logout-logica staat direct in de route, niet in een service. Wijkt af van het service-owns-transaction patroon. |
| Posnummer service als losse functies | `backend/services/posnummer.py` | Geen `PosnummerService`-klasse, maar losse functies. Alle andere services gebruiken een klasse met `@staticmethod` methoden. |
| `file_storage.py` bevat meerdere storage-klassen | `backend/services/file_storage.py` | `DXFStorage` en `PDFStorage` in een enkel bestand. Bij toevoeging van NC/STEP-opslag zou dit gesplitst moeten worden, of er moet een generieke `FileStorage`-klasse komen. NC- en STEP-bestanden lijken de opslag direct in de laserplanner service af te handelen. |
| Laserplanner API is zeer groot | `backend/api/laserplanner.py` | Eeen bestand met 820+ regels en 30+ endpoints. Bevat DXF, PDF, NC, STEP, CSV, export en line-item endpoints. Kandidaat voor opsplitsing. |
| Laserplanner service is zeer groot | `backend/services/laserplanner.py` | Bevat `LaserplannerService` met alle business logic voor jobs, CSV, DXF, PDF, NC, STEP en export. Kandidaat voor opsplitsing. |

### 5.3 Bestanden buiten modules

| Bestand | Toelichting |
|---------|-------------|
| `backend/create_test_db.py` | Script om testdata aan te maken. Niet gelinkt aan een module, puur development tooling. |
| `backend/utils/validators.py` | Utility-bestand -- niet duidelijk welke module het dient. Moet onderzocht worden of het nog in gebruik is. |
| `frontend/src/lib/errorUtils.ts` | Generieke error-formatting utility. Cross-cutting, geen probleem. |
| `frontend/src/lib/utils.ts` | Utility-functies (waarschijnlijk `cn()` voor Tailwind classnames). Cross-cutting, geen probleem. |
| `frontend/src/hooks/useColumnPreferences.ts` | Kolomvoorkeuren-hook. Hoort bij PlateStock/Voorraad, maar staat los. |
| `frontend/src/types/columns.ts` | Kolomtype-definities. Hoort bij PlateStock/Voorraad. |
| `frontend/src/components/ColumnFilter.tsx` | Idem -- PlateStock-specifiek. |
| `frontend/src/components/ColumnVisibilityPopover.tsx` | Idem -- PlateStock-specifiek. |
| `frontend/src/components/DraggableTableHeader.tsx` | Idem -- PlateStock-specifiek. |
| `frontend/src/components/ScrollableTable.tsx` | Generiek tabelcomponent, maar alleen gebruikt in PlateStock. |
| `frontend/src/components/ErrorAlert.tsx` | Generiek error-component. Cross-cutting. |
| `frontend/src/components/Layout.tsx` | App-brede layout (sidebar, header). Cross-cutting. |
| `frontend/public/opensteel/` | Externe bibliotheek (OpenSteel) voor DXF/NC/nesting visualisatie. Wordt statisch geserveerd. Geen directe koppeling met React-componenten -- wordt waarschijnlijk via `<script>` of iframe geladen. |

### 5.4 Legacy DXF-opslag

Het model `LaserDXFFile` heeft een `file_path` kolom (verplicht). Er bestaat een Python-migratiescript (`backend/migrations/014_migrate_dxf_to_disk.py`) dat oude TEXT-content naar schijf verplaatst. In het TypeScript type `LaserDXFFileDetail` staat nog `file_content: string` -- dit suggereert dat de frontend nog rekening houdt met het oude formaat.

### 5.5 Ontbrekende functionaliteit per module

| Module | Ontbrekend |
|--------|------------|
| Authenticatie | Geen user CRUD (aanmaken, bewerken, verwijderen, lijst). Geen wachtwoord-reset. Geen roltoewijzing via UI. |
| Orderbeheer | Geen start/complete/approve workflow in frontend. Geen voortgangsweergave. Status "blocked" is gedefinieerd maar niet zichtbaar afgedwongen in UI. |
| Audit Logging | Geen UI om logs te bekijken of te filteren. Alle audit data is alleen via database toegankelijk. |
| PlateStock | Statistiekenpagina voor projecten (`/stats/projects` endpoint) heeft geen frontend. |
| Dashboard | Pagina is minimaal -- geen aggregatie van data uit meerdere modules. |
| Admin | Toont alleen materialen. Geen gebruikersbeheer, geen systeemconfiguratie, geen auditlog-viewer. |

---

## 6. Samenvatting migratiebestanden

| Nr | Bestand | Module |
|----|---------|--------|
| 001 | `core_tables.sql` | Authenticatie, Audit |
| 002 | `platestock_tables.sql` | PlateStock |
| 003 | `refactor_materials.sql` | PlateStock |
| 004 | `expand_roles_system.sql` | Authenticatie |
| 005 | `add_heatnummer_to_plates.sql` | PlateStock |
| 005 | `core_hierarchy.sql` | Projectbeheer |
| 005 | `storage_locations.sql` | Opslaglocaties |
| 006 | `seed_test_users.sql` | Authenticatie (testdata) |
| 007 | `fix_test_user_passwords.sql` | Authenticatie (testdata) |
| 008 | `add_composite_indexes.sql` | Cross-cutting (performance) |
| 009 | `orders_system.sql` | Orderbeheer |
| 011 | `laserplanner_system.sql` | Laserplanner |
| 012 | `laser_csv_version_history.sql` | Laserplanner |
| 013 | `laser_dxf_files.sql` | Laserplanner |
| 014 | `dxf_file_path.sql` | Laserplanner |
| 015 | `dxf_finalize.sql` | Laserplanner |
| 016 | `laser_pdf_files.sql` | Laserplanner |
| 017 | `almacam_export.sql` | Laserplanner |
| 018 | `rename_actief_to_is_active.sql` | PlateStock, Opslaglocaties |
| 019 | `laser_nc_files.sql` | Laserplanner |
| 020 | `laser_step_files.sql` | Laserplanner |

**Let op:** migratie 010 ontbreekt (gat tussen 009 en 011).

---

## 7. Totaaloverzicht bestandsaantallen

| Categorie | Aantal |
|-----------|--------|
| Backend modellen | 17 (excl. `__init__.py`) |
| Backend API-routers | 8 |
| Backend services | 8 (incl. hulp-services) |
| Backend schemas | 9 (excl. `__init__.py`) |
| Backend utils | 5 |
| Frontend pagina's | 14 |
| Frontend hooks | 9 |
| Frontend componenten (excl. ui/) | 36 (incl. viewer/) |
| Frontend shadcn/ui componenten | 16 |
| Database migraties | 20 SQL-bestanden + 1 Python-migratiescript |
