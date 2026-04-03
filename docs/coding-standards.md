# MES Kersten — Coding Standards

> Dit document beschrijft de concrete code-regels voor MES Kersten. Claude Code volgt deze regels altijd — ook als een andere aanpak technisch mogelijk is. Consistentie is belangrijker dan perfectie.

---

## Backend — Algemene Regels

### Lagenmodel — Nooit Omzeilen

```
Route → Service → Model → PostgreSQL
```

- Routes zijn **dunne wrappers**: geen business logic, geen db.commit()
- Services bevatten **alle bedrijfslogica**: validatie, transacties, audit logging
- Models zijn **puur ORM**: geen logica, alleen kolommen, relaties en constraints

### Services — Verplicht Patroon

Alle service-methoden zijn `@staticmethod`. Elke methode bezit zijn eigen transactie:

```python
@staticmethod
def create_material(db: Session, user_id: UUID, ...) -> Material:
    try:
        # 1. Validatie eerst
        if not PlateStockService.validate_prefix_unique(db, plaatcode_prefix):
            raise MaterialPrefixNotUniqueException(...)

        # 2. Object aanmaken
        obj = Material(...)
        db.add(obj)
        db.flush()  # ID beschikbaar zonder commit

        # 3. Audit log VOOR commit (atomair)
        log_action(db, user_id, AuditAction.CREATE_MATERIAL,
                   EntityType.MATERIAL, obj.id,
                   details={...})

        # 4. Commit als laatste
        db.commit()
        db.refresh(obj)
        return obj

    except MaterialPrefixNotUniqueException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
```

**Volgorde is verplicht:** validatie → aanmaken → flush → audit → commit → refresh

### Routes — Verplicht Patroon

```python
@router.post("/materials", response_model=MaterialResponse)
async def create_material(
    material: MaterialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_werkvoorbereider)
):
    from services.exceptions import MaterialPrefixNotUniqueException  # lazy import

    try:
        return PlateStockService.create_material(db=db, user_id=current_user.id, ...)
    except MaterialPrefixNotUniqueException as e:
        raise HTTPException(status_code=400, detail=str(e.message))
    except ServiceError as e:
        raise HTTPException(status_code=400, detail=e.message)
```

- Exception imports **binnen** de functie (lazy import)
- Specifieke exceptions eerst, generieke `ServiceError` als vangnet
- Foutmeldingen in `detail` altijd in het **Nederlands**

### Autorisatie

Gebruik altijd de juiste dependency — nooit zelf rollen checken in route-body:

```python
Depends(require_admin)                      # alleen admin
Depends(require_admin_or_werkvoorbereider)  # admin of werkvoorbereider
Depends(require_werkplaats_access)          # werkplaats, logistiek, admin, werkvoorbereider
Depends(get_current_user)                   # elke ingelogde gebruiker
```

Bij wijziging in permissies: altijd **ook** `frontend/src/types/roles.ts` aanpassen.

### Custom Exceptions

Nieuwe exceptions altijd in `backend/services/exceptions.py` als lege subklasse:

```python
class LaserJobNotFoundError(ServiceError):
    pass

class LaserJobAlreadyExportedError(ServiceError):
    pass
```

Nooit generieke `ServiceError` gooien met een message — gebruik altijd een specifieke subklasse.

### Audit Logging

Verplicht bij alle CREATE, UPDATE en DELETE operaties. Altijd **voor** de commit:

```python
log_action(
    db=db,
    user_id=user_id,
    action=AuditAction.UPDATE_PLATE,
    entity_type=EntityType.PLATE,
    entity_id=plate.id,
    details={"oude_status": old_status, "nieuwe_status": new_status}
    # auto_commit=False is de default — niet wijzigen
)
db.commit()
```

### Query Patronen

Geen N+1 queries. Gebruik altijd JOIN of eager loading:

```python
# Tellingen via JOIN + GROUP BY (niet via losse queries)
query = db.query(
    Material,
    func.coalesce(func.count(Plate.id), 0).label('plate_count')
).outerjoin(Plate, Material.plaatcode_prefix == Plate.material_prefix)
query = query.group_by(Material.id)

# Relaties via joinedload/selectinload
query = db.query(Plate).options(
    joinedload(Plate.material),
    joinedload(Plate.claims).joinedload(Claim.claimer)
)
```

