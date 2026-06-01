"""Navigator-Endpoint — Drill-Down + Classic-vs-Sovaia-Vergleich pro Pfad.

GET /v1/navigator?path=business/healthcare/heim-pflege

Antwort:
{
  "path": "business/healthcare/heim-pflege",
  "layer": "business",
  "current": { "id", "label-de", "summary-de" },
  "children": [ { "id", "label-de", "summary-de", "path" } ],
  "classic": [ { node-shape } ],
  "sovaia":  [ { node-shape } ],
  "impact-aggregate": { automation-grade, headcount-delta, cost-delta }
}

Cluster-Defaults: wenn ein Knoten keine explizite taxonomy-paths trägt, aber
einen cluster-Tag, wird der Default-Pfad aus taxonomy/cluster-defaults.yaml
angewendet. Explizite Tags HABEN VORRANG.
"""
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.config import Settings, get_settings
from app.services import license_resolver
from app.storage import overlay as overlay_store

router = APIRouter()


# ── Cluster-Defaults laden ──────────────────────────────────────────────

@lru_cache(maxsize=4)
def _load_cluster_defaults(base_str: str) -> dict[str, list[str]]:
    p = Path(base_str) / "taxonomy" / "cluster-defaults.yaml"
    if not p.exists():
        return {}
    with p.open() as f:
        data = yaml.safe_load(f) or {}
    return data.get("defaults") or {}


# ── YAML-Scan ───────────────────────────────────────────────────────────

def _scan_reference_files(base: Path) -> list[dict]:
    """Lädt alle Modell-YAMLs (sovaia/classic/verticals/business-apps/core-ai-stack)
    und gibt eine flache Liste aller Knoten zurück, jeder mit `_source` und
    geparsten `taxonomy-paths` als Liste."""
    files: list[Path] = []
    # Bekannte Reference-Files (taxonomy/* und stories/* werden ignoriert):
    for name in ["sovaia-reference.yaml", "classic-reference.yaml", "core-ai-stack.yaml"]:
        p = base / name
        if p.exists():
            files.append(p)
    for sub in ["verticals", "business-apps"]:
        d = base / sub
        if d.exists():
            files.extend(sorted(d.glob("*.yaml")))

    cluster_defaults = _load_cluster_defaults(str(base))

    all_nodes: list[dict] = []
    for f in files:
        with f.open() as fh:
            data = yaml.safe_load(fh) or {}
        for n in data.get("nodes", []) or []:
            n2 = dict(n)
            n2["_source"] = str(f.relative_to(base))
            n2["_taxonomy_paths_list"] = _extract_taxonomy_paths(n, cluster_defaults)
            all_nodes.append(n2)
    return all_nodes


def _extract_taxonomy_paths(node: dict, cluster_defaults: dict[str, list[str]]) -> list[str]:
    tags = node.get("tags") or {}
    raw = tags.get("taxonomy-paths")
    if raw:
        if isinstance(raw, list):
            return [str(x).strip() for x in raw if x]
        return [s.strip() for s in str(raw).split(",") if s.strip()]
    # Fallback: Cluster-Default.
    cluster = tags.get("cluster")
    if cluster and cluster in cluster_defaults:
        return list(cluster_defaults[cluster])
    return []


def _is_classic(node: dict) -> bool:
    tags = node.get("tags") or {}
    return (tags.get("ownership") or "").lower() == "classic"


# ── Taxonomie-Walk ──────────────────────────────────────────────────────

def _walk_tree(tree_root: list[dict], segments: list[str]) -> tuple[dict | None, list[dict]]:
    """Folgt einem Pfad durch den Tree. Returnt (aktueller-Knoten, children).
    Wenn segments leer ist: returnt (None, tree_root)."""
    if not segments:
        return None, tree_root
    nodes = tree_root
    current: dict | None = None
    for seg in segments:
        match = next((n for n in nodes if n.get("id") == seg), None)
        if not match:
            return None, []
        current = match
        nodes = match.get("children") or []
    return current, nodes


# ── Aggregations ────────────────────────────────────────────────────────

def _aggregate_impact(sovaia_nodes: list[dict]) -> dict[str, Any]:
    impacts = [n.get("impact") for n in sovaia_nodes if n.get("impact")]
    if not impacts:
        return {}

    def _avg(key: str) -> float | None:
        vals = [i.get(key) for i in impacts if i.get(key) is not None]
        return round(sum(vals) / len(vals), 2) if vals else None

    return {
        "automation-grade": _avg("automation-grade"),
        "headcount-delta": _avg("headcount-delta"),
        "cost-delta": _avg("cost-delta"),
        "sample-size": len(impacts),
    }


# ── Endpoint ────────────────────────────────────────────────────────────

