# MES Kersten — Architecture Document

> Dit document beschrijft de technische architectuur van MES Kersten. Het is de leidraad voor alle ontwikkeling — bestaande patronen worden hier vastgelegd, toekomstige richtingen worden hier bepaald. Claude Code volgt dit document altijd.

---

## Technische Stack

### Backend
| Component | Technologie | Versie |
|-----------|-------------|--------|
| Framework | FastAPI | 0.115.0 |
| Runtime | Python + uvicorn | 3.11+ |
| ORM | SQLAlchemy | 2.0.36 |
| Database | PostgreSQL | 15+ |
| Authenticatie | python-jose (JWT) + passlib (bcrypt) | — |
| Validatie | Pydantic + pydantic-settings | 2.x |
| PDF verwerking | PyMuPDF (fitz) | — |
| Bestandsopslag | aiofiles | — |
| Rate limiting | slowapi | — |
| Testing | pytest + httpx | — |

### Frontend
| Component | Technologie | Versie |
|-----------|-------------|--------|
| Framework | React + TypeScript | 18 / 5 |
| Build | Vite | 5 |
| Routing | react-router-dom | 6 (v7 flags) |
| Server state | TanStack React Query | 5 |
| HTTP | axios (met interceptors) | — |
| UI componenten | shadcn/ui (Radix UI + TailwindCSS) | — |
| Formulieren | Gecontroleerde state via useState | — |
| Notificaties | sonner | — |
| Iconen | lucide-react | — |

---

## Modulestructuur

De applicatie is opgebouwd uit de volgende modules. Elke module heeft een eigen verantwoordelijkheid en een eigen set van API-routes, services, modellen en frontend-pagina's.

| Module | Backend | Frontend | Omschrijving |
|--------|---------|----------|--------------|
| **Authenticatie & Gebruikersbeheer** | `api/auth.py` | `pages/Login.tsx`, `pages/Profile.tsx`, `pages/Admin.tsx` | Inloggen, uitloggen, rollen en rechten |
| **Voorraadbeheer** | `api/platestock.py`, `api/storage_locations.py` | `pages/Voorraad.tsx`, `pages/Claims.tsx`, `pages/StorageLocations.tsx` | Platen, materialen, opslaglocaties, claims en statusflow. Opslaglocaties zijn een onderdeel van voorraadbeheer. |
| **Projecten** | `api/projects.py`, `api/posnummers.py` | `pages/Projects.tsx`, `pages/ProjectDetail.tsx`, `pages/FaseDetail.tsx` | Projecten, fases en BOM per fase. De BOM bevat alle te maken onderdelen met tekeningen, bestanden, aantallen en materiaal. Basis voor alle orders die hieruit voortkomen. |
| **Orders** | `api/orders.py`, `api/laserplanner.py`, `api/order_types.py` | `pages/Laserplanner.tsx`, `pages/LaserplannerDetail.tsx` | Orders per productieproces: plaatlaser, buislaser, zagen, boren, extern. Gegenereerd vanuit de BOM in Projecten. Almacam export is onderdeel van de plaatlaserorder. |
| **Audit Logging** | `utils/audit.py` | — | Cross-cutting concern. Alle significante acties worden automatisch gelogd. Geen eigen UI. |

### Toekomstige modules
- **Planning** — Gantt chart, capaciteitsplanning, volgorde en timing van orders
- **Werkplaats** — Uitvoering op de vloer: voortgang, checklists, digitale handtekeningen
- **Fotodocumentatie** — Foto's koppelen aan orders en onderdelen
- **Certificaatexport** — PDF-generatie voor kwaliteitscertificaten
- **Notificaties** — In-app meldingen bij statuswijzigingen

---

## Laagstructuur

De applicatie volgt een strikte gelaagde architectuur. Elke laag heeft één verantwoordelijkheid. Lagen communiceren altijd via de laag direct eronder — nooit eromheen.

```
Browser
  │
  ▼
API Layer          (backend/api/)
  │  • HTTP request/response
  │  • Input validatie via Pydantic schemas
  │  • Autorisatie via dependency injection
  │  • Vertaalt ServiceError → HTTPException
  │  • Bevat GEEN business logic
  │  • Roept NOOIT db.commit() aan
  ▼
Service Layer      (backend/services/)
  │  • Alle bedrijfslogica
  │  • Bezit eigen transactie (commit/rollback)
  │  • Audit logging vóór commit (atomair)
  │  • Gooit ServiceError subklassen
  ▼
Model Layer        (backend/models/)
  │  • SQLAlchemy ORM modellen
  │  • Relaties, constraints, indexen
  │  • Geen business logic
  ▼
PostgreSQL
```