Gebruik `func.coalesce(..., 0)` voor NULL-safe tellingen.

### Pydantic Schemas — Base/Create/Update/Response

```python
# BASE — gedeelde velden en validatie
class MaterialBase(BaseModel):
    materiaalgroep: str = Field(..., min_length=1, max_length=50)
    plaatcode_prefix: str = Field(..., min_length=1, max_length=10)

    @field_validator('plaatcode_prefix')
    @classmethod
    def validate_prefix(cls, v):
        if not re.match(r'^[A-Z0-9]+$', v):
            raise ValueError('Alleen hoofdletters en cijfers toegestaan')
        return v

# CREATE — erft van Base
class MaterialCreate(MaterialBase):
    pass

# UPDATE — NIET van Base, alle velden Optional, gevoelige velden weggelaten
class MaterialUpdate(BaseModel):
    materiaalgroep: Optional[str] = Field(None, min_length=1, max_length=50)
    # plaatcode_prefix NIET in update (immutable als platen bestaan)

# RESPONSE — erft van Base, voegt server-velden toe
class MaterialResponse(MaterialBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    created_by: Optional[UUID] = None
    model_config = ConfigDict(from_attributes=True)
```

`ConfigDict(from_attributes=True)` is verplicht op alle Response-schemas.

### Statusflows — Validatie in Service Layer

Statusovergangen worden **nooit** afgedwongen via database constraints, altijd in de service:

```python
TOEGESTANE_OVERGANGEN = {
    'concept': ['gereed_voor_almacam'],
    'gereed_voor_almacam': ['geexporteerd', 'concept'],
    'geexporteerd': ['concept'],
}

if nieuwe_status not in TOEGESTANE_OVERGANGEN.get(job.status, []):
    raise WorkflowBlockedError(
        f"Overgang van '{job.status}' naar '{nieuwe_status}' is niet toegestaan"
    )
```

### Main.py — Exception Handlers Voor Routers

Exception handlers moeten altijd **voor** de router-registraties staan:

```python
# EERST exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc): ...

# DAN routers
app.include_router(platestock.router, prefix="/api/platestock")
```

### Bestandsopslag

Bestanden altijd op schijf, pad in database. Nooit binaire content als BYTEA:

```python
# CORRECT
file_path = storage.save(relative_path, content)
db_record.file_path = file_path

# FOUT
db_record.file_content = content  # Nooit
```

---

## Backend — Verboden Patronen

| Verboden | Waarom |
|----------|--------|
| `db.commit()` in een route | Service owns transactions |
| Business logic in route | Routes zijn dunne wrappers |
| Directe SQL strings | Altijd SQLAlchemy ORM |
| N+1 queries (loop + losse query) | Gebruik JOIN of joinedload |
| Hardcoded configuratie | Alles via `config.py` en `.env` |
| `except Exception` zonder rollback | Altijd rollback bij fout |
| `log_action()` ná `db.commit()` | Logging moet atomair zijn |
| Binaire bestanden als database-kolom | Bestanden op schijf |
| Plaintext wachtwoorden | Bcrypt via passlib |
| JWT in response body | httpOnly cookies |
| Generieke `ServiceError` gooien | Altijd specifieke subklasse |

---

## Frontend — Algemene Regels

### Hooks vs Components — Strikte Scheiding

**In hooks (`src/hooks/`):**
- API calls via `useQuery` en `useMutation`
- Cache invalidatie via `queryClient.invalidateQueries()`
- Toast notificaties (`toast.success()`, `toast.error()`)

**In components/pages:**
- Lokale UI state (`useState`)
- Event handlers die hooks aanroepen
- JSX rendering en conditional rendering

### Query Hooks Patroon

```typescript
export function useMaterials() {
  return useQuery({
    queryKey: ['materials'],
    queryFn: () => api.get<Material[]>('/api/platestock/materials').then(r => r.data),
    staleTime: 60_000,  // 60 seconden — standaard
  })
}
```

Voor statusgevoelige data (platen, orders, laserjobs): `staleTime: 30_000`.

### Mutation Hooks Patroon

