"""Sync-Run — orchestriert Reference-Read + Source-Collect + Resolve + Patch.

CLI: `python -m app.sync` — einmaliger Run, exit-code 0 wenn alle Patches
durchgingen, 1 sonst.

CronJob ruft das exakt so.
"""
from __future__ import annotations

import logging
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx
import yaml

from .config import get_settings
from .resolver import resolve_status
from .sources import collect_state

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("status-sync")


def _load_yaml(p: Path) -> dict:
    if not p.exists():
        return {}
    with p.open() as f:
        return yaml.safe_load(f) or {}


def _all_sovaia_nodes_with_binding(base: Path) -> list[dict]:
    """Findet alle Sovaia-Knoten die ein 'source-binding'-Feld haben.
    Scannt die üblichen YAML-Files."""
    files = [
        base / "sovaia-reference.yaml",
        base / "core-ai-stack.yaml",
    ]
    for sub in ["verticals", "business-apps"]:
        d = base / sub
        if d.exists():
            files.extend(sorted(d.glob("*.yaml")))

    out: list[dict] = []
    for f in files:
        data = _load_yaml(f)
        for n in data.get("nodes") or []:
            if n.get("source-binding"):
                out.append(n)
    return out


def _fetch_effective_status(api_url: str, tenant: str) -> dict | None:
    """Effektiver Status (Baseline+Overlay) pro Knoten vom Modeler.

    Returnt None bei Fehler → Caller fällt auf die Baseline-Datei zurück
    (z.B. älterer Modeler ohne /sovaia-status-Endpoint).
    """
    try:
        url = api_url.rstrip("/") + "/v1/navigator/sovaia-status"
        with httpx.Client(timeout=30.0) as client:
            r = client.get(url, headers={"X-EAM-Tenant": tenant})
            r.raise_for_status()
            return r.json()
    except Exception as e:  # noqa: BLE001
        log.warning("Effektiv-Status-Fetch fehlgeschlagen (%s) — vergleiche gegen Baseline", e)
        return None


def _patch_modeler(api_url: str, tenant: str, node_id: str, status: str, source: str, dry: bool) -> bool:
    patch_body = {
        "tags": {
            "status": status,
            "_status-synced-at": datetime.now(timezone.utc).isoformat(),
            "_status-synced-by": "status-sync-agent",
            "_status-source": source,
        },
    }
    if dry:
        log.info("[DRY] PATCH %s/v1/edit/sovaia/%s tenant=%s → %s (%s)",
                 api_url, node_id, tenant, status, source)
        return True
    try:
        url = api_url.rstrip("/") + f"/v1/edit/sovaia/{node_id}"
        headers = {"X-EAM-Tenant": tenant, "Content-Type": "application/json"}
        with httpx.Client(timeout=30.0) as client:
            r = client.patch(url, json=patch_body, headers=headers)
            r.raise_for_status()
        log.info("Synced node=%s → status=%s (source=%s)", node_id, status, source)
        return True
    except Exception as e:  # noqa: BLE001
        log.error("PATCH fehlgeschlagen für node=%s: %s", node_id, e)
        return False


def run() -> int:
    settings = get_settings()
    log.info("status-sync-agent starting — tenant=%s dry=%s",
             settings.modeler_tenant, settings.dry_run)

    base = Path(settings.reference_repo_path)
    nodes = _all_sovaia_nodes_with_binding(base)
    log.info("Reference: %d Sovaia-Knoten mit source-binding gefunden", len(nodes))

    state = collect_state(settings)
    # Effektiver Ist-Status (Baseline+Overlay) — damit wir nur bei echtem
    # Wechsel patchen und nicht jede Runde gegen die statische Baseline.
    effective = _fetch_effective_status(settings.modeler_api_url, settings.modeler_tenant)

    ok = 0
    fail = 0
    skipped = 0
    for node in nodes:
        node_id = node.get("id")
        binding = node.get("source-binding") or {}
        if not node_id:
            continue
        new_status, reason = resolve_status(binding, state)
        if new_status is None:
            log.debug("Skip %s — %s", node_id, reason)
            skipped += 1
            continue
        # Ist-Status: effektiv (Overlay) wenn verfügbar, sonst Baseline-Fallback.
        if effective is not None:
            current = effective.get(node_id)
        else:
            current = (node.get("tags") or {}).get("status")
        if current == new_status:
            log.debug("Skip %s — already %s", node_id, current)
            skipped += 1
            continue
        if _patch_modeler(
            settings.modeler_api_url, settings.modeler_tenant,
            node_id, new_status, reason, settings.dry_run,
        ):
            ok += 1
        else:
            fail += 1

    log.info("Sync-Run done — patched=%d failed=%d skipped=%d", ok, fail, skipped)
    return 0 if fail == 0 else 1


def main() -> int:
    return run()


if __name__ == "__main__":
    sys.exit(main())
