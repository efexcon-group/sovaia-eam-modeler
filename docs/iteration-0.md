# Iteration 0 — Architecture-Modeler

> Vertical-Slice. Alle 4 Use Cases dünn end-to-end. Demo-fähig nach ~3-4 Wochen.
> Spec-Anker: [ADR-082](https://github.com/efexcon-group/sovaia-contracts/blob/main/architecture/adrs/082-architecture-modeler-licensable-product.md).

## Ziel

Nach Iteration 0 muss eine Demo möglich sein, die folgende Schleife durchläuft:

1. Tester loggt sich am Modeler ein (identity-kc, Tenant „demo").
2. Sieht Sovaia-Reference-Architektur in C-Level-Granularität (~12 Knoten).
3. Spricht 5-10 Sätze über fiktive Kunde-X-Architektur → bekommt Knoten-Graph.
4. Korrigiert manuell per Drag und Knoten-Edit.
5. Beschreibt verbal das Zielbild → Sovaia-Module werden auf Reference-Canvas farblich markiert.
6. Klickt auf hardcoded Baseline-Story „Service-Provider-Workflow" → Player läuft choreografiert durch.

## Repo-Struktur (evolutionärer Umbau)

```
sovaia-eam-modeler/
├── legacy/                 ← v2-v9 HTML-Prototypes (umbenannt, read-only Referenz)
├── frontend/               ← React + Vite + React Flow (neu)
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── canvas/         ← React-Flow-Wrapper + Custom-Nodes
│       ├── chat-sidekick/  ← Deep-Chat-Integration
│       ├── story-player/   ← Story-Beat-Player (Read-only Iteration 0)
│       ├── api-client/     ← OpenAPI-generierter Client
│       └── auth/           ← OIDC-Glue (identity-kc + KC intern)
├── backend/                ← FastAPI + SQLAlchemy + pgvector (neu)
│   ├── pyproject.toml
│   ├── alembic/            ← DB-Migrationen
│   └── app/
│       ├── main.py
│       ├── routers/
│       │   ├── models.py
│       │   ├── nodes.py
│       │   ├── edges.py
│       │   ├── stories.py
│       │   ├── intake.py   ← Use Case 2: LLM-Intake
│       │   ├── gap.py      ← Use Case 3: SOLL-Analyse
│       │   └── reference.py
│       ├── deps/
│       │   ├── db.py
│       │   ├── auth.py
│       │   ├── license.py  ← license-core-Stub
│       │   └── llm.py      ← eam-llm-bridge-Client
│       └── models/         ← SQLAlchemy-Modelle
├── eam-llm-bridge/         ← Eigenständiger Bridge-Service (FastAPI)
│   └── app/
│       ├── main.py
│       ├── tools.py        ← Tool-Use-Definitionen
│       └── prompts/        ← System-Prompts
└── helm/
    └── architecture-modeler/
        ├── Chart.yaml
        ├── values.yaml
        ├── values-internal.yaml
        ├── values-tenant-template.yaml
        └── templates/
```

## DB-Schema (Iteration 0)

PostgreSQL-Datenbank: `architecture_modeler` (in `platform-postgresql`). Erweiterung `pgvector` aktiv.

```sql
-- ── Tenancy ────────────────────────────────────────────────────────────
CREATE TABLE eam_tenants (
  id           uuid PRIMARY KEY,
  slug         text NOT NULL UNIQUE,         -- "demo", "kunde-x"
  brand        text NOT NULL DEFAULT 'sovaia',
  license_tier text NOT NULL DEFAULT 'free', -- free | pro | enterprise
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Modelle (IST + Reference-Snapshots) ────────────────────────────────
CREATE TABLE eam_models (
  id             uuid PRIMARY KEY,
  tenant_id      uuid NOT NULL REFERENCES eam_tenants(id),
  kind           text NOT NULL,              -- ist | reference-snapshot | soll
  name           text NOT NULL,
  source         text NOT NULL,              -- llm-intake | manual | registry-load
  reference_version text,                    -- bei reference-snapshot: aus registry/.../sovaia-reference.yaml
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX eam_models_tenant_idx ON eam_models(tenant_id, kind);

-- ── Knoten ─────────────────────────────────────────────────────────────
CREATE TABLE eam_nodes (
  id            uuid PRIMARY KEY,
  model_id      uuid NOT NULL REFERENCES eam_models(id) ON DELETE CASCADE,
  node_type     text NOT NULL,               -- siehe schema.yaml node-types
  label_de      text NOT NULL,
  label_en      text,
  summary_de    text,
  tags          jsonb NOT NULL DEFAULT '{}', -- status, layer, perspective, industry, ...
  position      jsonb,                        -- {x, y} — vom User locked, sonst auto
  position_locked boolean NOT NULL DEFAULT false,
  source_utterance text,                      -- Quelle bei LLM-Intake (gegen Halluzination)
  source_utterance_embedding vector(384),     -- pgvector: Suche/Alias-Match
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX eam_nodes_model_idx ON eam_nodes(model_id);

-- ── Edges ──────────────────────────────────────────────────────────────
CREATE TABLE eam_edges (
  id            uuid PRIMARY KEY,
  model_id      uuid NOT NULL REFERENCES eam_models(id) ON DELETE CASCADE,
  from_node_id  uuid NOT NULL REFERENCES eam_nodes(id) ON DELETE CASCADE,
  to_node_id    uuid NOT NULL REFERENCES eam_nodes(id) ON DELETE CASCADE,
  edge_type     text NOT NULL,                -- nutzt | liefert | fliesst-zu | ...
  label         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX eam_edges_model_idx ON eam_edges(model_id);

-- ── Stories (Iteration 0: nur Container — Daten aus YAML-Baseline) ─────
CREATE TABLE eam_stories (
  id            uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES eam_tenants(id),
  source        text NOT NULL,                -- registry-baseline | tenant-custom | tenant-derived
  source_ref    text,                          -- bei baseline: Pfad in registry/.../stories/
  title         text NOT NULL,
  industry_tag  text,
  persona_target text,
  status        text NOT NULL DEFAULT 'planned',
  maturity_claim text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE eam_story_beats (
  id            uuid PRIMARY KEY,
  story_id      uuid NOT NULL REFERENCES eam_stories(id) ON DELETE CASCADE,
  ordinal       int NOT NULL,
  narrative_md  text NOT NULL,
  anchors       jsonb NOT NULL DEFAULT '[]',  -- list of node_ids
  camera        jsonb,                          -- {view-profile, zoom, pan}
  overlay       text,
  prototype_embed jsonb,
  cta           jsonb
);

-- ── Vokabular-Aliase (Session+Tenant-scoped) ───────────────────────────
CREATE TABLE eam_aliases (
  id            uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES eam_tenants(id),
  session_id    text NOT NULL,
  alias         text NOT NULL,                -- "das CRM", "der Hub"
  node_id       uuid REFERENCES eam_nodes(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX eam_aliases_lookup_idx ON eam_aliases(tenant_id, session_id, alias);

-- ── Audit-Log für LLM-Calls (OQ-1) ─────────────────────────────────────
CREATE TABLE eam_audit_log (
  id            uuid PRIMARY KEY,
  tenant_id     uuid NOT NULL REFERENCES eam_tenants(id),
  user_subject  text NOT NULL,                -- aus identity-kc JWT
  operation     text NOT NULL,                -- intake.extract | gap.analyze | reference.load
  payload_hash  text NOT NULL,                -- SHA-256 des Prompts (PII-safe)
  tokens_in     int,
  tokens_out    int,
  model         text,
  duration_ms   int,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX eam_audit_tenant_idx ON eam_audit_log(tenant_id, created_at DESC);

-- ── License-Cache (kurze TTL für license-core-Antworten) ───────────────
CREATE TABLE eam_license_cache (
  tenant_id     uuid PRIMARY KEY REFERENCES eam_tenants(id),
  tier          text NOT NULL,
  feature_flags jsonb NOT NULL,
  expires_at    timestamptz NOT NULL
);
```

Row-Level-Security: alle Tabellen mit `tenant_id` bekommen RLS-Policy `tenant_id = current_setting('app.tenant_id')::uuid`. FastAPI setzt es pro Request aus JWT.

## FastAPI-Endpoints (Iteration 0)

Alle hinter OIDC-Auth (identity-kc primary, KC intern für Sovaia-internen NS):

```
GET  /v1/health
GET  /v1/me                              → User-Info + Tenant + License-Tier

# ── Reference (Use Case 1) ─────────────────────────────────────────────
GET  /v1/reference/schema                → schema.yaml (Meta-Modell)
GET  /v1/reference/sovaia                → sovaia-reference.yaml geparst als JSON
POST /v1/reference/sync                  → (Admin) Reload aus sovaia-contracts-Git

# ── Models ──────────────────────────────────────────────────────────────
GET  /v1/models                          → Liste Tenant-Modelle
POST /v1/models                          → Neues leeres Modell
GET  /v1/models/{id}                     → Graph mit Nodes + Edges
PATCH /v1/models/{id}                    → Name, Kind etc.
DELETE /v1/models/{id}

# ── Nodes + Edges ───────────────────────────────────────────────────────
POST /v1/models/{id}/nodes
PATCH /v1/nodes/{id}                     → label, position (auto position_locked = true bei manueller Drag)
DELETE /v1/nodes/{id}
POST /v1/models/{id}/edges
PATCH /v1/edges/{id}
DELETE /v1/edges/{id}

# ── Intake (Use Case 2) ─────────────────────────────────────────────────
POST /v1/models/{id}/intake/extract
     body: { utterance: "..." , session_id: "..." }
     → ruft eam-llm-bridge an, applied Tool-Calls,
       persistiert Nodes/Edges/Aliases, returnt Diff

# ── Gap (Use Case 3) ────────────────────────────────────────────────────
POST /v1/models/{id}/gap/analyze
     body: { target_description: "..." }
     → ruft eam-llm-bridge an (Gap-Mode),
       returnt: { picked-sovaia-nodes: [...], rationale: "..." }
     Iteration 0: nur Markierung, kein Split-Screen

# ── Stories (Use Case 4 — Player only) ──────────────────────────────────
GET  /v1/stories                         → Tenant-eigene + Sovaia-Baseline
GET  /v1/stories/{id}                    → Story mit Beats

# ── Audit (Admin) ───────────────────────────────────────────────────────
GET  /v1/audit?from=&to=                 → Tenant-Audit-Log
```

## Tool-Use-Schema für eam-llm-bridge

LLM bekommt diese Tools als JSON-Schema (DGX-Stack via dgx-gateway):

```yaml
tools:

  - name: add_component
    description: "Fügt einen Architektur-Knoten zum aktuellen Modell hinzu."
    parameters:
      type:
        enum: [anwendung, service, ki-agent, datenraum, dokument, prozess,
               nutzer-rolle, mandant, schnittstelle, touchpoint, faehigkeit,
               ai-use-case, compliance-anker, sicherheits-zone, datenfluss]
        required: true
      label_de: { type: string, required: true }
      summary_de: { type: string }
      tags: { type: object }
      source_utterance: { type: string, required: true }   # Pflicht gegen Halluzination

  - name: add_dependency
    description: "Fügt eine typisierte Beziehung zwischen zwei Knoten."
    parameters:
      from_label: { type: string, required: true }
      to_label: { type: string, required: true }
      edge_type:
        enum: [nutzt, liefert, fliesst-zu, gehoert-zu, integriert-mit, erfuellt]
        required: true

  - name: tag_node
    description: "Setzt einen Tag auf einen existierenden Knoten."
    parameters:
      label: { type: string, required: true }
      tag_key:
        enum: [status, layer, perspective, industry, business-capability]
        required: true
      tag_value: { type: string, required: true }

  - name: register_alias
    description: "Verbindet ein Customer-Synonym mit einem existierenden Knoten."
    parameters:
      alias: { type: string, required: true }
      target_label: { type: string, required: true }

  - name: request_clarification
    description: "Fragt nach, wenn die Beschreibung mehrdeutig ist."
    parameters:
      question: { type: string, required: true }

  # Use Case 3 (Gap-Mode):
  - name: pick_sovaia_node
    description: "Schlägt einen Sovaia-Reference-Knoten als Lösung für das Customer-Zielbild vor."
    parameters:
      reference_node_id: { type: string, required: true }
      rationale_de: { type: string, required: true }
      replaces_customer_node: { type: string }   # Optional: Customer-IST-Knoten, der ersetzt wird
```

Iteration-0-Loop: **kein** Multi-Turn — User-Utterance → LLM → Tool-Calls → persistiert. Klärungs-Loops kommen Iteration 1.

## Helm + ArgoCD

`helm/architecture-modeler/values-internal.yaml` (Sovaia-internal):
- Namespace `platform`
- Ingress: `architektur-modeler.int.efexcon.com`
- Auth: KC-intern `efexcon-group`-Realm
- DB-Schema: `architecture_modeler`
- License-Check: deaktiviert (interner Tier = unlimited)

`helm/architecture-modeler/values-tenant-template.yaml` (Lizenz-Tenants):
- Namespace `eam-modeler-{tenant}`
- Ingress: `{tenant}.architektur.sovaia.ch`
- Auth: identity-kc `{tenant}-realm`
- DB-Schema: `architecture_modeler` (geteilt, RLS isoliert)
- License-Check: aktiv via license-core

ArgoCD-App `platform-architecture-modeler` (internal) folgt Sync-Wave 2.

## Public-Player (Free-Tier)

Separater statischer Build des Frontend ohne Auth-Glue:
- `frontend/` hat einen Build-Modus `--mode=public-player`
- Lädt `sovaia-reference.yaml` + `stories/*.yaml` direkt aus dem Build
- Deployed unter `architektur.sovaia.ch`
- Embed-Iframe-Endpoint `/__embed/story/{id}` für Plattform-Navigator

## identity-kc-Anforderungen

Neuer Realm-Setup pro Lizenz-Tenant (analog ADR-081):
- Client `architecture-modeler-frontend` (public, PKCE)
- Client `architecture-modeler-api` (confidential, service-account für License-Check)
- Rollen: `eam:viewer`, `eam:editor`, `eam:admin`
- Mapping zu License-Tier passiert backend-seitig (RLS-Setting + Feature-Flag-Check)

## Test-Strategie (Iteration 0)

Minimal aber demo-stabil:
- **Backend**: pytest, RLS-Isolation-Tests (kritisch), Tool-Call-Mock-Tests, /intake/extract Smoke-Test gegen DGX
- **Frontend**: Playwright-Happy-Path (Login → Modell laden → Knoten draggen → Story-Player abspielen)
- **End-to-End**: ein Demo-Run-Script `make demo` führt die 6-Schritt-Schleife aus

## Was Iteration 0 explizit NICHT enthält

- Split-Screen-Vergleich (Iteration 1)
- Klärungs-Loops bei LLM-Intake (Iteration 1)
- Story-Authoring-UI (Iteration 2)
- Architect- und Functional-View-Profile (Iteration 1)
- Voll-ArchiMate-Schema (Iteration 5+)
- Collaborative Editing (Iteration ≥4)
- Roadmap-Overlay (Iteration 2)
- Export (PDF, ArchiMate-XML) (Iteration 2)
- efx-erp-Deal-Anbindung (Iteration ≥3)

## Definition-of-Done für Iteration 0

- [ ] Backend deploys grün in `platform`-NS
- [ ] Frontend deploys grün, OIDC-Login funktioniert gegen KC-intern
- [ ] DB-Schema gemigrated, RLS-Policy aktiv und durch Test bestätigt
- [ ] Sovaia-Reference lädt aus Registry und zeigt ~12 Knoten C-Level
- [ ] LLM-Intake (eam-llm-bridge + dgx-gateway + DGX) liefert Tool-Calls
- [ ] Mind. 1 hardcoded Baseline-Story spielt im Player
- [ ] Audit-Log schreibt für jeden LLM-Call
- [ ] `make demo` läuft die 6-Schritt-Schleife durch
- [ ] ADR-082 von „Proposed" auf „Accepted" hochgesetzt
