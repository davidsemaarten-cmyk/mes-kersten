# MES Kersten — Data Model Document

> Dit document beschrijft het volledige datamodel van MES Kersten. Nieuwe tabellen en kolommen volgen altijd de conventies en patronen die hier zijn vastgelegd. Bij twijfel: volg dit document.

---

## Standaard Patronen — Altijd Toepassen

Elke nieuwe tabel volgt deze regels zonder uitzondering.

### UUID Primary Key
```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```
```python
id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
```

### Timestamps
Altijd `TIMESTAMPTZ` (met tijdzone), nooit `TIMESTAMP`:
```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
```python
created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
```

Tabellen zonder `updated_at` zijn uitsluitend **append-only** records: `audit_logs`, `laser_csv_imports`, `laser_dxf_files`, `laser_pdf_files`.

### Soft Delete
Gebruik altijd `is_active` (niet `actief` — dat is een historische inconsistentie in bestaande tabellen):
```sql
is_active BOOLEAN NOT NULL DEFAULT TRUE
```
Niets wordt echt verwijderd. Filtering op `is_active = TRUE` is altijd de verantwoordelijkheid van de query, niet van de database.

### Audit Kolommen
```sql
created_by UUID REFERENCES users(id)  -- NOT NULL waar van toepassing
```
Operationele records (projecten, platen, laserjobs) hebben een verplichte `created_by`. Bestandsreferenties (`uploaded_by`) zijn nullable vanwege `ON DELETE SET NULL`.

---

## Naamgevingsconventies

### Tabellen
- Meervoud, lowercase snake_case: `users`, `plates`, `laser_jobs`
- Module-prefix voor samenhangende tabellen: `laser_jobs`, `laser_line_items`, `laser_dxf_files`
- Koppeltabellen: samengestelde naam van beide entiteiten: `order_posnummers`, `user_roles`

### Kolommen
- Primary keys: altijd `id`
- Foreign keys: `{entiteit}_id` (bijv. `project_id`, `fase_id`, `laser_job_id`)
- Booleans: `is_active`, `is_consumed`, `is_completed` — altijd `is_` prefix
- Nederlands voor domeinkolommen: `naam`, `beschrijving`, `kwaliteit`, `gewicht`, `opmerkingen`
- Engels voor technische kolommen: `status`, `created_at`, `email`, `file_path`

### Constraints
- CHECK: `check_{tabel}_{veld}` of `check_{beschrijving}`
- UNIQUE: `unique_{beschrijving}`
- Foreign key: `fk_{tabel}_{doel}`

### Indexen
- Patroon: `idx_{tabel}_{kolom}` (enkelvoud) of `idx_{tabel}_{kolom1}_{kolom2}` (composiet)

### ORM Modellen
- PascalCase, enkelvoud: `User`, `Plate`, `LaserJob`, `LaserLineItem`
- Altijd importeren in `backend/models/__init__.py` — zonder deze import werken relaties niet

---

## Foreign Key Gedrag

| Situatie | ON DELETE | Wanneer |
|----------|-----------|---------|
| Kind is zinloos zonder ouder | CASCADE | `claims` bij plaatverwijdering, `fases` bij projectverwijdering |
| Referentie voor audit/traceability | SET NULL | `uploaded_by`, `exported_by`, laser job ↔ project |
| Ouder mag niet weg als kind bestaat | RESTRICT | `plates` ↔ `materials` via prefix |
| Geen cascade, fout bij verwijdering | *(geen)* | `orders` ↔ `order_types` |

---

## Statusflows

Statusovergangen worden gevalideerd in de **service layer**, niet via database constraints. Een overgang die niet is toegestaan gooit een `WorkflowBlockedError`.

### Plates
```
beschikbaar ──→ geclaimd ──→ bij_laser ──→ beschikbaar / geclaimd
     ↑                                              │
     └──────────────────────────────────────────────┘
     
Elke status ──→ [is_consumed = TRUE]  ← terminal state, onomkeerbaar
```
`is_consumed` is een apart boolean veld, geen statuswaarde. Een verbruikte plaat heeft `is_consumed = TRUE` én behoudt zijn laatste statuswaarde.

### Projects
```
actief ──→ afgerond ──→ geannuleerd
```

### Fases
```
actief ──→ gereed ──→ gearchiveerd
```

### Orderreeksen & Orders
```
open ──→ in_uitvoering ──→ afgerond
                    ↓
                 blocked  (geblokkeerd door vorige stap)
