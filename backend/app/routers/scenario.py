"""Szenario-Advisor — deterministische Sovereign-AI-Readiness-Gap-Analyse
(ADR-096/098).

Idee: Ein Workload-Target (z.B. `wl-llm-chat-rag`) setzt über `voraussetzt`-
Kanten eine Reihe von Capabilities voraus (transitiv, auch Target→Target). Diese
Closure = die Bausteine, die der Kunde braucht, um das Ziel zu erreichen. Jede
Capability ist `fulfilled-by` einen Provider (KIINNO-Datacenter / -Implementation
/ Sovaia-Modul) und einer `dimension` zugeordnet — daraus ergibt sich, was ohne
den Sovaia/KIINNO-Stack fehlt.

Kein LLM im Kern (rein graph-deterministisch). Das Entscheider-Narrativ pro
Lücke ist eine spätere Iteration.

  GET /v1/scenario/targets               → wählbare Workload-Ziele
  GET /v1/scenario/gap?target=wl-…       → Closure + Gruppierung + Summary
"""
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from fastapi import APIRouter, Depends, Header, HTTPException, Query

from app.config import Settings, get_settings
from app.storage import overlay as overlay_store

router = APIRouter()

# Relation, die eine Vorbedingung ausdrückt.
PREREQ_EDGE = "voraussetzt"
# Node-Typ, der ein wählbares Szenario-Ziel kennzeichnet.
TARGET_TYPE = "ai-use-case"


@lru_cache(maxsize=2)
def _load_graph(base_str: str) -> tuple[dict[str, dict], list[dict]]:
    """Lädt alle Reference-Knoten (by id) + alle Kanten. Gecacht pro base."""
    base = Path(base_str)
    files: list[Path] = []
    for name in ["sovaia-reference.yaml", "classic-reference.yaml", "core-ai-stack.yaml"]:
        p = base / name
        if p.exists():
            files.append(p)
    for sub in ["verticals", "business-apps"]:
        d = base / sub
        if d.exists():
            files.extend(sorted(d.glob("*.yaml")))

    nodes: dict[str, dict] = {}
    edges: list[dict] = []
    for f in files:
        with f.open() as fh:
            data = yaml.safe_load(fh) or {}
        for n in data.get("nodes", []) or []:
            nid = n.get("id")
            if nid and nid not in nodes:
                nodes[nid] = n
        for e in data.get("edges", []) or []:
            edges.append(e)
    return nodes, edges


def _as_list(val: Any) -> list[str]:
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x) for x in val if x]
    return [s.strip() for s in str(val).split(",") if s.strip()]


def _shape(node: dict) -> dict:
    tags = node.get("tags") or {}
    return {
        "id": node.get("id"),
        "label-de": node.get("label-de") or node.get("label-en") or node.get("id"),
        "summary-de": node.get("summary-de"),
        "type": node.get("type"),
        "status": tags.get("status"),
        "dimension": _as_list(tags.get("dimension")),
        "fulfilled-by": _as_list(tags.get("fulfilled-by")),
        "sovereignty": node.get("sovereignty"),
    }


def _prereq_closure(start: str, edges: list[dict]) -> list[str]:
    """Alle über `voraussetzt` (transitiv) erreichbaren Knoten ab `start`,
    ohne `start` selbst. Reihenfolge = BFS (stabil)."""
    adj: dict[str, list[str]] = {}
    for e in edges:
        if e.get("type") == PREREQ_EDGE:
            adj.setdefault(e.get("from"), []).append(e.get("to"))
    seen: set[str] = set()
    order: list[str] = []
    queue = list(adj.get(start, []))
    while queue:
        cur = queue.pop(0)
        if cur in seen:
            continue
        seen.add(cur)
        order.append(cur)
        queue.extend(adj.get(cur, []))
    return order


@lru_cache(maxsize=2)
def _load_flows(base_str: str) -> dict[str, dict]:
    """Lädt scenario-flows.yaml → {flow_id: flow}. Gecacht pro base."""
    p = Path(base_str) / "scenario-flows.yaml"
    if not p.exists():
        return {}
    with p.open() as f:
        data = yaml.safe_load(f) or {}
    out: dict[str, dict] = {}
    for flow in data.get("flows", []) or []:
        fid = flow.get("id")
        if fid:
            out[fid] = flow
    return out