**Gulden regel:** als je twijfelt waar code thuishoort — business logic hoort altijd in de service layer.

---

## Mappenstructuur

```
mes-kersten/
├── backend/
│   ├── main.py              # App initialisatie, middleware, routers
│   ├── config.py            # Pydantic settings (.env validatie)
│   ├── database.py          # Engine, SessionLocal, get_db()
│   ├── api/                 # Route handlers per module
│   ├── services/            # Business logic per module
│   │   └── exceptions.py    # ServiceError hiërarchie
│   ├── models/              # SQLAlchemy modellen
│   │   └── __init__.py      # ← ALLE modellen moeten hier geïmporteerd zijn
│   ├── schemas/             # Pydantic request/response schemas
│   ├── utils/               # auth.py, audit.py, permissions.py, csrf.py
│   └── data/                # Bestandsopslag op schijf
│
├── frontend/src/
│   ├── App.tsx              # Router, QueryClient, AuthProvider, Toaster
│   ├── pages/               # Paginacomponenten
│   ├── components/          # Herbruikbare componenten + ui/ (shadcn)
│   ├── hooks/               # React Query hooks per module
│   ├── lib/api.ts           # Axios instantie met interceptors
│   └── types/               # TypeScript types en permissiedefinities
│
├── database/
│   ├── run_migration.py     # Migratie-runner
│   └── migrations/          # Genummerde SQL-bestanden (001, 002, ...)
│
└── docs/                    # Projectdocumentatie (vision, architecture, etc.)
```

**Kritieke regel:** elk nieuw SQLAlchemy model moet worden toegevoegd aan `backend/models/__init__.py`. Zonder deze import werkt Alembic/migratie niet correct en kunnen relaties niet worden geladen.

---

## Frontend Architectuur

### State Management
- **UI state** (modals, inputs, filters): lokale component state via `useState`
- **Authenticatie**: React Context (`AuthProvider`) — bevat user, login(), logout()
- **Server state**: TanStack React Query — alle API-data loopt via Query hooks

### Hooks Patroon
Elke module heeft een dedicated hooks-bestand (bijv. `usePlateStock.ts`, `useOrders.ts`). Dit is het vaste patroon:

```typescript
// Query hook
export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get('/platestock/materials').then(r => r.data),
  });
}

// Mutation hook
export function useCreateMaterial() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MaterialCreate) => api.post('/platestock/materials', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] });
      toast.success('Materiaal aangemaakt');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
```

### Cache Strategie
- Standaard `staleTime`: **60 seconden** (niet 5 minuten — te lang voor gedeeld gebruik)
- Statusgevoelige data (platen, orders, laserjobs): maximaal 30 seconden
- Na elke mutatie: expliciete `invalidateQueries` op de betrokken query keys
- `refetchOnWindowFocus: false` — gebruikers werken actief in de app

### API Communicatie
Axios instantie in `lib/api.ts`:
- `withCredentials: true` — httpOnly cookies automatisch meegestuurd
- Request interceptor: CSRF-token toevoegen aan POST/PUT/DELETE/PATCH
- Response interceptor: 401 → `auth:logout` event → AuthProvider navigeert naar `/login`

### Permissies in de UI
`usePermissions()` hook retourneert ~25 boolean flags op basis van de gebruikersrol. Componenten tonen/verbergen UI-elementen op basis hiervan. Dit is **puur cosmetisch** — de echte afdwinging is altijd op de backend.

**Kritieke regel:** elke wijziging in permissies moet op **beide** plekken doorgevoerd worden: backend (`utils/permissions.py`) én frontend (`types/roles.ts`). Dit wordt altijd samen gedaan, nooit apart.

### shadcn/ui Regels
- Elke `Dialog` component moet een `DialogDescription` bevatten (ook als die visueel verborgen is via `sr-only`)
- Gebruik altijd shadcn/ui componenten boven custom HTML-elementen waar beschikbaar

---

## Backend Architectuur

### Service Layer Patroon
Elke service methode bezit zijn eigen transactie:

```python
def create_material(self, db: Session, data: MaterialCreate, user_id: str) -> Material:
    # Validatie
    existing = db.query(Material).filter(Material.prefix == data.prefix).first()
    if existing:
        raise MaterialPrefixNotUniqueException(data.prefix)

    # Aanmaken
    material = Material(**data.model_dump())
    db.add(material)

    # Audit logging VOOR commit (atomair)
    log_action(db, user_id, AuditAction.CREATE, EntityType.MATERIAL,
               str(material.id), auto_commit=False)

    db.commit()
    db.refresh(material)
    return material
```

