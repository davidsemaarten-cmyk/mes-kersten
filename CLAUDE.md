# CLAUDE.md

Dit bestand geeft Claude Code instructies voor het werken in deze repository.

## Projectdocumentatie — Altijd Eerst Lezen

Lees deze documenten **voordat** je code schrijft. Ze zijn de source of truth voor alle ontwikkeling:

| Document | Inhoud |
|----------|--------|
| `docs/vision.md` | Wat het systeem is, voor wie, en waarom |
| `docs/architecture.md` | Technische structuur, lagenmodel, patronen |
| `docs/data-model.md` | Database tabellen, relaties, statusflows, conventies |
| `docs/coding-standards.md` | Concrete code-regels voor backend en frontend |

Bij twijfel over een ontwerpkeuze: raadpleeg eerst deze documenten.

---

## Servers Starten

### Backend
```bash
cd backend
venv\Scripts\python main.py
# Draait op: http://localhost:8000
# API docs:  http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm run dev
# Draait op: http://localhost:5173
```

### Database migratie
```bash
cd database
py -3.11 run_migration.py --all
# Of specifiek:
py -3.11 run_migration.py 018_beschrijving.sql
```

---

## Kritieke Regels — Nooit Vergeten

### 1. Models importeren in `__init__.py`
Elk nieuw SQLAlchemy model **moet** geïmporteerd worden in `backend/models/__init__.py`.
Zonder deze import werken relaties niet en falen migraties stil.

### 2. Nooit `db.commit()` in routes
Commits en rollbacks horen uitsluitend in de service layer. Routes zijn dunne wrappers.

### 3. Audit logging vóór commit
`log_action()` altijd aanroepen **vóór** `db.commit()`, zodat log en wijziging atomair zijn.

### 4. Permissies op twee plekken
Bij elke permissiewijziging: zowel `backend/utils/permissions.py` als `frontend/src/types/roles.ts` aanpassen.

### 5. Migraties zijn immutable
Eenmaal toegepaste migraties worden nooit gewijzigd. Gebruik altijd een nieuw bestand met het eerstvolgende vrije nummer (huidig hoogste: 019).

### 6. Soft delete: altijd `is_active`
Nieuwe tabellen gebruiken altijd `is_active` (niet `actief` — historische inconsistentie in claims en storage_locations).

### 7. Bestanden op schijf
DXF, PDF en andere bestanden staan op schijf in `backend/data/`. Nooit als binaire content in de database.

### 8. Formulieren via useState
Geen react-hook-form of zod. Formulierstate via `useState`, validatie via boolean expressie.

---

## Bekende Valkuilen

**CORS-fout in de browser:**
→ Backend is gecrasht. Check de terminal, niet de CORS-configuratie.

**Relaties laden niet / migratie mislukt:**
→ Nieuw model ontbreekt in `backend/models/__init__.py`.

**Pydantic validatiefout (422) niet goed geformatteerd:**
→ Exception handlers staan ná routers in `main.py`. Exception handlers moeten altijd eerst.

**Dubbele plaatnummers:**
→ Gebruik altijd `PlateStockService.generate_plate_number()` — nooit handmatig een nummer opbouwen.

---

## Module Status

| Module | Status |
|--------|--------|
| PlateStock | ✅ Operationeel |
| Laserplanner | ✅ Operationeel |
| Projectbeheer | ✅ Operationeel (basis) |
| Orderbeheer | ⚠️ Basis operationeel |
| Checklists | 🔜 Gepland |
| Bestandsbeheer | 🔜 Gepland |
| Orderuitvoering | 🔜 Gepland |
| Fotodocumentatie | 🔜 Gepland |
| Certificaatexport | 🔜 Gepland |
| Notificaties | 🔜 Gepland |

Zie `docs/vision.md` voor het doel van elke module.
Zie `docs/data-model.md` voor de sectie "Geplande Modules — Nog Geen Datamodel" voordat je aan een nieuwe module begint.
