# MES Kersten — UI Principles

> Dit document beschrijft de visuele en interactie-principes voor MES Kersten. De inspiratiebron is Linear (linear.app). Claude Code volgt deze principes bij elke nieuwe pagina, component of modal.

---

## Kernfilosofie

MES Kersten is gebouwd voor mensen die van papier houden. De interface moet makkelijker zijn dan papier — niet imposanter. Elk scherm moet zonder uitleg werken. Als een gebruiker moet nadenken over hoe iets werkt, is de interface niet goed genoeg.

**Eén zin:** Doe minder, maar doe het perfect.

---

## 1. Witruimte is geen verspilling

Linear's schermen zijn opvallend leeg. Dat is bewust. Witruimte geeft rust en focus.

- Gebruik royale padding binnen kaarten en modals (`p-6` of meer)
- Laat lijsten ademen — genoeg ruimte tussen rijen zodat je ze apart kunt lezen
- Geen volle schermen met informatie — één primaire taak per scherm
- Lege staten (geen items) krijgen een rustige, uitnodigende boodschap — geen lege tabel

```tsx
// Lege staat — niet een lege tabel, maar een uitnodiging
{items.length === 0 && (
  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
    <Package className="h-10 w-10 mb-3 opacity-40" />
    <p className="text-sm">Nog geen platen toegevoegd</p>
    <Button variant="outline" size="sm" className="mt-4" onClick={onAdd}>
      Eerste plaat toevoegen
    </Button>
  </div>
)}
```

---

## 2. Kleur heeft betekenis — gebruik het spaarzaam

Bijna geen kleur. Alleen voor status en acties die aandacht vragen.

### Kleurgebruik
- **Grijs** — standaard tekst, labels, secundaire informatie
- **Zwart/donker** — primaire tekst, titels
- **Blauw/paars** — primaire actieknop (aanmaken, opslaan, exporteren)
- **Groen** — positieve status (afgerond, beschikbaar)
- **Oranje/geel** — waarschuwing, in uitvoering, bij laser
- **Rood** — fout, verwijderen, geblokkeerd
- Statuskleuren altijd klein in badges — nooit grote gekleurde vlakken

### Statuskleuren voor MES

**PlateStock**
| Status | Kleur | Tailwind klassen |
|--------|-------|-----------------|
| beschikbaar | groen | `bg-green-50 border-green-200 text-green-700` |
| geclaimd | blauw | `bg-blue-50 border-blue-200 text-blue-700` |
| bij_laser | oranje | `bg-orange-50 border-orange-200 text-orange-700` |
| verbruikt | grijs | `bg-muted border-border text-muted-foreground` |

**Laserplanner**
| Status | Kleur | Tailwind klassen |
|--------|-------|-----------------|
| concept | grijs | `bg-muted border-border text-muted-foreground` |
| gereed_voor_almacam | blauw | `bg-blue-50 border-blue-200 text-blue-700` |
| geexporteerd | groen | `bg-green-50 border-green-200 text-green-700` |

**Orders**
| Status | Kleur | Tailwind klassen |
|--------|-------|-----------------|
| open | grijs | `bg-muted border-border text-muted-foreground` |
| in_uitvoering | oranje | `bg-orange-50 border-orange-200 text-orange-700` |
| blocked | rood | `bg-red-50 border-red-200 text-red-700` |
| afgerond | groen | `bg-green-50 border-green-200 text-green-700` |

```tsx
// Statusbadge — altijd variant="outline", altijd dezelfde hoogte
<Badge variant="outline" className="bg-orange-50 border-orange-200 text-orange-700">
  Bij laser
</Badge>
```

---

## 3. Lijstweergave — compact en scanbaar

Rijen zijn smal, informatie is minimaal maar compleet.

### Rij-opbouw
```
[···] [○] Nummer    Omschrijving              [badge]  [datum]  [avatar]
```

- `···` — drag handle, alleen als sorteerbaar
- `○` — statusindicator of checkbox
- Nummer/naam — altijd links, altijd het belangrijkste
- Badges en meta — rechts uitgelijnd
- Datum — relatief weergegeven waar mogelijk ("vandaag", "gisteren", "3 dagen geleden")

### Groepering
Lijsten worden gegroepeerd als de data daardoor logischer wordt. Sectieheader toont naam + aantal. Inklapbaar via pijl links.

```
▼ S235 3mm  (8 stuks)
    S235GE-042   Ligger L100        bij_laser    Jan    vandaag
    S235GE-043   Plaat doorvoer     beschikbaar         gisteren

▼ S235 6mm  (3 stuks)
    S235GE-038   Stijl rechthoek    geclaimd    STAGR   3 dagen geleden
```

### Hover-acties
Acties op een rij verschijnen alleen bij hover — niet altijd zichtbaar. Houdt de lijst rustig.

