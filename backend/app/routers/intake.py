"""LLM-Batch-Generator für Classic-Knoten an einem Taxonomie-Pfad.

POST /v1/intake/generate-classic
Body: { "path": "business/healthcare/finanzen", "limit": 5 }
Header: X-EAM-Tenant

Ablauf:
  1. Aktuelle Sovaia-Module + existierende Classic-Knoten am Pfad sammeln (Kontext für LLM)
  2. eam-llm-bridge POST /v1/generate-classic anrufen
  3. Vorschlags-Liste in Overlay als `added` mit Prefix `llm-` ablegen
  4. Aktualisierten Navigator-Stand zurückgeben
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

import httpx
import yaml
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.storage import overlay as overlay_store

router = APIRouter()


class GenerateClassicRequest(BaseModel):
    path: str
    limit: int = Field(default=5, ge=1, le=10)


def _tenant_from(header: str | None, settings: Settings) -> str:
    return (header or settings.tenant_default).strip().lower() or "sovaia-internal"


# ── Pfad-Kontext einsammeln (lokal, ohne navigator.py-Reuse für Loose Coupling) ──

def _load_yaml(p: Path) -> dict:
    if not p.exists():
        return {}
    with p.open() as f:
        return yaml.safe_load(f) or {}


def _collect_context(settings: Settings, path: str) -> dict[str, Any]:
    base = Path(settings.reference_repo_path)
    sovaia_files = [
        base / "sovaia-reference.yaml",
        base / "core-ai-stack.yaml",
    ]
    for sub in ["verticals", "business-apps"]:
        d = base / sub
        if d.exists():
            sovaia_files.extend(sorted(d.glob("*.yaml")))
    classic_file = base / "classic-reference.yaml"

    sovaia_at_path: list[dict] = []
    classic_at_path: list[dict] = []

    def _match(node: dict) -> bool:
        tags = node.get("tags") or {}
        raw = tags.get("taxonomy-paths") or ""
        paths = [s.strip() for s in str(raw).split(",") if s.strip()] if not isinstance(raw, list) else [str(s) for s in raw]
        for p in paths:
            if p == path or p.startswith(path + "/"):
                return True
        return False

    for f in sovaia_files:
        for n in _load_yaml(f).get("nodes") or []:
            if _match(n):
                sovaia_at_path.append(n)
    for n in _load_yaml(classic_file).get("nodes") or []:
        if _match(n):
            classic_at_path.append(n)

    return {"sovaia": sovaia_at_path, "classic": classic_at_path}


# ── Bridge-Call ─────────────────────────────────────────────────────────

async def _call_bridge(
    bridge_url: str, path: str, sovaia: list[dict], existing_classic: list[dict], limit: int
) -> list[dict]:
    payload = {
        "path": path,
        "limit": limit,
        "sovaia-context": [
            {"label-de": n.get("label-de"), "summary-de": n.get("summary-de"), "type": n.get("type")}
            for n in sovaia
        ],
        "existing-classic": [
            {"label-de": n.get("label-de"), "summary-de": n.get("summary-de"), "type": n.get("type")}
            for n in existing_classic
        ],
    }
    url = bridge_url.rstrip("/") + "/v1/generate-classic"
    async with httpx.AsyncClient(timeout=60.0) as client:
        r = await client.post(url, json=payload)
        if r.status_code >= 500:
            raise HTTPException(
                status_code=502,
                detail=f"eam-llm-bridge upstream error {r.status_code}: {r.text[:200]}",
            )
        if r.status_code >= 400:
            raise HTTPException(status_code=r.status_code, detail=r.text[:400])
        data = r.json()
        return data.get("proposals", [])


# ── Endpoint ────────────────────────────────────────────────────────────

@router.post("/generate-classic")
async def generate_classic(
    body: GenerateClassicRequest,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    if "/" not in body.path:
        raise HTTPException(status_code=400, detail="path must contain at least one '/' (layer/...)")
    tenant = _tenant_from(x_eam_tenant, settings)

    ctx = _collect_context(settings, body.path)
    proposals = await _call_bridge(
        settings.llm_bridge_url, body.path, ctx["sovaia"], ctx["classic"], body.limit
    )

    if not proposals:
        return {"added": [], "rationale": "LLM lieferte keine Vorschläge.", "proposals-raw": []}

    overlay = overlay_store.load_overlay(Path(settings.overlay_dir).resolve(), tenant)
    added_nodes: list[dict] = []
    for prop in proposals:
        node_id = f"llm-{tenant}-{uuid.uuid4().hex[:8]}"
        node = {
            "id": node_id,
            "type": prop.get("type", "anwendung"),
            "label-de": prop.get("label-de") or prop.get("label") or "Unbenannt",
            "summary-de": prop.get("summary-de") or prop.get("summary") or "",
            "tags": {
                "ownership": "classic",
                "taxonomy-paths": prop.get("taxonomy-paths") or body.path,
                "operational-status": prop.get("operational-status") or "in-use-everywhere",
                "seeded-by": "llm-generated",
            },
        }
        if prop.get("typical-tools"):
            node["typical-tools"] = prop["typical-tools"]
        overlay_store.add_classic(overlay, node)
        added_nodes.append(node)

    overlay_store.save_overlay(Path(settings.overlay_dir).resolve(), overlay)
    return {"added": added_nodes, "count": len(added_nodes)}