```
`blocked` is de technische implementatie van het vision-principe "geblokkeerde volgende stap": een order kan pas starten als vereiste voorafgaande orders zijn afgerond.

### Laser Jobs
```
concept ──→ gereed_voor_almacam ──→ geexporteerd
```
Export-tracking: `export_date`, `exported_by`, `export_count` worden bijgewerkt bij elke export. Een geëxporteerde job kan opnieuw geëxporteerd worden (count verhoogt).

---

## Tabellen per Module

### Authenticatie & Audit

**users**
Gebruikersaccounts. Wachtwoord als bcrypt hash, nooit plaintext.
Kolommen: `id`, `email` (UNIQUE), `password_hash`, `full_name`, `is_active`, `digital_signature_url`, `created_at`, `updated_at`

**user_roles**
Rol-toewijzingen per gebruiker. Gewone gebruikers hebben altijd precies één rol. De uitzondering is de `admin` rol: die mag gecombineerd worden met één andere rol (bijv. `admin` + `werkvoorbereider`). Dit geeft de admin toegang tot de werkvoorbereider-interface naast de beheerfuncties. In de toekomst worden rolinstellingen en bevoegdheden configureerbaar per rol door de admin.
Kolommen: `id`, `user_id` (CASCADE), `role` (CHECK 8 waarden), `created_at`
Toegestane rolwaarden: `'admin'`, `'werkvoorbereider'`, `'werkplaats'`, `'logistiek'`, `'tekenaar'`, `'laser'`, `'buislaser'`, `'kantbank'`

**audit_logs**
Append-only actielogboek. Nooit bijwerken of verwijderen.
Kolommen: `id`, `user_id`, `action`, `entity_type` (VARCHAR 50), `entity_id` (UUID), `details` (JSONB), `created_at`

---

### PlateStock Module

**materials**
Materiaaltypen met prefix-systeem. Prefix is immutable zodra platen bestaan.
Kolommen: `id`, `plaatcode_prefix` (UNIQUE, max 10, `^[A-Z0-9]+$`), `materiaalgroep`, `specificatie`, `oppervlaktebewerking`, `kleur` (hex), `created_by`, `created_at`, `updated_at`

**plates**
Individuele platen. Plaatnummer = `{prefix}-{NNN}` (bijv. `S235GE-042`).
Kolommen: `id`, `plate_number` (UNIQUE), `material_prefix` (string FK → materials.plaatcode_prefix), `quality`, `thickness`, `width`, `length`, `weight`, `locatie_id` (FK → storage_locations, SET NULL), `heatnummer`, `status` (CHECK), `bij_laser_sinds`, `is_consumed`, `consumed_at`, `consumed_by`, `created_by`, `created_at`, `updated_at`

**Bijzondere FK:** `material_prefix` is een string-FK op `plaatcode_prefix`, niet op `id`. Dit is de enige string-FK in het systeem — bewuste keuze zodat het plaatnummer direct de materiaalcode bevat.

**claims**
Projectclaims op platen. Meerdere actieve claims per plaat zijn toegestaan (bewuste ontwerpkeuze voor flexibiliteit).
Kolommen: `id`, `plate_id` (CASCADE), `project_naam`, `project_fase` (CHECK `^\d{3}$`), `actief`, `m2_geclaimd`, `claimed_by`, `claimed_at`, `notes`

**storage_locations**
Genormaliseerde fysieke opslaglocaties (Lade 1–10, Pallet 1–5, Rest, Bij Laser).
Kolommen: `id`, `naam` (UNIQUE), `beschrijving`, `actief`, `created_at`, `updated_at`

---

### Projecthiërarchie

**projects**
Top-level projectcontainers.
Kolommen: `id`, `code` (UNIQUE, max 10, bijv. `STAGR`), `naam`, `beschrijving`, `status` (CHECK), `is_active`, `created_by`, `created_at`, `updated_at`

**fases**
Deelprojecten binnen een project. Fasenummer is altijd 3 cijfers (`001`, `002`, ...).
Kolommen: `id`, `project_id` (CASCADE), `fase_nummer` (CHECK `^[0-9]{3}$`), `beschrijving`, `opmerkingen_intern`, `opmerkingen_werkplaats`, `montage_datum`, `status` (CHECK), `created_by`, `created_at`, `updated_at`
UNIQUE: `(project_id, fase_nummer)`

**posnummers**
Onderdelen (part numbers) per fase.
Kolommen: `id`, `fase_id` (CASCADE), `posnr` (max 10), `materiaal`, `profiel`, `length_mm`, `width_mm`, `height_mm`, `quantity`, `notes`, `is_active`, `created_at`, `updated_at`
UNIQUE: `(fase_id, posnr)`

---

### Ordersysteem

**order_types**
Seed data — vooraf gedefinieerde bewerkingstypen. Zelden gewijzigd.
Waarden: `Zagen`, `Boren`, `Kanten`, `Lassen`, `Afmonteren`, `Plaat snijden`, `Profiel snijden`
Kolommen: `id`, `name` (UNIQUE), `icon`, `sort_order`, `is_active`, `created_at`

**orderreeksen**
Groepering van orders per fase (bijv. "Volledig", "West-vleugel").
Kolommen: `id`, `fase_id` (CASCADE), `title`, `status` (CHECK), `is_active`, `created_at`, `updated_at`

**orders**
Individuele productieopdrachten.
Kolommen: `id`, `orderreeks_id` (CASCADE), `order_type_id`, `sequence_position`, `status` (CHECK), `assigned_to`, `started_at`, `completed_at`, `completed_by`, `approved_at`, `approved_by`, `created_at`, `updated_at`

**order_posnummers**
Koppeltabel orders ↔ posnummers (M:N).
Kolommen: `id`, `order_id` (CASCADE), `posnummer_id` (CASCADE), `is_completed`, `completed_at`, `created_at`
UNIQUE: `(order_id, posnummer_id)`

---

### Laserplanner Module

Laserplanner-tabellen zijn grotendeels **append-only**: records worden aangemaakt maar niet bijgewerkt. Bij re-import worden items verwijderd en opnieuw aangemaakt. Daarom geen `updated_at` op `laser_line_items`, `laser_csv_imports`, `laser_dxf_files`, `laser_pdf_files`.

**laser_jobs**
Hoofdrecord per laserjob. Koppeling aan project/fase is optioneel (SET NULL bij verwijdering).
Kolommen: `id`, `naam`, `beschrijving`, `project_id` (SET NULL), `fase_id` (SET NULL), `status` (CHECK), `csv_metadata` (JSONB), `export_date`, `exported_by` (SET NULL), `export_count`, `created_by`, `is_active`, `created_at`, `updated_at`

**laser_csv_imports**
Versiehistorie van CSV-uploads per job. Raw content bewaard voor herverwerking.
Kolommen: `id`, `laser_job_id` (CASCADE), `original_filename`, `raw_content` (TEXT — CSV is klein, < 50 KB), `csv_metadata` (JSONB), `uploaded_by` (SET NULL), `uploaded_at`

**laser_line_items**
Regelitems uit CSV-imports. Verwijderd en opnieuw aangemaakt bij re-import.
Kolommen: `id`, `laser_job_id` (CASCADE), `csv_import_id` (CASCADE), `projectcode`, `fasenr`, `posnr`, `profiel`, `aantal`, `lengte`, `kwaliteit`, `gewicht`, `zaag`, `opmerkingen`, `row_number`, `created_at`

**laser_dxf_files**
DXF-bestanden op schijf, pad in database. Drievoudige koppeling: altijd aan job, optioneel aan import en line item.
Kolommen: `id`, `laser_job_id` (CASCADE), `csv_import_id` (SET NULL), `line_item_id` (SET NULL), `original_filename`, `posnr_key`, `file_path` (NOT NULL), `thumbnail_svg` (TEXT), `uploaded_by` (SET NULL), `uploaded_at`

**laser_pdf_files**
PDF-tekeningen, gesplitst per pagina. Eén record per pagina.
Kolommen: `id`, `laser_job_id` (CASCADE), `line_item_id` (SET NULL), `original_pdf_filename`, `page_number`, `posnr_key`, `file_path` (NOT NULL), `thumbnail_png` (TEXT, base64), `uploaded_by` (SET NULL), `uploaded_at`
UNIQUE partial: `(laser_job_id, posnr_key) WHERE posnr_key <> ''`

---

## Bestandsopslag Patroon

Bestanden staan **op schijf**, paden in de database:
```
backend/data/files/{project_id}/{fase_id}/{job_id}/{safe_posnr}/{filename}
                   (_unlinked)  (_unlinked)