```typescript
export function useCreateMaterial() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: MaterialCreate) =>
      api.post<Material>('/api/platestock/materials', data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['materials'] })
      toast.success('Materiaal toegevoegd')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Fout bij toevoegen materiaal')
    }
  })
}
```

Bij complexe foutafhandeling (bijv. validatiefouten):

```typescript
onError: (error: any) => {
  let errorMessage = 'Fout bij toevoegen materiaal'
  if (error.response?.data) {
    const data = error.response.data
    if (typeof data.detail === 'string') {
      errorMessage = data.detail
    } else if (data.errors?.length > 0) {
      const firstError = data.errors[0]
      const fieldName = firstError.loc?.[firstError.loc.length - 1] || 'veld'
      errorMessage = `Validatie fout bij ${fieldName}: ${firstError.msg}`
    }
  }
  toast.error(errorMessage)
}
```

### Cache Invalidatie

Na elke mutatie: expliciete invalidatie op het juiste niveau:

```typescript
// Na create/update/delete van een materiaal:
queryClient.invalidateQueries({ queryKey: ['materials'] })

// Na statuswijziging van een plaat (ook stats bijwerken):
queryClient.invalidateQueries({ queryKey: ['plates'] })
queryClient.invalidateQueries({ queryKey: ['stats'] })
```

### Pagina Structuur

```tsx
export function Laserplanner() {
  // 1. Lokale UI state
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState<LaserJobStatus | 'alle'>('alle')

  // 2. Data hooks
  const { data: jobs, isLoading } = useLaserJobs()
  const deleteJob = useDeleteJob()

  // 3. Computed values (useMemo)
  const filtered = useMemo(() => ..., [jobs, filter])

  // 4. Event handlers
  const handleDelete = async (id: string) => { ... }

  // 5. JSX — altijd gewrapped in <Layout>
  return (
    <Layout>
      <div className="space-y-6">
        {isLoading && <Loader2 className="h-6 w-6 animate-spin" />}
        {/* content */}
        <CreateModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </div>
    </Layout>
  )
}
```

Volgorde is verplicht: state → hooks → computed → handlers → JSX.

### Modal/Dialog Patroon

```tsx
interface CreateJobModalProps {
  open: boolean
  onClose: () => void
}

export function CreateJobModal({ open, onClose }: CreateJobModalProps) {
  const createJob = useCreateLaserJob()
  const [formData, setFormData] = useState({ naam: '', beschrijving: '' })

  const isFormValid = formData.naam.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await createJob.mutateAsync(formData)
    setFormData({ naam: '', beschrijving: '' })  // reset
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nieuwe Laserjob</DialogTitle>
          <DialogDescription>Maak een nieuwe laserjob aan</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* velden */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuleren</Button>
            <Button type="submit" disabled={createJob.isPending || !isFormValid}>
              {createJob.isPending ? 'Bezig...' : 'Aanmaken'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

Verplicht: `DialogDescription` altijd aanwezig (anders shadcn/ui waarschuwing).

### Formulieren

Geen react-hook-form of zod — gebruik gecontroleerde state:

```typescript
const [formData, setFormData] = useState({ naam: '', project_id: '' })

// Validatie via boolean expressie
const isFormValid = formData.naam.trim() && formData.project_id

// Update patroon
onChange={(e) => setFormData({ ...formData, naam: e.target.value })}

// Lege optionele velden als undefined, niet als lege string
beschrijving: formData.beschrijving || undefined
```

### Loading States

```tsx
// Pagina-level loading
{isLoading && <Loader2 className="h-6 w-6 animate-spin" />}

// Submit-knop loading
<Button disabled={mutation.isPending}>
  {mutation.isPending ? 'Bezig...' : 'Aanmaken'}
