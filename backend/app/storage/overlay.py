"""JSON-Overlay-Store für Tenant-Edits über die YAML-Baseline.

Datei pro Tenant unter `EAM_OVERLAY_DIR/{tenant}.json`. Struktur:

{
  "version": "0.1.0",
  "tenant": "sovaia-internal",
  "classic": {
    "overrides": { "<node-id>": { partial-node-fields } },
    "added": [ full-node-objects ],
    "deleted": [ "<node-id>" ]
  }
}

Sovaia-Nodes sind in V1b NICHT editierbar (bleiben Code-Baseline).
"""
from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path

OVERLAY_VERSION = "0.1.0"
_SAFE_TENANT = re.compile(r"^[a-z0-9][a-z0-9\-]{0,63}$")


def _empty_overlay(tenant: str) -> dict:
    return {
        "version": OVERLAY_VERSION,
        "tenant": tenant,
        "classic": {"overrides": {}, "added": [], "deleted": []},
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
    # Vorwärts-kompatibles Schema absichern.
    data.setdefault("version", OVERLAY_VERSION)
    data.setdefault("tenant", tenant)
    classic = data.setdefault("classic", {})
    classic.setdefault("overrides", {})
    classic.setdefault("added", [])
    classic.setdefault("deleted", [])
    return data


def save_overlay(overlay_dir: Path, overlay: dict) -> None:
    tenant = overlay.get("tenant") or "sovaia-internal"
    p = _path_for(overlay_dir, tenant)
    p.write_text(json.dumps(overlay, indent=2, ensure_ascii=False))


# ── Mergen ──────────────────────────────────────────────────────────────

def apply_overlay_to_classic(
    classic_baseline: list[dict], overlay: dict
) -> list[dict]:
    """Apply overlay zu einer Liste klassischer Baseline-Nodes."""
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
    # User-added Klassik-Knoten anhängen.
    result.extend(added)
    return result


def _deep_merge(base: dict, override: dict) -> dict:
    """Tiefes Merge mit dict-recurse. override hat Vorrang."""
    out = deepcopy(base)
    for k, v in (override or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = deepcopy(v)
    return out


# ── Mutationen (zentralisiert, damit Routes konsistent bleiben) ─────────

def is_baseline_id(node_id: str) -> bool:
    """Convention: baseline classic-Knoten haben Prefix `cls-`."""
    return node_id.startswith("cls-")


def patch_classic(overlay: dict, node_id: str, patch: dict) -> None:
    classic = overlay["classic"]
    if is_baseline_id(node_id):
        existing = classic["overrides"].get(node_id) or {}
        classic["overrides"][node_id] = _deep_merge(existing, patch)
        # Reaktivieren wenn vorher gelöscht.
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
    # Tags sicherstellen.
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
