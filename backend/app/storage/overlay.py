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
        "classic": {"overrides": {}, "added": [], "deleted": [], "adopted": []},
        "sovaia": {"overrides": {}},
        "mappings": [],
        "license": _default_license(),
    }


def _default_license() -> dict:
    """Default = voller Zugriff (kein License-Filter aktiv).
    Sovaia-internal-Tenant + Dev-Mode bekommen das automatisch."""
    return {
        "version": "0.1.0",
        "mode": "open",            # open | strict | preview
        "license-groups": [],       # ADR-083: Group-IDs aus features.yaml
        "allowed-layers": [],       # Legacy C5a (backward-compat)
        "allowed-paths": [],
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
    # Forward-kompatible Schema-Migration.
    data.setdefault("version", OVERLAY_VERSION)
    data.setdefault("tenant", tenant)
    classic = data.setdefault("classic", {})
    classic.setdefault("overrides", {})
    classic.setdefault("added", [])
    classic.setdefault("deleted", [])
    sovaia = data.setdefault("sovaia", {})
    sovaia.setdefault("overrides", {})
    data.setdefault("mappings", [])
    # M:N-Migration: classic-node-id (Single) → classic-node-ids (Liste).
    for m in data["mappings"]:
        _normalize_mapping(m)
    # License-Block: lazy default für ältere Overlays.
    lic = data.setdefault("license", _default_license())
    lic.setdefault("version", "0.1.0")
    lic.setdefault("mode", "open")
    lic.setdefault("license-groups", [])    # ADR-083
    lic.setdefault("allowed-layers", [])     # Legacy C5a
    lic.setdefault("allowed-paths", [])
    return data


def set_license(overlay: dict, license_block: dict) -> dict:
    """Setzt den License-Block — entweder vom Admin gepflegt oder vom
    license-core-Loader übernommen (C5b)."""
    overlay["license"] = {
        "version": license_block.get("version", "0.1.0"),
        "mode": license_block.get("mode", "open"),
        "license-groups": list(license_block.get("license-groups") or []),
        "allowed-layers": list(license_block.get("allowed-layers") or []),
        "allowed-paths": list(license_block.get("allowed-paths") or []),
    }
    return overlay["license"]


# ── License-Guard-Helpers ───────────────────────────────────────────────

def is_layer_allowed(license_block: dict | None, layer_id: str) -> bool:
    if not license_block or license_block.get("mode") == "open":
        return True
    allowed_layers = license_block.get("allowed-layers") or []
    if allowed_layers and layer_id in allowed_layers:
        return True
    # Auch erlaubt wenn irgendein erlaubter Pfad mit diesem Layer beginnt.
    for p in license_block.get("allowed-paths") or []:
        if p == layer_id or p.startswith(layer_id + "/"):
            return True
    return False


def is_path_allowed(license_block: dict | None, full_path: str) -> bool:
    if not license_block or license_block.get("mode") == "open":
        return True
    layer_id = full_path.split("/", 1)[0]
    if not is_layer_allowed(license_block, layer_id):
        return False
    allowed = license_block.get("allowed-paths") or []
    if not allowed:
        return True  # nur Layer-Restriction, keine Path-Restriction
    for prefix in allowed:
        # Pfad ist Sub-Pfad eines erlaubten Prefix → erlaubt
        if full_path == prefix or full_path.startswith(prefix + "/"):
            return True
        # Pfad ist Ancestor eines erlaubten Pfads → erlaubt (Drill-Path)
        if prefix.startswith(full_path + "/"):
            return True
    return False


def is_child_visible(license_block: dict | None, parent_path: str, child_id: str) -> bool:
    """Sichtbarkeit eines Drill-Tile-Children im UI."""
    full = f"{parent_path}/{child_id}"
    return is_path_allowed(license_block, full)


def _normalize_mapping(m: dict) -> dict:
    """Bringt classic-node-id (Single) auf classic-node-ids (Liste).
    Backward-kompatibel für Overlays die vor M:N-Migration entstanden sind."""
    if "classic-node-ids" not in m:
        single = m.get("classic-node-id")
        m["classic-node-ids"] = [single] if single else []
    m.pop("classic-node-id", None)
    # sovaia-node-ids ist schon immer Liste.
    m.setdefault("sovaia-node-ids", [])
    return m


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


# ── Classic-Bibliothek / Adoption (ADR-103) ─────────────────────────────

def adopt_classic(overlay: dict, ids: list[str]) -> list[str]:
    """Übernimmt Bibliotheks-Bausteine in die Kunden-Instanz (`adopted`)."""
    adopted = overlay["classic"].setdefault("adopted", [])
    for nid in ids:
        if nid and nid not in adopted:
            adopted.append(nid)
    return adopted


def unadopt_classic(overlay: dict, ids: list[str]) -> list[str]:
    """Entfernt Bausteine aus der Instanz (Baseline bleibt in der Bibliothek)."""
    classic = overlay["classic"]
    drop = set(ids)
    classic["adopted"] = [a for a in (classic.get("adopted") or []) if a not in drop]
    return classic["adopted"]


def promote_classic(overlay: dict, node_id: str) -> None:
    """Markiert einen Custom-Baustein als bibliotheks-wiederverwendbar (`_promoted`)."""
    for n in overlay["classic"].get("added") or []:
        if n.get("id") == node_id:
            n["_promoted"] = True
            return
    raise KeyError(node_id)


def _classic_membership(overlay: dict) -> tuple[set, set, set]:
    classic = overlay.get("classic") or {}
    adopted = set(classic.get("adopted") or [])
    added = classic.get("added") or []
    added_ids = {n.get("id") for n in added if n.get("id")}
    promoted = {n.get("id") for n in added if n.get("_promoted")}
    return adopted, added_ids, promoted


def library_classic(effective_nodes: list[dict], overlay: dict) -> list[dict]:
    """Bibliotheks-Sicht: Baseline-Katalog + promotete Custom, je mit Adopted-Status."""
    adopted, added_ids, promoted = _classic_membership(overlay)
    out: list[dict] = []
    for n in effective_nodes:
        nid = n.get("id")
        is_custom = nid in added_ids
        if is_custom and nid not in promoted:
            continue  # Custom erscheint in der Bibliothek nur, wenn promotet
        m = dict(n)
        m["_adopted"] = (nid in adopted) or is_custom
        m["_custom"] = is_custom
        out.append(m)
    return out


def instance_classic(effective_nodes: list[dict], overlay: dict) -> list[dict]:
    """Instanz-Sicht: adoptierte Baseline + alle Custom-Bausteine."""
    adopted, added_ids, _ = _classic_membership(overlay)
    return [n for n in effective_nodes if (n.get("id") in adopted) or (n.get("id") in added_ids)]


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
    _normalize_mapping(mapping)
    overlay.setdefault("mappings", []).append(mapping)
    return mapping


def patch_mapping(overlay: dict, mapping_id: str, patch: dict) -> dict:
    mappings = overlay.setdefault("mappings", [])
    for i, m in enumerate(mappings):
        if m.get("id") == mapping_id:
            # Wenn Patch eine 'classic-node-ids'-Liste enthält, ersetzt sie die
            # alte komplett (deep_merge würde sonst Listen zusammenwerfen).
            if "classic-node-ids" in patch:
                m["classic-node-ids"] = list(patch["classic-node-ids"])
                patch = {k: v for k, v in patch.items() if k != "classic-node-ids"}
            if "sovaia-node-ids" in patch:
                m["sovaia-node-ids"] = list(patch["sovaia-node-ids"])
                patch = {k: v for k, v in patch.items() if k != "sovaia-node-ids"}
            mappings[i] = _deep_merge(m, patch)
            _normalize_mapping(mappings[i])
            return mappings[i]
    raise KeyError(mapping_id)


def delete_mapping(overlay: dict, mapping_id: str) -> None:
    mappings = overlay.setdefault("mappings", [])
    before = len(mappings)
    overlay["mappings"] = [m for m in mappings if m.get("id") != mapping_id]
    if len(overlay["mappings"]) == before:
        raise KeyError(mapping_id)


def filter_mappings_for_paths(overlay: dict, classic_ids: set[str], sovaia_ids: set[str]) -> list[dict]:
    """Returnt nur Mappings, die im aktuellen Pfad-Scope liegen
    (mindestens ein Classic ODER mindestens ein Sovaia trifft)."""
    mappings = overlay.get("mappings") or []
    out: list[dict] = []
    for m in mappings:
        cls = set(m.get("classic-node-ids") or [])
        sov = set(m.get("sovaia-node-ids") or [])
        if (cls & classic_ids) or (sov & sovaia_ids):
            out.append(m)
    return out