@router.get("")
async def navigator(
    path: str = Query("", description="Pfad im Layer-Tree, z.B. 'business/healthcare/heim-pflege'."),
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    base = Path(settings.reference_repo_path)

    # 1) Pfad parsen.
    segments = [s for s in path.split("/") if s]
    if not segments:
        raise HTTPException(status_code=400, detail="path required, e.g. 'business' or 'business/healthcare'.")

    layer_id, *rest = segments

    # 2) Layer-Tree laden.
    tree_path = base / f"taxonomy/{layer_id}-tree.yaml"
    if not tree_path.exists():
        raise HTTPException(status_code=404, detail=f"layer tree not found: {layer_id}")
    with tree_path.open() as f:
        tree_data = yaml.safe_load(f) or {}
    roots = tree_data.get("roots") or []

    # 3) Tree-Walk.
    current, children = _walk_tree(roots, rest)

    # 4) Reference-Knoten an diesem Pfad sammeln (Prefix-Match).
    full_path = "/".join(segments)
    all_nodes = _scan_reference_files(base)

    # Classic + Sovaia trennen.
    classic_baseline = [_strip_internal(n) for n in all_nodes if _is_classic(n)]
    sovaia_all = [_strip_internal(n) for n in all_nodes if not _is_classic(n)]

    # Tenant-Overlay anwenden — Classic UND Sovaia.
    tenant = (x_eam_tenant or settings.tenant_default).strip().lower() or settings.tenant_default
    overlay = overlay_store.load_overlay(Path(settings.overlay_dir).resolve(), tenant)
    # ADR-083: Resolver resolved license-groups → allowed-paths/layers.
    license_block = license_resolver.resolve_license(
        overlay.get("license") or {}, settings.reference_repo_path
    )

    # License-Guard: 403 wenn Pfad nicht erlaubt.
    if not overlay_store.is_path_allowed(license_block, full_path):
        raise HTTPException(
            status_code=403,
            detail=f"path '{full_path}' not licensed for tenant '{tenant}'",
        )

    classic_effective = overlay_store.apply_overlay_to_classic(classic_baseline, overlay)
    sovaia_effective = overlay_store.apply_overlay_to_sovaia(sovaia_all, overlay)

    # Filter nach Pfad.
    def _node_matches(n: dict) -> bool:
        cluster_defaults = _load_cluster_defaults(str(base))
        paths = _extract_taxonomy_paths(n, cluster_defaults)
        return _matches_path(paths, full_path)

    classic = [n for n in classic_effective if _node_matches(n)]
    sovaia = [n for n in sovaia_effective if _node_matches(n)]

    # Mappings auf diesen Pfad filtern.
    classic_ids = {n["id"] for n in classic if n.get("id")}
    sovaia_ids = {n["id"] for n in sovaia if n.get("id")}
    mappings = overlay_store.filter_mappings_for_paths(overlay, classic_ids, sovaia_ids)

    # Vorher/Nachher-Aggregat über Mappings.
    cost_aggregate = _aggregate_costs(mappings)

    # Children durch License-Filter laufen lassen.
    visible_children = [
        c for c in children
        if overlay_store.is_child_visible(license_block, full_path, c.get("id") or "")
    ]

    return {
        "path": full_path,
        "layer": layer_id,
        "tenant": tenant,
        "current": _shape_current(current, full_path),
        "children": [_shape_child(c, full_path) for c in visible_children],
        "classic": classic,
        "sovaia": sovaia,
        "mappings": mappings,
        "impact-aggregate": _aggregate_impact(sovaia),
        "cost-aggregate": cost_aggregate,
    }


def _aggregate_costs(mappings: list[dict]) -> dict[str, Any]:
    """Summiert Vorher/Nachher OPEX/CAPEX über die geladenen Mappings."""
    if not mappings:
        return {}

    def _sum(side: str, key: str) -> float | None:
        vals = []
        for m in mappings:
            block = m.get(side) or {}
            v = block.get(key)
            if v is not None:
                vals.append(v)
        return round(sum(vals), 2) if vals else None

    return {
        "vorher": {
            "capex": _sum("vorher", "capex"),
            "opex-monatlich": _sum("vorher", "opex-monatlich"),
        },
        "nachher": {
            "capex": _sum("nachher", "capex"),
            "opex-monatlich": _sum("nachher", "opex-monatlich"),
        },
        "mapping-count": len(mappings),
    }


def _matches_path(node_paths: list[str], current_full: str) -> bool:
    """Match wenn ein Node-Pfad exakt dem aktuellen Pfad entspricht oder ihn als Prefix hat."""
    for p in node_paths:
        if p == current_full or p.startswith(current_full + "/"):
            return True
    return False


def _strip_internal(n: dict) -> dict:
    return {k: v for k, v in n.items() if not k.startswith("_")}


def _shape_current(node: dict | None, full_path: str) -> dict:
    if not node:
        return {"id": full_path.split("/")[-1], "label-de": full_path.split("/")[-1].title()}
    return {
        "id": node.get("id"),
        "label-de": node.get("label-de") or node.get("label-en") or node.get("id"),
        "summary-de": node.get("summary-de"),
    }


def _shape_child(child: dict, parent_path: str) -> dict:
    cid = child.get("id")
    return {
        "id": cid,
        "label-de": child.get("label-de") or cid,
        "summary-de": child.get("summary-de"),
        "path": f"{parent_path}/{cid}",
        "has-children": bool(child.get("children")),
    }