### Error Handling Patroon
Services gooien `ServiceError` subklassen. Routes vangen deze en zetten ze om:

```python
# Service
raise PlateNotFoundError(plate_id)

# Route
try:
    result = service.get_plate(db, plate_id)
except PlateNotFoundError:
    raise HTTPException(status_code=404, detail="Plaat niet gevonden")
except ServiceError as e:
    raise HTTPException(status_code=400, detail=e.message)
```

### Workflow Status Principe
Het vision-principe "geblokkeerde volgende stap" wordt technisch geborgd via statusvelden en validatie in de service layer. Een stap mag alleen doorgaan als de voorgaande status correct is:

```python
if order.status != OrderStatus.AFGEROND:
    raise WorkflowBlockedError("Vorige stap moet eerst afgerond zijn")
```

Elke module met een statusflow definieert:
1. Welke statussen bestaan (als CHECK constraint in PostgreSQL)
2. Welke overgangen toegestaan zijn (gevalideerd in de service layer)
3. Welke rol welke overgang mag uitvoeren (gecontroleerd via permissions dependency)

---

## Database

### Conventies
- **Tabelnamen**: meervoud, snake_case (`users`, `plates`, `laser_jobs`)
- **Primary keys**: UUID via `gen_random_uuid()`
- **Timestamps**: `created_at` (immutable) en `updated_at` (auto-update)
- **Foreign keys**: CASCADE voor afhankelijke data, SET NULL voor audit-referenties
- **Enums**: CHECK constraints in PostgreSQL (`CHECK (status IN (...))`), niet als Python enums
- **Soft deletes**: `is_active` boolean flag — niets wordt echt verwijderd. Gebruik altijd `is_active`, nooit `actief` (historische inconsistentie in oudere tabellen)
- **Indexen**: op alle foreign keys en veelgebruikte filtervelden

### Migratiestrategie
Genummerde SQL-bestanden in `database/migrations/` (001, 002, ...). Uitgevoerd via `run_migration.py`. Regels:
- Eenmaal toegepaste migraties worden **nooit** gewijzigd
- Elke schemawijziging krijgt een nieuw migratiebestand
- Migraties zijn idempotent — ze kunnen opnieuw afgespeeld worden op een nieuwe Supabase/PostgreSQL-instantie

**Toekomstige stap:** migratie naar Alembic voor automatische schema-diffing en rollback-ondersteuning. Prioriteit zodra handmatig migratiewerk een bottleneck wordt.

### Kerntabellen

| Module | Tabellen |
|--------|----------|
| Authenticatie & Gebruikersbeheer | `users`, `user_roles` |
| Voorraadbeheer | `materials`, `plates`, `claims`, `storage_locations` |
| Projecten | `projects`, `fases`, `posnummers` |
| Orders | `orderreeksen`, `orders`, `order_types`, `order_posnummers`, `laser_jobs`, `laser_line_items`, `laser_dxf_files`, `laser_pdf_files`, `laser_nc_files`, `laser_step_files` |
| Audit Logging | `audit_logs` |

---

## Authenticatie & Autorisatie

### Token Flow
1. Login → JWT (HS256, 24 uur) opgeslagen als **httpOnly cookie** (nooit localStorage)
2. Elke request → cookie automatisch meegestuurd → `get_current_user()` dependency valideert
3. 401 response → axios interceptor → `auth:logout` event → redirect naar `/login`

### Backend Autorisatie (dependency injection)
```python
@router.post("/materials")
def create_material(
    current_user: User = Depends(require_admin_or_werkvoorbereider),
    db: Session = Depends(get_db)
):
    ...
```

Beschikbare dependencies in `utils/permissions.py`:
- `require_admin()`
- `require_admin_or_werkvoorbereider()`
- `require_werkplaats_access()` — werkplaats, logistiek, admin, werkvoorbereider
- `require_any_authenticated()`

### Rolmatrix

| Rol | Plant | Voert uit | Beheert |
|-----|-------|-----------|---------|
| admin | ✓ | ✓ | ✓ |
| werkvoorbereider | ✓ | — | — |
| werkplaats | — | ✓ | — |
| logistiek | — | ✓ | certificaten |
| tekenaar | — | — | alleen lezen |
| laser | — | plaatlaserorders | — |
| buislaser | — | buislaserorders | — |
| kantbank | — | kantbankorders | — |

---

## Bestandsbeheer

### Principe
Bestanden staan **op schijf**, paden in de database. Dit maakt cloud-migratie eenvoudig — alleen de storage backend hoeft te wisselen, de rest van de code blijft ongewijzigd.

