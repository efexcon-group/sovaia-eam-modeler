"""Seed für Demo-Persona-Overlays (Persona-Switcher, ADR-100).

Read-only Demo-Tenants `demo-*` mit simulierter Branchen-Lizenz — erlauben es,
die Umgebung einem Kunden (z.B. Pflegebranche) so zu zeigen, wie er sie mit
echter Lizenz sähe (License-Filter greift backend-seitig). Die AuthMiddleware
honoriert `X-EAM-Demo-Persona` nur für `demo-`-Tenants (Guardrail).

Idempotent: legt fehlende Demo-Overlays an, überschreibt vorhandene nicht.
"""
from __future__ import annotations

import logging
from pathlib import Path

from app.storage import overlay as overlay_store

log = logging.getLogger(__name__)

# tenant → simulierte License-Groups (siehe license_resolver._GROUP_TO_PATHS).
DEMO_PERSONAS: dict[str, dict] = {
    "demo-heim-pflege": {
        "label": "Demo: Heim & Pflege (CH)",
        "license-groups": ["modeler-foundation", "modeler-business-healthcare"],
    },
}


def ensure_demo_overlays(overlay_dir: str) -> None:
    base = Path(overlay_dir)
    for tenant, cfg in DEMO_PERSONAS.items():
        path = base / f"{tenant}.json"
        if path.exists():
            continue
        ov = overlay_store._empty_overlay(tenant)  # gleiche Struktur wie Laufzeit-Overlays
        ov["license"] = {
            "mode": "strict",
            "license-groups": cfg["license-groups"],
            "demo-label": cfg["label"],
        }
        overlay_store.save_overlay(base, ov)
        log.info("Demo-Persona-Overlay angelegt: %s (%s)", tenant, cfg["label"])