```tsx
<tr className="group">
  <td>{plate.plate_number}</td>
  <td className="opacity-0 group-hover:opacity-100 transition-opacity">
    <Button variant="ghost" size="sm">Bewerken</Button>
  </td>
</tr>
```

---

## 4. Modals — gefocust en compleet

Modal voor aanmaken en bewerken — nooit een aparte pagina voor een enkel formulier.

### Opbouw
- Titel is een groot tekstveld bovenaan — geen apart label "Naam:"
- Metadata als pill-buttons op één rij onder de titel
- Ruimte voor beschrijving/notities — voelt als een leeg vel papier
- Cancel en primaire actie rechtsonder
- Primaire actie disabled zolang verplichte velden leeg zijn

```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>
        <input
          className="text-2xl font-semibold w-full border-none outline-none placeholder:text-muted-foreground"
          placeholder="Projectnaam"
          value={formData.naam}
          onChange={e => setFormData({...formData, naam: e.target.value})}
        />
      </DialogTitle>
      <DialogDescription className="sr-only">Nieuw project aanmaken</DialogDescription>
    </DialogHeader>

    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Pill-buttons voor metadata */}
      <div className="flex gap-2 flex-wrap">
        <Button type="button" variant="outline" size="sm">Status: Actief</Button>
        <Button type="button" variant="outline" size="sm">Fase: 001</Button>
        <Button type="button" variant="outline" size="sm">Toegewezen aan...</Button>
      </div>

      <textarea
        className="w-full min-h-32 border-none outline-none resize-none text-sm text-muted-foreground"
        placeholder="Beschrijving, opmerkingen..."
      />

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onClose}>Annuleren</Button>
        <Button type="submit" disabled={!isFormValid}>Aanmaken</Button>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

> Gebruik altijd `<form onSubmit={handleSubmit}>` zodat Enter in een veld ook het formulier verstuurt. Pill-buttons krijgen `type="button"` zodat ze de form niet per ongeluk submitten.

---

## 5. Split-pane layout voor detail + context

Wanneer een gebruiker met een lijst werkt maar ook context nodig heeft: lijst links, detail-paneel rechts.

### Wanneer gebruiken
- Laserplanner: job-lijst links, job-details + line items rechts
- Orderbeheer: orderreeks links, order-details + checklists rechts
- Projectbeheer: faselijst links, fase-details + posnummers rechts

### Detail-paneel opbouw
```
Properties          +
  Status            Gereed voor Almacam
  Toegewezen        Jan de Vries
  Startdatum        14 maart
  Exportdatum       —

Voortgang
  Items: 12    Afgerond: 8

Activity
  MD  Job aangemaakt · 2 uur geleden
  JV  CSV geïmporteerd · 1 uur geleden
  JV  Geëxporteerd naar Almacam · 34 min geleden
```

### Inklapbaar paneel
Verborgen via knop rechtsboven. Shortcut zichtbaar bij hover — niet permanent.

```tsx
<Button
  variant="ghost"
  size="icon"
  onClick={() => setDetailOpen(!detailOpen)}
  title={`${detailOpen ? 'Verberg' : 'Toon'} details  Ctrl I`}
>
  <PanelRight className="h-4 w-4" />
</Button>
```

---

## 6. Activity log — traceability zichtbaar in de UI

Elk onderdeel met een statusflow krijgt een activity log. Dit is de traceability uit de vision, zichtbaar gemaakt in de interface — niet verstopt in een rapport.

De `audit_logs` tabel bevat al deze data. De activity log is een UI-laag erop.

### Voorbeeldtijdlijn voor een posnummer
```
MD  Posnr 42 aangemaakt door werkvoorbereider · 2 dagen geleden
⬡   Klaargezet voor laser · 1 dag geleden
⬡   Gesneden op plaatlaser door Jan · gisteren 14:32
⬡   Afgebraamd door Kees · vandaag 08:15
⬡   Samengesteld door Kees · vandaag 11:40
MD  Aangemeld bij poedercoater · vandaag 13:00
```

### Wat gelogd wordt
- Aanmaken van een record
- Statuswijzigingen
- Toewijzingen
- Bestandsuploads (DXF, PDF, foto's)
- Exports (Almacam, certificaten)
- Opmerkingen van gebruikers

```tsx
<div className="space-y-3">
  <h3 className="text-sm font-medium">Activiteit</h3>
  {activities.map(activity => (
    <div key={activity.id} className="flex gap-3 text-sm">
      <Avatar className="h-6 w-6 text-xs">{activity.user_initials}</Avatar>
      <div>
        <span className="text-foreground">{activity.user_name}</span>
        <span className="text-muted-foreground"> {activity.description}</span>
        <span className="text-muted-foreground"> · {activity.time_ago}</span>
      </div>
    </div>
  ))}
  <textarea
    className="w-full text-sm border rounded-md p-3 mt-2"
    placeholder="Opmerking toevoegen..."
  />
