# Taxonomy editieren — heutiger Workflow + Roadmap

## Was ist Taxonomy?

Die 7 Schichten + die Bäume darunter (`taxonomy/schichten.yaml`,
`taxonomy/business-tree.yaml`, etc.). Sie definieren die **Navigation**
im Modeler — was Stakeholder sehen, was sie drillen können.

## Heute (V1) — Edit per PR

Taxonomy-YAMLs werden ins Backend-Image gebaked (CI). Edits laufen über Git:

```bash
# 1. Im sovaia-contracts klonen + editieren
cd ~/sovaia-contracts
$EDITOR registry/architecture-modeler/taxonomy/business-tree.yaml
git commit -am "feat(taxonomy): branche logistik um 'mobilität' erweitert"
git push

# 2. In sovaia-eam-modeler synchronisieren (das ist das, was ins Image kommt)
cd ~/sovaia-eam-modeler
make sync-reference
git add backend/reference/
git commit -m "sync reference"
git push

# 3. CI baut backend-Image automatisch
gh run watch -R efexcon-group/sovaia-eam-modeler

# 4. ArgoCD-Image-Updater bumpt Pod automatisch (oder manuell):
kubectl -n platform rollout restart deploy/architecture-modeler-api
```

Vorteile heute:
- **Auditierbar**: jeder Taxonomy-Change ist ein Commit, ein Reviewer kann es checken
- **Atomar rollback-fähig**: Image-Tag-Pin zurück + Pod-Restart
- **Konsistent**: alle Tenants sehen die gleiche Taxonomy

Nachteile:
- **Nicht selbst-bedienbar**: User muss Git + CI verstehen
- **Reaktionszeit**: ~3-5 min Image-Build, dann Pod-Restart
- **Tenant-spezifische Anpassung** (Customer X braucht eigene Sparte „Reha")
  geht nur über License-Filter (Sub-Set), nicht über eigene Sub-Knoten

## Pro-Tipps für die heutige Pflege

### Neuen Knoten hinzufügen

In der entsprechenden `*-tree.yaml`:

```yaml
# Beispiel: Heim & Pflege bekommt einen Sub-Bereich "Tagespflege"
- id: heim-pflege
  label-de: Heim & Pflege
  children:
    # … bestehende Children …
    - id: tagespflege
      label-de: Tagespflege
      summary-de: Tagesstrukturierende Betreuung externer Klienten.
      children:
        - { id: tagespflege-aktivierung, label-de: Aktivierung & Therapie }
        - { id: tagespflege-mahlzeiten, label-de: Mahlzeiten-Service }
```

### Knoten deaktivieren

Heute: Knoten aus YAML entfernen (Soft-Delete-Flag gibt es noch nicht).
Alternativ kann License-Filter pro Tenant ihn ausblenden, OHNE den Knoten
zu entfernen:

```bash
# Tenant 'spitex-x' sieht 'tagespflege' nicht
curl -X PUT https://architektur-modeler.int.efexcon.com/v1/edit/license \
  -H 'X-EAM-Tenant: spitex-x' \
  -d '{
    "mode": "strict",
    "license-groups": ["modeler-foundation", "modeler-business-healthcare"]
  }'
# … und im features.yaml license-group 'modeler-business-healthcare'
# umschreiben dass tagespflege NICHT enthalten ist.
```

### Label/Description ändern

Edit direkt im YAML — gleicher PR-Flow.

## Roadmap (V2) — Overlay-basierte Taxonomy

Geplant (eigenes ADR-089 noch zu schreiben):

- Tenant-Overlay erweitert um `taxonomy: { added: [...], hidden: [...], renamed: {...} }`
- UI im Modeler: ⚙ Taxonomy-Editor unter Settings
- Add/Rename/Hide pro Tenant ohne Image-Rebuild
- Baseline-Taxonomy bleibt Single-Source-of-Truth, Overlay ist additiv

Trade-off-Diskussion vor Implementation:
- Was wenn Baseline einen Knoten umbenennt aber Tenant hat ihn schon
  überschrieben? (Konflikt-Resolution)
- Mappings die auf einen Tenant-eigenen Knoten zeigen — wandern sie mit
  oder müssen sie pro Tenant gepflegt werden?
- Performance: Overlay-Resolution bei jedem Navigator-Call

## Vergleich heutiger vs künftiger Workflow

| Aspekt | Heute (V1) | Künftig (V2) |
|---|---|---|
| Add Knoten | PR + Image-Build | UI-Klick, Sekunden |
| Hide Knoten | License-Filter (Bundle-Definition) | UI-Toggle pro Tenant |
| Cross-Tenant-Sicht | Identisch (Baseline) | Pro-Tenant abweichbar |
| Audit | Git-History | Overlay-Audit-Log nötig |
| Rollback | git revert + Re-Build | Overlay-revert |
| Customer-Self-Service | Nein | Ja (mit Admin-Mode) |

Für die meisten Anwendungsfälle reicht heute V1 — Customer-Tenant-spezifische
Branchen-Aufsätze sind eher selten. V2 zieht in Iteration 2 mit Postgres
+ Audit-Log.