@router.get("/flows")
async def list_flows(settings: Settings = Depends(get_settings)) -> dict:
    """Verfügbare Szenario-Ablaufdiagramme (Übersicht)."""
    flows = _load_flows(settings.reference_repo_path)
    items = [
        {
            "id": f["id"],
            "label-de": f.get("label-de") or f["id"],
            "summary-de": f.get("summary-de"),
            "target": f.get("target"),
            "step-count": sum(len(ph.get("steps") or []) for ph in f.get("phases") or []),
        }
        for f in flows.values()
    ]
    return {"flows": items, "count": len(items)}


@router.get("/flow")
async def scenario_flow(
    id: str = Query(..., description="Flow-ID, z.B. rag"),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Vollständiges Ablaufdiagramm eines Szenarios (Phasen → Schritte + Infra-Demand)."""
    flows = _load_flows(settings.reference_repo_path)
    flow = flows.get(id)
    if not flow:
        raise HTTPException(status_code=404, detail=f"flow '{id}' not found")
    return flow


@router.get("/targets")
async def list_targets(settings: Settings = Depends(get_settings)) -> dict:
    """Wählbare Szenario-Ziele: Knoten vom Typ ai-use-case, die `voraussetzt`-
    Kanten besitzen (also überhaupt eine Gap-Analyse erlauben)."""
    nodes, edges = _load_graph(settings.reference_repo_path)
    sources = {e.get("from") for e in edges if e.get("type") == PREREQ_EDGE}
    targets = [
        {"id": n["id"], "label-de": n.get("label-de") or n["id"], "summary-de": n.get("summary-de")}
        for nid, n in nodes.items()
        if nid in sources and (n.get("type") == TARGET_TYPE)
    ]
    return {"targets": targets, "count": len(targets)}


@router.get("/gap")
async def scenario_gap(
    target: str = Query(..., description="Workload-Target-ID, z.B. wl-llm-chat-rag"),
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Gap-Analyse für ein Target: voraussetzt-Closure → benötigte Capabilities,
    gruppiert nach Dimension + Provider, mit Status (Tenant-Overlay angewandt)."""
    nodes, edges = _load_graph(settings.reference_repo_path)
    if target not in nodes:
        raise HTTPException(status_code=404, detail=f"target '{target}' not found")

    closure_ids = _prereq_closure(target, edges)
    if not closure_ids:
        raise HTTPException(
            status_code=422,
            detail=f"'{target}' hat keine voraussetzt-Vorbedingungen (kein Gap berechenbar)",
        )

    # Tenant-Overlay anwenden, damit Status konsistent mit Navigator-Edits ist.
    tenant = (x_eam_tenant or settings.tenant_default).strip().lower() or settings.tenant_default
    overlay = overlay_store.load_overlay(Path(settings.overlay_dir).resolve(), tenant)
    closure_nodes = [nodes[i] for i in closure_ids if i in nodes]
    effective = overlay_store.apply_overlay_to_sovaia(closure_nodes, overlay)
    eff_by_id = {n.get("id"): n for n in effective}

    required: list[dict] = []
    by_dimension: dict[str, list[str]] = {}
    by_provider: dict[str, list[str]] = {}
    by_status: dict[str, int] = {}
    for cid in closure_ids:
        node = eff_by_id.get(cid) or nodes.get(cid)
        if not node:
            continue
        shaped = _shape(node)
        required.append(shaped)
        for dim in shaped["dimension"]:
            by_dimension.setdefault(dim, []).append(cid)
        for prov in shaped["fulfilled-by"]:
            by_provider.setdefault(prov, []).append(cid)
        status = shaped["status"] or "unbekannt"
        by_status[status] = by_status.get(status, 0) + 1

    tnode = nodes[target]
    return {
        "target": {
            "id": target,
            "label-de": tnode.get("label-de") or target,
            "summary-de": tnode.get("summary-de"),
        },
        "required": required,
        "by-dimension": by_dimension,
        "by-provider": by_provider,
        "summary": {"required-count": len(required), "by-status": by_status},
        "tenant": tenant,
    }