```

- `file_path` kolom: VARCHAR(1000), relatief pad vanaf `FILE_STORAGE_PATH`
- Thumbnails staan wél in de database: SVG als TEXT (DXF), PNG als base64 TEXT (PDF)
- Grote binaire bestanden (DXF, PDF zelf) staan altijd op schijf — nooit als BYTEA in de database
- Bij cloud-migratie: alleen de storage-implementatie wisselt, `file_path` conventie blijft gelijk

---

## JSONB Velden

| Tabel | Kolom | Inhoud |
|-------|-------|--------|
| `audit_logs` | `details` | Vrije context over de actie (voor/na waarden, extra info) |
| `laser_jobs` | `csv_metadata` | Metadata uit CSV-header: titel, tekenaar, opdrachtgever etc. |
| `laser_csv_imports` | `csv_metadata` | Kopie van metadata per importversie |

JSONB wordt alleen gebruikt voor flexibele, niet-gestructureerde data. Gestructureerde data krijgt altijd eigen kolommen.

---

## Index Strategie

Altijd een index op:
- Alle foreign key kolommen
- `status` en `is_active` filtervelden
- `created_by` / `uploaded_by`

Gebruik **partial indexes** voor veelgebruikte filters:
```sql
-- Alleen actieve platen
CREATE INDEX idx_plates_active_status ON plates(status, is_consumed) WHERE is_consumed = false;

