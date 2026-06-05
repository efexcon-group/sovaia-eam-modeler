"""Canvas-Layered-Stack (ADR-099) — die Ontologie als geschichtetes, zoombares
Blockbild.

Liefert in EINEM Payload die komplette Schicht-/Kategorie-/Technologie-Struktur,
gruppiert nach umschaltbarem Layer-Schema (TOGAF | ISO/OSI). Das Frontend rendert
daraus die Layer-Bänder, den Zoom-Drilldown (Kategorie → Subtyp → Technologie),
das Infra-Demand-Overlay (Heatmap) und den Übergang zum Navigator.

  GET /v1/canvas?scheme=togaf|osi
"""
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.config import Settings, get_settings
from app.routers.navigator import (
    _extract_taxonomy_paths,
    _is_classic,
    _load_cluster_defaults,
    _scan_reference_files,
    _strip_internal,
)
from app.storage import overlay as overlay_store

router = APIRouter()

_LEVELS = {"low": 1, "medium": 2, "high": 3}
_LEVELS_INV = {1: "low", 2: "medium", 3: "high"}


@lru_cache(maxsize=2)
def _load_schemes(base_str: str) -> dict[str, dict]:
    p = Path(base_str) / "layer-schemes.yaml"
    if not p.exists():
        return {}
    with p.open() as f:
        return (yaml.safe_load(f) or {}).get("schemes") or {}


@lru_cache(maxsize=2)
def _load_schichten(base_str: str) -> list[dict]:
    p = Path(base_str) / "taxonomy" / "schichten.yaml"
    if not p.exists():
        return []
    with p.open() as f:
        return (yaml.safe_load(f) or {}).get("schichten") or []


def _load_tree_roots(base: Path, schicht_id: str) -> list[dict]:
    p = base / "taxonomy" / f"{schicht_id}-tree.yaml"
    if not p.exists():
        return []
    with p.open() as f:
        return (yaml.safe_load(f) or {}).get("roots") or []


def _category_blocks(roots: list[dict], parent_path: str) -> list[dict]:
    """Baut verschachtelte Kategorie-Blöcke aus dem Taxonomie-Tree."""
    out: list[dict] = []
    for r in roots:
        rid = r.get("id")
        if not rid:
            continue
        path = f"{parent_path}/{rid}"
        out.append({
            "id": rid,
            "label-de": r.get("label-de") or rid,
            "summary-de": r.get("summary-de"),
            "path": path,
            "kind": "category",
            "children": _category_blocks(r.get("children") or [], path),
        })
    return out


def _index_by_path(blocks: list[dict], idx: dict[str, dict]) -> None:
    for b in blocks:
        idx[b["path"]] = b
        _index_by_path(b["children"], idx)


def _deepest_match(idx: dict[str, dict], full_path: str) -> dict | None:
    """Findet den Block mit exaktem Pfad, sonst den tiefsten Präfix."""
    if full_path in idx:
        return idx[full_path]
    parts = full_path.split("/")
    while len(parts) > 1:
        parts.pop()
        cand = "/".join(parts)
        if cand in idx:
            return idx[cand]
    return None


def _tech_leaf(node: dict, adopted: set[str]) -> dict:
    tags = node.get("tags") or {}
    classic = _is_classic(node)
    if classic:
        presence = "used" if node.get("id") in adopted else "available"
    else:
        presence = "sovaia"
    return {
        "id": node.get("id"),
        "label-de": node.get("label-de") or node.get("id"),
        "summary-de": node.get("summary-de"),
        "path": node.get("_attached_path"),
        "kind": "tech",
        "children": [],
        "type": node.get("type"),
        "status": tags.get("status") or tags.get("operational-status"),
        "infra-demand": node.get("infra-demand"),
        "presence": presence,
    }


def _aggregate(block: dict) -> tuple[dict, int]:
    """Aggregiert Infra-Demand (elementweise Max) + Tech-Count über Nachfahren.
    Mutiert block (setzt infra-demand/node-count für Kategorien)."""
    demand: dict[str, int] = {}
    count = 0

    def _merge(d: dict | None) -> None:
        if not d:
            return
        for k, v in d.items():
            lvl = _LEVELS.get(str(v))
            if lvl and lvl > demand.get(k, 0):
                demand[k] = lvl

    if block["kind"] == "tech":
        _merge(block.get("infra-demand"))
        count = 1
    for ch in block["children"]:
        ch_demand, ch_count = _aggregate(ch)
        _merge(ch_demand)
        count += ch_count

    out_demand = {k: _LEVELS_INV[v] for k, v in demand.items()}
    if block["kind"] == "category":
        block["infra-demand"] = out_demand or None
        block["node-count"] = count
    return out_demand, count


@router.get("")
async def canvas(
    scheme: str = Query("togaf", description="togaf | osi"),
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    base = Path(settings.reference_repo_path)
    schemes = _load_schemes(str(base))
    if scheme not in schemes:
        raise HTTPException(status_code=404, detail=f"unknown scheme '{scheme}' (have: {list(schemes)})")

    schichten = _load_schichten(str(base))
    schicht_ids = [s["id"] for s in schichten]

    # Tenant-Overlay (für presence used/available).
    tenant = (x_eam_tenant or settings.tenant_default).strip().lower() or settings.tenant_default
    overlay = overlay_store.load_overlay(Path(settings.overlay_dir).resolve(), tenant)
    adopted = set((overlay.get("classic") or {}).get("adopted") or [])

    # Alle Reference-Knoten + Pfade.
    cluster_defaults = _load_cluster_defaults(str(base))
    all_nodes = [_strip_internal(n) for n in _scan_reference_files(base)]

    # Pro Schicht: Kategorie-Blöcke bauen + Tech-Leaves anhängen.
    per_schicht: dict[str, list[dict]] = {}
    for sid in schicht_ids:
        roots = _load_tree_roots(base, sid)
        blocks = _category_blocks(roots, sid)
        idx: dict[str, dict] = {}
        _index_by_path(blocks, idx)
        # Leaves dieser Schicht anhängen.
        for node in all_nodes:
            for p in _extract_taxonomy_paths(node, cluster_defaults):
                if p != sid and not p.startswith(sid + "/"):
                    continue
                target = _deepest_match(idx, p)
                if target is None:
                    continue
                leaf = dict(node)
                leaf["_attached_path"] = target["path"]
                target["children"].append(_tech_leaf(leaf, adopted))
        for b in blocks:
            _aggregate(b)
        per_schicht[sid] = blocks

    # Nach Schema-Layern gruppieren.
    layers_out: list[dict] = []
    for layer in schemes[scheme].get("layers") or []:
        lblocks: list[dict] = []
        for sid in layer.get("schichten") or []:
            lblocks.extend(per_schicht.get(sid, []))
        layers_out.append({
            "id": layer["id"],
            "label-de": layer.get("label-de") or layer["id"],
            "blocks": lblocks,
        })

    return {
        "scheme": scheme,
        "schemes": [{"id": k, "label-de": v.get("label-de") or k} for k, v in schemes.items()],
        "tenant": tenant,
        "layers": layers_out,
    }
