"""JSON-Overlay-Store für Tenant-Edits über die YAML-Baseline.

Datei pro Tenant unter `EAM_OVERLAY_DIR/{tenant}.json`. Struktur:

{
  "version": "0.2.0",
  "tenant": "sovaia-internal",
  "classic": {
    "overrides": { "<node-id>": { partial-node-fields } },
    "added": [ full-node-objects ],
    "deleted": [ "<node-id>" ]
  },
  "sovaia": {
    "overrides": { "<node-id>": { partial-node-fields } }
  },
  "mappings": [
    { "id", "classic-node-id"?, "sovaia-node-ids": [...], "narrative-de",
      "vorher": {...}, "nachher": {...}, "confidence", "created-at", ... }
  ]
}

Sovaia-Baseline (aus Image gebaked) bleibt unverändert; Tenant-Edits
landen als Overrides. Mappings sind tenant-spezifisch.
"""
from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path

OVERLAY_VERSION = "0.2.0"
_SAFE_TENANT = re.compile(r"^[a-z0-9][a-z0-9\-]{0,63}$")


def _empty_overlay(tenant: str) -> dict:
    return {
        "version": OVERLAY_VERSION,
        "tenant": tenant,
        "classic": {"overrides": {}, "added": [], "deleted": []},
        "sovaia": {"overrides": {}},
        "mappings": [],
    }


def _validate_tenant(tenant: str) -> str:
    t = (tenant or "").strip().lower()
    if not _SAFE_TENANT.match(t):
        raise ValueError(f"invalid tenant id: {tenant!r}")
    return t


def _path_for(overlay_dir: Path, tenant: str) -> Path:
    overlay_dir.mkdir(parents=True, exist_ok=True)
    return overlay_dir / f"{_validate_tenant(tenant)}.json"


def load_overlay(overlay_dir: Path, tenant: str) -> dict:
    p = _path_for(overlay_dir, tenant)
    if not p.exists():
        return _empty_overlay(tenant)
    try:
        data = json.loads(p.read_text())
    except json.JSONDecodeError:
        return _empty_overlay(tenant)
    # Forward-kompatible Schema-Migration: neue Sektionen lazy hinzufügen.
    data.setdefault("version", OVERLAY_VERSION)
    data.setdefault("tenant", tenant)
    classic = data.setdefault("classic", {})
    classic.setdefault("overrides", {})
    classic.setdefault("added", [])
    classic.setdefault("deleted", [])
    sovaia = data.setdefault("sovaia", {})
    sovaia.setdefault("overrides", {})
    data.setdefault("mappings", [])
    return data


def save_overlay(overlay_dir: Path, overlay: dict) -> None:
    tenant = overlay.get("tenant") or "sovaia-internal"
    p = _path_for(overlay_dir, tenant)
    p.write_text(json.dumps(overlay, indent=2, ensure_ascii=False))


# ── Anwenden ────────────────────────────────────────────────────────────

def apply_overlay_to_classic(classic_baseline: list[dict], overlay: dict) -> list[dict]:
    section = overlay.get("classic", {})
    deleted = set(section.get("deleted") or [])
    overrides: dict[str, dict] = section.get("overrides") or {}
    added = section.get("added") or []

    result: list[dict] = []
    for n in classic_baseline:
        nid = n.get("id")
        if nid in deleted:
            continue
        if nid and nid in overrides:
            result.append(_deep_merge(n, overrides[nid]))
        else:
            result.append(n)
    result.extend(added)
    return result


def apply_overlay_to_sovaia(sovaia_baseline: list[dict], overlay: dict) -> list[dict]:
    overrides: dict[str, dict] = (overlay.get("sovaia") or {}).get("overrides") or {}
    if not overrides:
        return sovaia_baseline
    result: list[dict] = []
    for n in sovaia_baseline:
        nid = n.get("id")
        if nid and nid in overrides:
            result.append(_deep_merge(n, overrides[nid]))
        else:
            result.append(n)
    return result


def _deep_merge(base: dict, override: dict) -> dict:
    out = deepcopy(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = deepcopy(v)
    return out


# ── Classic-Mutationen ──────────────────────────────────────────────────

def is_baseline_id(node_id: str) -> bool:
    return node_id.startswith("cls-")


def patch_classic(overlay: dict, node_id: str, patch: dict) -> None:
    classic = overlay["classic"]
    if is_baseline_id(node_id):
        existing = classic["overrides"].get(node_id) or {}
        classic["overrides"][node_id] = _deep_merge(existing, patch)
        classic["deleted"] = [d for d in classic["deleted"] if d != node_id]
    else:
        for i, n in enumerate(classic["added"]):
            if n.get("id") == node_id:
                classic["added"][i] = _deep_merge(n, patch)
                return
        raise KeyError(node_id)


def add_classic(overlay: dict, node: dict) -> dict:
    classic = overlay["classic"]
    if not node.get("id"):
        raise ValueError("node.id required")
    tags = node.setdefault("tags", {})
    tags.setdefault("ownership", "classic")
    tags.setdefault("seeded-by", "user-edit")
    classic["added"].append(node)
    return node


def delete_classic(overlay: dict, node_id: str) -> None:
    classic = overlay["classic"]
    if is_baseline_id(node_id):
        if node_id not in classic["deleted"]:
            classic["deleted"].append(node_id)
        classic["overrides"].pop(node_id, None)
    else:
        before = len(classic["added"])
        classic["added"] = [n for n in classic["added"] if n.get("id") != node_id]
        if len(classic["added"]) == before:
            raise KeyError(node_id)


# ── Sovaia-Mutationen ───────────────────────────────────────────────────

def patch_sovaia(overlay: dict, node_id: str, patch: dict) -> None:
    overrides = overlay.setdefault("sovaia", {}).setdefault("overrides", {})
    existing = overrides.get(node_id, {})
    overrides[node_id] = _deep_merge(existing, patch)


def revert_sovaia(overlay: dict, node_id: str) -> None:
    overrides = overlay.setdefault("sovaia", {}).setdefault("overrides", {})
    overrides.pop(node_id, None)


# ── Mapping-Mutationen ──────────────────────────────────────────────────

def add_mapping(overlay: dict, mapping: dict) -> dict:
    if not mapping.get("id"):
        raise ValueError("mapping.id required")
    overlay.setdefault("mappings", []).append(mapping)
    return mapping


def patch_mapping(overlay: dict, mapping_id: str, patch: dict) -> dict:
    mappings = overlay.setdefault("mappings", [])
    for i, m in enumerate(mappings):
        if m.get("id") == mapping_id:
            mappings[i] = _deep_merge(m, patch)
            return mappings[i]
    raise KeyError(mapping_id)


def delete_mapping(overlay: dict, mapping_id: str) -> None:
    mappings = overlay.setdefault("mappings", [])
    before = len(mappings)
    overlay["mappings"] = [m for m in mappings if m.get("id") != mapping_id]
    if len(overlay["mappings"]) == before:
        raise KeyError(mapping_id)


def filter_mappings_for_paths(overlay: dict, classic_ids: set[str], sovaia_ids: set[str]) -> list[dict]:
    """Returnt nur Mappings, deren Classic-Quelle ODER mindestens ein
    Sovaia-Target im aktuellen Pfad-Scope liegt."""
    mappings = overlay.get("mappings") or []
    out: list[dict] = []
    for m in mappings:
        cls = m.get("classic-node-id")
        sov = set(m.get("sovaia-node-ids") or [])
        if (cls and cls in classic_ids) or (sov & sovaia_ids):
            out.append(m)
    return out
