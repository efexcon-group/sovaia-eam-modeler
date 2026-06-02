"""License-Resolver (ADR-083-aligned).

Liest registry/features.yaml (in den Image gebaked) + den tenant-spezifischen
License-Block aus dem Overlay und resolved zu effektivem
{allowed-paths, allowed-layers, mode}.

Drei mögliche Input-Quellen für die Tenant-Lizenz (in dieser Priorität):
  1. Overlay.license.license-groups (Liste von Group-IDs) — ADR-083-konform
  2. Overlay.license.allowed-paths / allowed-layers (Legacy, C5a) — backward-compat
  3. Default: 'open' (voller Zugriff für sovaia-internal / dev)

License-Group → Taxonomy-Path-Mapping ist hier hart kodiert, kann später
ohne Schema-Bruch in features.yaml gezogen werden (granted-paths-Feld pro
License-Group). Die hier eingebaute Tabelle ist die Single-Source-of-Truth
für den Modeler — license-core kennt nur die Group-IDs, die Auflösung zu
Pfaden ist Modeler-Domäne.
"""
from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

import yaml

log = logging.getLogger(__name__)

# License-Group → granted Modeler-Pfade.
# Wird hier gepflegt, weil license-core nur die Group-IDs kennt + zur
# Wahrung der App-Trennung. Wenn weitere Apps eigene Pfad-Mappings
# brauchen, ziehen wir das in features.yaml als `granted-paths:` per Group.
_GROUP_TO_PATHS: dict[str, list[str]] = {
    # Foundation: leerer Layer/Path-Set — die Sichtbarkeit wird durch andere
    # Groups gesteuert; Foundation ist Vorbedingung.
    "modeler-foundation": [],

    "modeler-business-healthcare": [
        "business/healthcare",
    ],
    "modeler-business-logistik": [
        "business/logistik",
    ],
    "modeler-business-services": [
        "business/services",
    ],
    "modeler-business-energie": [
        "business/energie-umwelt",
    ],
    "modeler-application-stack": [
        "application",
    ],
    "modeler-governance-layer": [
        "governance-compliance-security",
    ],
    # UI-Capability-Groups (Mapping/LLM/Storyteller) haben keine Pfade,
    # die werden im Frontend per Feature-Flag enforced (Phase 3).
    "modeler-mapping-pro": [],
    "modeler-llm-batch": [],
    "modeler-storyteller-authoring": [],
}


@lru_cache(maxsize=4)
def _load_features_yaml(base_str: str) -> dict:
    p = Path(base_str) / "features.yaml"
    if not p.exists():
        return {"license-groups": [], "features": []}
    with p.open() as f:
        return yaml.safe_load(f) or {}


def _valid_group_ids(reference_repo_path: str) -> set[str]:
    """Set aller License-Group-IDs aus features.yaml (zur Validierung)."""
    data = _load_features_yaml(reference_repo_path)
    return {g["id"] for g in (data.get("license-groups") or []) if g.get("id")}


def resolve_license(overlay_license: dict, reference_repo_path: str) -> dict:
    """Resolved den finalen License-Block aus Overlay-Input + Feature-Catalog.

    Returnt:
      {
        "mode": "open" | "strict" | "preview",
        "allowed-layers": [str],
        "allowed-paths": [str],
        "ui-capabilities": [str]     # Modeler-Frontend-Flags (mapping-pro, llm-batch, …)
      }
    """
    if not overlay_license:
        return _open()

    mode = overlay_license.get("mode") or "open"
    if mode == "open":
        return _open()

    license_groups = overlay_license.get("license-groups") or []
    if license_groups:
        # ADR-083-Pfad
        valid = _valid_group_ids(reference_repo_path)
        accepted = [g for g in license_groups if g in valid]
        allowed_paths: set[str] = set()
        ui_capabilities: set[str] = set()
        for g in accepted:
            paths = _GROUP_TO_PATHS.get(g) or []
            for p in paths:
                allowed_paths.add(p)
            # UI-Capabilities (keine Path-Mapping, separate Flags)
            if g in {"modeler-mapping-pro", "modeler-llm-batch", "modeler-storyteller-authoring"}:
                ui_capabilities.add(g)
        # Layer aus Paths ableiten.
        allowed_layers = sorted({p.split("/", 1)[0] for p in allowed_paths})
        return {
            "mode": mode,
            "allowed-layers": allowed_layers,
            "allowed-paths": sorted(allowed_paths),
            "ui-capabilities": sorted(ui_capabilities),
            "source": "license-groups",
        }

    # Backward-Compat C5a: explizite Pfade/Layer im Overlay.
    return {
        "mode": mode,
        "allowed-layers": list(overlay_license.get("allowed-layers") or []),
        "allowed-paths": list(overlay_license.get("allowed-paths") or []),
        "ui-capabilities": [],
        "source": "overlay-paths",
    }