-- Alleen actieve claims
CREATE INDEX idx_claims_plate_active ON claims(plate_id, actief) WHERE actief = true;
```

Gebruik **composiet indexes** voor veelgebruikte query-combinaties:
```sql
CREATE INDEX idx_fases_project_nummer ON fases(project_id, fase_nummer);
CREATE INDEX idx_laser_line_items_row ON laser_line_items(laser_job_id, row_number);
```

---

## Bekende Inconsistenties (Niet Kopiëren)

Deze afwijkingen bestaan in de huidige codebase maar worden **niet** doorgezet naar nieuwe tabellen:

| Inconsistentie | Bestaande tabellen | Correct patroon |
|---------------|-------------------|-----------------|
| `actief` i.p.v. `is_active` | `claims`, `storage_locations` | Gebruik altijd `is_active` |
| `TIMESTAMP` zonder tijdzone | migraties 001–002 | Gebruik altijd `TIMESTAMPTZ` |
| Laser modellen niet in `__init__.py` | `LaserJob`, `LaserLineItem`, etc. | Altijd importeren in `__init__.py` |
| Dubbele migratienummers (drie × 005) | historisch | Altijd volgend beschikbaar nummer gebruiken |
| `updated_at` trigger ontbreekt | meeste tabellen | SQLAlchemy `onupdate` is voldoende voor nieuwe tabellen |
| DEPRECATED kolommen | `claims.project_number`, `claims.area_needed`, `plates.location` | Nooit gebruiken in nieuwe code |

---

## Geplande Modules — Nog Geen Datamodel

De volgende modules uit de vision hebben nog geen databaseontwerp. Claude Code mag hiervoor **geen** tabellen verzinnen zonder expliciete opdracht en ontwerp. Wanneer een module wordt opgepakt, wordt eerst het datamodel hier vastgelegd vóór er code wordt geschreven.

| Module | Status |
|--------|--------|
| **Checklists** | Geen tabellen — ontwerp nog te maken |
| **Bestandsbeheer** | Geen tabellen — ontwerp nog te maken |
| **Fotodocumentatie** | Geen tabellen — ontwerp nog te maken |
| **Certificaatexport** | Geen tabellen — ontwerp nog te maken |
| **Notificaties** | Geen tabellen — ontwerp nog te maken |

- Elk schemawijziging krijgt een nieuw genummerd SQL-bestand: `NNN_beschrijving.sql`
- Gebruik het eerstvolgende vrije nummer — nooit een bestaand nummer hergebruiken
- Eenmaal toegepaste migraties worden **nooit** gewijzigd
- Migraties zijn idempotent — geschreven zodat ze opnieuw kunnen worden afgespeeld
- Data-migraties (bestaande records bijwerken) horen in een apart migratiebestand, niet in applicatiecode
