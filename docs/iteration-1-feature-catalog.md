# Iteration 1 — Feature-Catalog-Visualisierung

> Konzept-Stub, gezogen aus ADR-082 + ADR-083 + ADR-084.
> User-Entscheidung 2026-06-01: EAM-Modeler erweitern um Feature-Catalog-Node-Type.

## Ziel

Die Architektur-Registry (`sovaia-contracts/registry/`) wird visuell konsumierbar:

- **features.yaml** (ADR-083, 22 Features, 8 License-Groups, 4 Default-Fachrollen) als interaktiver Graph
- **capabilities.yaml** operations-Block (ADR-084) als verlinkte Knoten unter Features
- License-Group ↔ Feature ↔ Modul ↔ Operation ↔ Hook-Point als navigierbare Beziehungen
- Status-Filter (planned/beta/stable/deprecated) + License-Filter (welche Features sind in Lizenz X enthalten)

Konkreter Demo-Pfad nach Iteration 1:
1. Tester loggt sich am Modeler ein
2. Wählt "Feature-Catalog-Sicht" statt der Sovaia-Reference-Architektur
3. Filtert nach License-Group `sales-pro`
4. Sieht Subgraph mit allen Features die diese Lizenz öffnet + ihre Dependencies + ihre Operations
5. Klick auf Feature → Detail-Panel mit Modi, Modes, Default-Profiles, Status, ADR-Link

## Meta-Modell-Erweiterung

`sovaia-contracts/registry/architecture-modeler/schema.yaml` bekommt 4 neue Node-Types:

```yaml
node-types:
  # … bestehende (anwendung, service, ki-agent, datenraum, dokument, prozess, nutzer-rolle, mandant, schnittstelle)

  - id: feature
    label-de: Feature
    label-en: Feature
    description-de: Granulare Funktion, die per Feature-Catalog (ADR-083) konfiguriert ist.
    icon: layers
    archimate-projection: ApplicationFunction
    examples: [quote-create, quote-review-foureye, final-pdf-merge, intent-parser-quote]

  - id: license-group
    label-de: License-Gruppe
    label-en: License Group
    description-de: Bündelung von Features für Lizenz-Zuweisung (ADR-083).
    icon: tag
    archimate-projection: BusinessObject
    archimate-stereotype: LicenseGroup
    examples: [core-foundation, sales-basic, sales-pro, ai-workflows]

  - id: operation
    label-de: Operation
    label-en: Operation
    description-de: Ausführbarer Baustein mit NL-Description, Slots, Hook-Points (ADR-084).
    icon: zap
    archimate-projection: ApplicationFunction
    archimate-stereotype: Operation
    examples: [createQuote, requestQuoteReview, composeFinalPdf, resolveEntity]

  - id: hook-point
    label-de: Hook-Point
    label-en: Hook Point
    description-de: Extensibility-Surface an einer Operation (ADR-084).
    icon: plug
    archimate-projection: ApplicationInterface
    examples: [pre-create, on-validate, on-compose, post-send]
```

Edge-Types ergänzen:
- `provides`: license-group → feature
- `depends-on`: feature → feature
- `implements`: operation → feature
- `exposes`: operation → hook-point
- `assigned-to`: feature → nutzer-rolle (default-profiles)

## Backend-Erweiterung

`backend/app/routers/`:
- **`reference.py`** liest zusätzlich `features.yaml` + `capabilities.yaml#operations` und projiziert in Graph-JSON
- **`features.py`** (neu) — Filter-Endpoints:
  - `GET /features?licenseGroup={id}&status={planned|beta|stable|deprecated}&mode={BASIC|USER|EXPERT|ADMIN}`
  - `GET /features/{id}` — Detail mit Dependencies, Operations, Hook-Points, ADR-Link
  - `GET /license-groups` — List + Membership

Pgvector-Embedding (für Semantic-Search): jeder Feature/Operation bekommt einen Embedding-Vector aus NL-Description — ermöglicht später "finde Feature das X tut"-Queries vom Intent-Parser-Stub.

## Frontend-Erweiterung

`frontend/src/`:
- **`feature-catalog-view/`** (neu) — alternative Canvas-View neben Sovaia-Reference
- **`filters/`** — License-Group + Status + Mode-Selektor
- **`detail-panel/`** — Feature/Operation-Drill-Down mit ADR-Links
- **`legend/`** — Color-Coding nach Status (planned=grau, beta=gelb, stable=grün, deprecated=rot)

React-Flow-Custom-Nodes erweitern um die 4 neuen Typen + spezifische Visualisierung.

## Lizenz-Bezug

EAM-Modeler-Lizenz-Stufen (ADR-082 Anhang A):

| Stufe | Sees Feature-Catalog |
|---|---|
| Free | Nur die License-Groups der **eigenen** Lizenz (read-only) |
| Pro | Alle License-Groups + Filter + ADR-Links |
| Enterprise | Edit-Mode: License-Group-Mitgliedschaft anpassen (Tenant-spezifische Customs) — Foundation für Tenant-Custom-Profile aus ADR-083 |

## Akzeptanz nach Iteration 1

- [ ] Meta-Modell-Schema um 4 Node-Types erweitert
- [ ] Backend lädt features.yaml + capabilities.yaml und liefert Graph-JSON
- [ ] Frontend rendert Feature-Catalog-View mit Filter-Bar
- [ ] Klick auf Feature öffnet Detail-Panel mit ADR-Link
- [ ] Pgvector-Embedding pro Feature/Operation aus NL-Description
- [ ] Demo-Pfad funktional (Login → License-Filter → Subgraph → Detail)

## Out-of-Scope für Iteration 1

- Effective-Visibility-Resolver-Simulation (User-Custom-Override-Vorschau) — kommt Iteration 2
- License-Group-Edit-Mode für Enterprise-Tier — kommt Iteration 2
- Workflow-Templates-Visualisierung (ADR-085) — kommt Iteration 2 oder 3
- Intent-Parser-Semantic-Search-UI — kommt Iteration 3+ wenn der Parser-Service steht

## Abhängigkeiten

- ADR-082 Iteration 0 muss demo-fähig laufen
- `sovaia-contracts/registry/features.yaml` und `capabilities.yaml#operations` als Source (jetzt da, commit 285ff1f)
- Reference-Sync-Pattern aus Iteration 0 wird wiederverwendet

## Geschätzter Aufwand

~2-3 Wochen für 1 FullStack-Entwickler nach Iteration-0-Demo. Backend ~1 Woche (Schema + Loader + Filter-Endpoints + Embedding), Frontend ~1.5 Wochen (View + Filter + Detail-Panel + Custom-Nodes), Test+Polish ~0.5 Wochen.