def _open() -> dict:
    return {
        "mode": "open",
        "allowed-layers": [],
        "allowed-paths": [],
        "ui-capabilities": [],
        "source": "open",
    }


def resolve_effective(overlay_license: dict, settings) -> dict:
    """Resolved den License-Block über die konfigurierte Quelle (ADR-090).

    - EAM_LICENSE_SOURCE=overlay (Default): Group-IDs aus dem Overlay (wie bisher).
    - EAM_LICENSE_SOURCE=license-core: effective/{orgId}-Endpoint; BLM-Consumer-
      Semantik (leaseStatus→lease-mode full|demo, resolved→license-groups), fail-soft.

    Tenants ohne `license.org-id` (z.B. sovaia-internal) bleiben auf der Overlay-
    Logik — der Endpoint wird nicht gerufen. Damit ist der Toggle gefahrlos global.
    Das `lease-mode`-Feld ist informativ fürs Frontend; die Sichtbarkeits-Gate
    läuft weiterhin über mode/allowed-paths/allowed-layers.
    """
    overlay_license = overlay_license or {}
    ref_path = settings.reference_repo_path
    source = getattr(settings, "license_source", "overlay")

    if source != "license-core":
        return resolve_license(overlay_license, ref_path)

    org_id = overlay_license.get("org-id")
    if not org_id:
        # Kein Org-Bezug → Overlay-Verhalten (sovaia-internal etc. → open).
        return resolve_license(overlay_license, ref_path)

    # Lazy-Import vermeidet httpx-Import-Kosten wenn Source=overlay.
    from app.services import license_client

    eff = license_client.fetch_effective(settings.license_core_url, org_id)
    if eff is None:
        # Fail-soft (ADR-090): fall-open auf Overlay-Groups.
        log.warning("license-core unerreichbar — Overlay-Fallback für org=%s", org_id)
        out = resolve_license(overlay_license, ref_path)
        out["lease-mode"] = "full"
        out["source"] = "overlay-fallback"
        return out

    lease_status = (eff.get("leaseStatus") or "NONE").upper()

    # Weiche Durchsetzung (ADR-090): Ablauf schaltet NICHT hart ab — Karenz +
    # Verlängerungs-Erinnerung, Instanz bleibt funktional. Nur der explizite
    # Kill-Switch am Lizenzserver (SUSPENDED) oder eine nie lizenzierte Org
    # (NONE) deaktiviert.
    if lease_status in ("ACTIVE", "GRACE", "EXPIRED"):
        groups = eff.get("resolved") or []
        out = resolve_license({"mode": "strict", "license-groups": groups}, ref_path)
        out["lease-mode"] = "full"
        out["lease-status"] = lease_status
        out["renewal-reminder"] = lease_status in ("GRACE", "EXPIRED")
        out["tier"] = eff.get("tier")
        out["valid-until"] = eff.get("validUntil")
        out["source"] = "license-core"
        return out

    # SUSPENDED (Kill-Switch) / NONE → deaktiviert: read-only, leere Sichtbarkeit
    # (mode=strict + leere Listen blockt via is_layer_allowed alles). Frontend
    # zeigt Upgrade-/Kontakt-CTA.
    return {
        "mode": "strict",
        "lease-mode": "demo",
        "lease-status": lease_status,
        "tier": eff.get("tier"),
        "allowed-layers": [],
        "allowed-paths": [],
        "ui-capabilities": [],
        "renewal-reminder": lease_status == "SUSPENDED",
        "source": "license-core",
    }