</Button>
```

### shadcn/ui Regels

- Gebruik altijd shadcn/ui componenten — geen eigen HTML buttons, inputs of selects
- Geen nieuwe UI-libraries installeren — alleen shadcn/ui + Tailwind + lucide-react
- Elke `Dialog` heeft altijd een `DialogDescription` (ook als `className="sr-only"`)
- Toaster staat in `App.tsx`: `<Toaster position="top-right" richColors />`

---

## Frontend — Verboden Patronen

| Verboden | Correct alternatief |
|----------|---------------------|
| `axios` direct in een component | Via hook (`useMutation`/`useQuery`) |
| `toast` in een component | In `onSuccess`/`onError` van hook |
| `queryClient.invalidateQueries` in component | In `onSuccess` van hook |
| `useEffect` voor data fetching | `useQuery` |
| `any` in interface definities | Correcte type in `database.ts` |
| Globale state buiten React Query/AuthContext | Lokale state of query cache |
| `window.location` voor navigatie | `useNavigate()` |
| `export default` voor nieuwe pagina's | `export function` (named export) |
| Nieuwe UI-library installeren | Shadcn/ui uitbreiden |
| react-hook-form of zod gebruiken | Controlled state met useState |

---

## Naamgeving

### Bestanden

| Context | Conventie | Voorbeeld |
|---------|-----------|-----------|
| Backend model | snake_case, enkelvoud | `laser_job.py`, `plate.py` |
| Backend API / service / schema | snake_case, modulenaam | `platestock.py`, `laserplanner.py` |
| Frontend pagina | PascalCase | `Voorraad.tsx`, `LaserplannerDetail.tsx` |
| Frontend hook | camelCase met `use` prefix | `usePlateStock.ts`, `useLaserplanner.ts` |
| Frontend component | PascalCase | `CreateJobModal.tsx`, `PlateCard.tsx` |
| Frontend types | camelCase | `database.ts`, `roles.ts` |

### Hooks

```
use{Entiteiten}()          — lijst            useQuery
use{Entiteit}(id)          — enkel item       useQuery
useCreate{Entiteit}()      — aanmaken         useMutation
useUpdate{Entiteit}()      — bijwerken        useMutation
useDelete{Entiteit}()      — verwijderen      useMutation
use{Actie}{Entiteit}()     — specifieke actie useMutation
```

### TypeScript Interfaces

```
{Entiteit}                 — basistype        Plate, Material
{Entiteit}Create           — aanmaken         PlateCreate
{Entiteit}Update           — bijwerken        PlateUpdate
{Entiteit}WithRelations    — met relaties     PlateWithRelations
{Entiteit}Response         — API response     MaterialResponse
```

### Taal

- **Gebruikersgerichte tekst**: altijd Nederlands — labels, buttons, toasts, foutmeldingen
- **Code**: altijd Engels — variabelen, functies, klassen, query keys
- **API endpoints**: Nederlands waar domeinspecifiek (`/naar-laser`, `/verbruiken`)

### React Query Keys

```typescript
queryKey: ['materials']              // lijst
queryKey: ['materials', filters]     // lijst met filters
queryKey: ['plate', id]              // enkel item
queryKey: ['stats', 'overview']      // statistieken

// Invalidatie altijd op lijst-niveau
queryClient.invalidateQueries({ queryKey: ['materials'] })
```

---

## TypeScript

- `tsconfig.json` heeft `strict: true` — nooit verzwakken
- Alle domeintypen in `frontend/src/types/database.ts`
- Alle roltypen in `frontend/src/types/roles.ts`
- Altijd interfaces, geen classes
- UUID's als `string` (niet als speciaal UUID-type)
- Statussen als union types: `'concept' | 'gereed_voor_almacam' | 'geexporteerd'`
- `error: any` in onError callbacks is toegestaan (geen typed errors)
- Type inference vertrouwen voor lokale state: `useState('')`, `useState(false)`

---

## Modellen — Kritieke Regel

Elk nieuw SQLAlchemy model **moet** geïmporteerd worden in `backend/models/__init__.py`.
Zonder deze import worden relaties niet geladen en werken migraties niet correct.

```python
# backend/models/__init__.py
from .user import User
from .plate import Plate
from .laser_job import LaserJob
from .nieuwe_module import NieuwModel  # ← altijd toevoegen bij nieuw model
```

---

## Migraties — Kritieke Regels

- Eerstvolgende **vrije** nummer gebruiken (huidige hoogste: 017)
- Nooit een bestaand migratiebestand aanpassen
- Altijd idempotent schrijven (opnieuw uitvoerbaar)
- Data-migraties in een apart bestand, niet in applicatiecode
- Altijd `TIMESTAMPTZ`, nooit `TIMESTAMP`
- Altijd `is_active`, nooit `actief` (historische inconsistentie)