</div>
```

---

## 7. Navigatie — smal, hiërarchisch, altijd zichtbaar

### Sidebar-structuur MES
```
[avatar]  MES Kersten

  Overzicht

  Plaatvoorraad
    Materialen
    Platen
    Locaties

  Laserplanner

  Projecten
    [project naam]
      Fase 001
      Fase 002

  Werkplaats
    Orders
    Checklists

  Beheer          (alleen admin)
    Gebruikers
    Instellingen
```

### Regels
- Breedte: maximaal 220px
- Actief item: lichte achtergrond (`bg-accent`), geen vette tekst
- Iconen altijd aanwezig, tekst daarnaast — nooit alleen iconen
- Subnavigatie klapt uit bij klik op sectie
- Geen scroll in de sidebar — alles past

---

## 8. Knoppen — hiërarchie en plaatsing

### Hiërarchie
| Type | Stijl | Gebruik |
|------|-------|---------|
| Primair | filled blauw/paars | Aanmaken, Exporteren, Opslaan |
| Secundair | outline | Annuleren, Bewerken |
| Gevaarlijk | outline rood | Verwijderen |
| Ghost | geen rand | Inline acties, hover-acties |

### Plaatsingsregels
- Primaire actie altijd **rechts**
- Annuleren **links** van primaire actie
- Verwijderen **links** in de footer, ver van opslaan
- Nooit meer dan één primaire knop per scherm/modal

### Laad-staat
```tsx
<Button disabled={isPending}>
  {isPending
    ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Bezig...</>
    : 'Exporteren'
  }
</Button>
```

---

## 9. Formuliervelden

- Label boven het veld, klein en grijs
- Placeholder tekst is beschrijvend: "bijv. S235 zwart 3mm" — niet "Vul in..."
- Foutmelding direct onder het veld, rood, klein
- Cascading selects: volgende dropdown wordt pas actief na selectie in de vorige

```tsx
<div className="space-y-1">
  <label className="text-sm font-medium">Projectcode</label>
  <Input placeholder="bijv. STAGR" maxLength={10} />
  <p className="text-xs text-muted-foreground">Max. 10 tekens</p>
</div>
```

---

## 10. Feedback — Toast en inline

### Toast (via sonner)
- Succes: groen, kort — "Plaat toegevoegd"
- Fout: rood, iets langer — "Kon plaat niet opslaan: prefix al in gebruik"
- Geen toast voor niet-destructieve navigatie
- Maximaal één toast tegelijk

### Inline
- Laadstatus in de knop zelf
- Lege staten met uitnodiging
- Statusbadges in lijsten
- Geen aparte foutpagina's — fout tonen waar hij optreedt

---

## 11. Tablet-vriendelijkheid

De app wordt ook op tablets gebruikt (laseroperator, werkplaats).

- Minimale klikdoelgrootte: 44×44px voor alle interactieve elementen
- Geen hover-only functionaliteit — acties ook bereikbaar via tik of apart menu
- Lijstrijen `h-14` (56px) — vaste hoogte, comfortabel voor tikken
- Modals maximaal 90% schermhoogte, scrollen intern
- Drag-and-drop nooit de enige manier om iets te doen — altijd een alternatief

---

## 12. Typografie

Systeem-font — geen externe fonts laden. Snel en vertrouwd.

```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Gewichten
- `font-normal` (400) — bodytekst
- `font-medium` (500) — subtiele nadruk, labels
- `font-semibold` (600) — koppen, titels

### Schaal
| Klasse | Grootte | Gebruik |
|--------|---------|---------|
| `text-xs` | 12px | Captions, kleine labels |
| `text-sm` | 14px | Bodytekst, tabelcellen |
| `text-base` | 16px | Standaard body |
| `text-lg` | 18px | Sectietitels |
| `text-xl` | 20px | Kaart-titels |
| `text-2xl` | 24px | Paginatitels |

### Koppen-patronen
```tsx
<h1 className="text-2xl font-semibold text-foreground">Paginatitel</h1>
<h2 className="text-lg font-semibold text-foreground">Sectietitel</h2>
<h3 className="text-base font-semibold text-foreground">Kaart-titel</h3>
<p className="text-sm text-muted-foreground mt-1">Ondertitel</p>
```

---

## 13. Spacing

Gebaseerd op 4px-eenheden — altijd een veelvoud van 4.

```
gap-1 / p-1    4px
gap-2 / p-2    8px
gap-3 / p-3    12px
gap-4 / p-4    16px
gap-6 / p-6    24px   ← standaard card-padding
gap-8 / p-8    32px
```

