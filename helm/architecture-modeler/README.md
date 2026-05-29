# architecture-modeler Helm-Chart

Drei Komponenten:

- `architecture-modeler-api` (Backend, Port 8000)
- `architecture-modeler-frontend` (Nginx + React, Port 80)
- `architecture-modeler-llm-bridge` (Bridge zu DGX, Port 8001)

## Values

| File | Verwendung |
|---|---|
| `values.yaml` | Defaults |
| `values-internal.yaml` | Sovaia-internal-Deployment im `platform`-Namespace |
| `values-tenant-template.yaml` | Vorlage pro Lizenz-Tenant (Platzhalter `{{TENANT_SLUG}}`, `{{TENANT_REALM}}`) |

## Voraussetzungen

- `platform-postgresql` mit pgvector + DB `architecture_modeler` + Secret
  `architecture-modeler-postgres` mit Key `dsn`
- ConfigMap `architecture-modeler-reference` mit Inhalt aus
  `sovaia-contracts/registry/architecture-modeler/` (CI-Job)
- `dgx-gateway` im `sovaia`-Namespace erreichbar
- `license-core` im `platform`-Namespace erreichbar (für Tenant-Mode)

## Smoke-Install

```bash
helm install am ./helm/architecture-modeler -f values-internal.yaml
kubectl -n platform port-forward svc/architecture-modeler-api 8000:8000
curl http://localhost:8000/v1/health
```