### Padstructuur
```
backend/data/files/{project_id}/{fase_id}/{job_id}/{safe_posnr}/{filename}
```
Niet-gekoppelde bestanden gebruiken `_unlinked` als placeholder. Het relatieve pad (vanaf `data/`) wordt opgeslagen in de `file_path` kolom.

### Ondersteunde bestandstypen per module
- **Projecten (BOM)**: DXF, PDF, NC (.nc1), STEP (.stp)
- **Orders**: CSV (materiaallijsten), Almacam export

### Toekomstige Cloud Migratie
`FILE_STORAGE_PATH` is gecentraliseerd in `config.py`. Bij migratie naar Supabase Storage of S3 wordt alleen de storage klasse vervangen door een cloud-implementatie met dezelfde interface. Geen andere codewijzigingen nodig.

---

## Consistente Patronen

### Audit Logging
Elke significante wijziging wordt gelogd **vóór** de commit:
```python
log_action(db, user_id, AuditAction.UPDATE, EntityType.PLATE,
           plate_id, details={"status": "verbruikt"}, auto_commit=False)
db.commit()
```

### N+1 Query Preventie
- Gebruik `joinedload()` of `selectinload()` voor relaties
- Gebruik JOINs met GROUP BY voor aggregaties, nooit loops met losse queries
- `func.coalesce(func.count(...), 0)` voor NULL-safe tellingen

### API Response Structuur
- Enkele entiteit: Pydantic model direct retourneren
- Lijst: `List[Model]`
- Bulk operaties: object met resultaat + metadata
- Foutmelding: altijd in het Nederlands via `detail` veld

---

## Bekende Beperkingen & Openstaande Taken

### CSV Import — geen delta
Bij een nieuwe CSV-import worden line items toegevoegd, niet vergeleken met bestaande items. Herhaald importeren maakt duplicaten. **Moet opgelost worden** voor dagelijks gebruik: implementeer een delta-import die bestaande items vergelijkt en alleen nieuwe toevoegt.

### Legacy DXF-opslag
Oudere DXF-records staan nog als TEXT in de database. Nieuwere records gebruiken `file_path` naar schijf. De transitie moet volledig afgerond worden: migreer alle bestaande TEXT-content naar schijf.

### Transaction Management
De meeste services volgen "service owns transaction" strikt. Enkele oudere methoden hebben meerdere commits of missen een expliciete commit. Refactor naar volledig atomaire transacties bij aanraking van die code.

### Technische schuld
Een volledige analyse van technische schuld en refactorkandidaten staat gedocumenteerd in `docs/refactor-report.md` en `docs/refactor-analyse.md`.

---

## Toekomstige Architectuurrichting

### Real-time Updates (noodzakelijk voor werkvloer)
De vision vereist dat wijzigingen direct zichtbaar zijn voor alle gebruikers. De huidige architectuur is request/response — er is geen push-mechanisme. Zodra de werkplaatsmodule actief wordt, moet dit opgelost worden via **Server-Sent Events (SSE)** voor eenrichtings-notificaties, of **WebSockets** als bidirectionele communicatie nodig is. FastAPI ondersteunt beide natively.

### Automatische TypeScript Types
FastAPI genereert automatisch een OpenAPI spec. Met `openapi-typescript` kunnen TypeScript types automatisch gegenereerd worden vanuit deze spec. Dit elimineert handmatige synchronisatie tussen Pydantic schemas en TypeScript types. Implementeren zodra type-mismatches een terugkerend probleem worden.

### Background Tasks voor Zware Operaties
PDF-verwerking, ZIP-export, thumbnail-generatie en toekomstige fotodocumentatie zijn operaties die de HTTP-response kunnen blokkeren. Nieuwe features in deze categorie worden gebouwd met **FastAPI BackgroundTasks** of een lichte task queue, zodat de gebruiker direct feedback krijgt en de verwerking asynchroon plaatsvindt.

### UNS Integratie (lange termijn)
De eindvisie is een Unified Namespace waarin MES, AFAS, machines en urenregistratie verbonden zijn. Wanneer MES data publiceert naar externe systemen, gebeurt dit via:
- Gestandaardiseerde API-endpoints met versioning (`/api/v1/...`)
- Event-gebaseerde notificaties (webhooks of message broker)
- Geen directe database-koppelingen tussen systemen

Nieuwe modules worden gebouwd zonder aannames over interne implementatie van externe systemen.

### AFAS Koppeling
Projecten en fases worden momenteel handmatig aangemaakt. Toekomstige integratie met AFAS via de GetConnector REST API zorgt voor automatische import van projecten en fases zodra ze in AFAS aangemaakt worden.
