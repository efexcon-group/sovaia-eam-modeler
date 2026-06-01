# status-sync-agent

Read-only-Agent der den `operational-status` von Sovaia-Knoten im Modeler
gegen die echten Plattform-Quellen (ArgoCD-Apps + K8s-Deployments)
synchronisiert. Spezifikation: [ADR-088](https://github.com/efexcon-group/sovaia-contracts/blob/main/architecture/adrs/088-status-sync-agent.md).

## Wie funktioniert's

1. Lädt Sovaia-Reference aus `/etc/sovaia-reference` (Image-baked Snapshot)
2. Sammelt aktuellen State aus ArgoCD + K8s
3. Pro Sovaia-Knoten mit `source-binding`-Annotation: resolved neuen Status
4. PATCH /v1/edit/sovaia/{id} im Modeler-API mit dem neuen Status
5. Log-Eintrag pro Mutation

User-Edits werden geschützt: der Resolver schreibt nur wenn die letzte
`_status-synced-by`-Annotation ebenfalls von Agent stammt (TODO: heute noch
nicht implementiert — schreibt immer).

## source-binding am Sovaia-Knoten

In `sovaia-reference.yaml` (oder verticals/business-apps):

```yaml
- id: blm
  type: anwendung
  label-de: BLM
  tags: { ownership: sovaia-baseline }
  source-binding:
    argocd-app: tenant-sovaia-blm           # exakter ArgoCD-Application-Name
    k8s-deployment: sovaia/sovaia-blm        # "namespace/deployment-name"
    prototype-key: null                       # für nicht-Prototypes
```

Reihenfolge im Resolver: ArgoCD > K8s > Prototype.

## Status-Werte

| ArgoCD-Health/Sync | K8s | Resultat |
|---|---|---|
| Healthy + Synced | — | `live` |
| Progressing/Degraded/OutOfSync | — | `released` |
| (nicht in ArgoCD) | Ready | `released` |
| (nicht in ArgoCD) | NotReady | `planned` |
| — | — | unverändert |

## Lokal testen (dry-run)

```bash
cd status-sync-agent
uv sync
SSA_DRY_RUN=true \
SSA_REFERENCE_REPO_PATH=../backend/reference \
SSA_MODELER_API_URL=http://localhost:8003 \
uv run python -m app.sync
```

Mit `--dry-run` werden keine PATCHes ausgeführt — nur Logs.

## Deploy im Cluster

```bash
helm install ssa ./helm -n platform
```

Vorab: ArgoCD-API-Token-Secret anlegen (User-Aktion):

```bash
kubectl create secret generic status-sync-agent-argocd-token \
  --namespace=platform \
  --from-literal=token=$ARGOCD_TOKEN
```

ArgoCD-Token erzeugt via ArgoCD-UI oder CLI mit Read-Only-Scope.

## RBAC

ClusterRole `status-sync-agent-read`:
- `get/list` auf `deployments` (alle Namespaces) — read-only

Nichts mehr. Wenn weitere Quellen (Pods/StatefulSets/CRDs) dazukommen, hier
ergänzen.

## Image-Build

CI in sovaia-eam-modeler (siehe `.github/workflows/build-status-sync-agent.yml`
— folgt) pusht zu `ghcr.io/efexcon-group/status-sync-agent`.
