"""License-Core-Client — effektive Lizenz pro Org (ADR-090 Option B).

Ruft GET /api/v1/license/effective/{orgId}. Antwort-Form (siehe license-core):
  {orgId, tier, leaseStatus, features[], resolved[], validUntil}
  resolved = transitiv aufgelöste License-Group-IDs.

Fail-soft: gibt None zurück wenn license-core nicht erreichbar ist (Caller fällt
dann auf das Overlay zurück). Kurzer TTL-Cache, damit nicht jeder Navigator-/me-
Request einen HTTP-Hop macht.
"""
from __future__ import annotations

import logging
import time

import httpx

log = logging.getLogger(__name__)

_CACHE_TTL_S = 60.0
_cache: dict[str, tuple[float, dict]] = {}


def fetch_effective(license_core_url: str, org_id: str) -> dict | None:
    """Effektive Lizenz für eine Org. None bei Fehler (fail-soft)."""
    now = time.monotonic()
    hit = _cache.get(org_id)
    if hit and (now - hit[0]) < _CACHE_TTL_S:
        return hit[1]
    try:
        url = license_core_url.rstrip("/") + f"/api/v1/license/effective/{org_id}"
        with httpx.Client(timeout=10.0) as client:
            r = client.get(url)
            r.raise_for_status()
            data = r.json()
        _cache[org_id] = (now, data)
        return data
    except Exception as e:  # noqa: BLE001
        log.warning("license-core effective-fetch fehlgeschlagen (org=%s): %s", org_id, e)
        return None