### Veelgebruikte patronen
```tsx
<div className="space-y-6">   {/* pagina-secties */}
<div className="space-y-4">   {/* items in een sectie */}
<div className="flex gap-2">  {/* knoppen naast elkaar */}
<div className="flex gap-3">  {/* icoon + tekst */}
<Card className="p-6">        {/* standaard card-padding */}
```

---

## 14. Tabel-patroon

Tabellen zijn de primaire weergave voor lijstdata in MES Kersten.

```tsx
<Table>
  <TableHeader className="bg-muted/50 sticky top-0 z-10">
    <TableRow className="hover:bg-transparent">
      <TableHead className="font-semibold text-foreground">Kolom</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="cursor-pointer hover:bg-muted/50 transition-colors h-14">
      <TableCell className="font-medium text-foreground">Data</TableCell>
      <TableCell className="text-muted-foreground">Secundair</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

### Regels
- Rijhoogte: `h-14` (56px) — comfortabel voor tablet én desktop
- Header: sticky, `bg-muted/50` achtergrond
- Hover: subtiel `bg-muted/50`
- Primaire kolom: `font-medium text-foreground`
- Secundaire kolommen: `text-muted-foreground`
- Acties in de laatste kolom, alleen zichtbaar bij hover (zie §3)

---

## 15. Transitions en animaties

Subtiel en snel — nooit afleidend.

```
Duur:     150–200ms
Easing:   ease-in-out (standaard)

transition-colors   — kleurwijzigingen (hover, active)
transition-shadow   — schaduwwijzigingen (card hover)
transition-opacity  — hover-acties in lijsten
```

```tsx
// Kaart hover
<Card className="cursor-pointer hover:shadow-lg transition-shadow duration-150">

// Rij hover
<TableRow className="hover:bg-muted/50 transition-colors duration-150">

// Verborgen actie
<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150">
```

Niet gebruiken: bounce, lange delays, meerdere animaties tegelijk op hetzelfde element.

---

## 16. Toegankelijkheid

### Keyboard-navigatie
- Alle interactieve elementen bereikbaar via Tab
- Zichtbare focus-indicator op alle focusbare elementen
- Logische tab-volgorde (links → rechts, boven → onder)

### ARIA-labels voor icoon-knoppen
```tsx
// Icoon-only knop — altijd aria-label
<Button variant="ghost" size="icon" aria-label="Modal sluiten">
  <X className="h-4 w-4" />
</Button>

// Toggle-knop
<Button
  variant="ghost"
  aria-pressed={detailOpen}
  aria-label="Detail-paneel tonen of verbergen"
>
  <PanelRight className="h-4 w-4" />
</Button>
```

### Kleurcontrast
- Primaire tekst (`text-foreground`) op wit: voldoet aan WCAG AA
- Secundaire tekst (`text-muted-foreground`) op wit: voldoet aan WCAG AA
- Kleur nooit als enige manier om informatie over te brengen — altijd ook tekst of icoon

---

## 17. Do's en Don'ts

### ✅ Wel doen
- Consistente spacing uit de schaal (§13)
- `text-muted-foreground` voor alles wat secundair is
- `font-semibold` voor koppen, `font-medium` voor subtiele nadruk
- Knoppen kort en actiegericht: "Exporteren", "Aanmaken", "Opslaan"
- Icoon naast tekst — nooit icoon alleen (tenzij aria-label aanwezig)
- Royale witruimte tussen secties (`space-y-6`)
- Lege staten met uitnodiging en CTA
- Loading-staat in de knop zelf

### ❌ Niet doen
- Willekeurige spacing buiten de schaal (geen `mt-5`, `p-7`)
- Felle kleuren voor neutrale UI-elementen
- Meerdere visuele effecten stapelen (shadow + border + achtergrondkleur tegelijk)
- Aanraakdoelen kleiner dan 40px hoogte
- Kleur als enige informatiedrager
- Meerdere primaire knoppen op één scherm
- Animaties langer dan 200ms
- `react-hook-form` of `zod` (zie coding-standards)
- Formulieren zonder `DialogDescription` in dialogs

---

## 18. Toekomstige features — onthoud de stijl

**Command menu (Ctrl+K)**
Één zoekbalk waarmee je alles kunt doen: navigeren, acties uitvoeren, snel een record vinden. Toont shortcut-hints per actie. Verschijnt als overlay, verdwijnt bij Escape.

**Keyboard shortcuts**
Shortcuts worden getoond bij hover op knoppen en menu-items — niet permanent zichtbaar. Patroon: `Ctrl I`, `Ctrl K`, `A`, `L` naast de actienaam.

**Dependency-weergave**
Orders die geblokkeerd zijn tonen een duidelijk "Geblokkeerd door: materiaal nog niet binnen" label — niet alleen een rood icoontje, ook tekst wat er blokkeert en wie actie moet ondernemen.
