"""Edit-Endpoints für Classic-Knoten — Create / Patch / Delete via JSON-Overlay.

V1b: nur Classic editierbar. Sovaia-Nodes bleiben YAML-Code-Baseline.
Tenant via Header `X-EAM-Tenant` (Default `sovaia-internal`).
"""
from __future__ import annotations

import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.storage import overlay as overlay_store

router = APIRouter()


# ── Pydantic-Schemas ────────────────────────────────────────────────────

class ClassicNodeCreate(BaseModel):
    type: str = Field(..., description="anwendung | service | prozess | dokument | ...")
    label_de: str = Field(..., alias="label-de")
    summary_de: str | None = Field(default=None, alias="summary-de")
    taxonomy_paths: str = Field(
        ..., alias="taxonomy-paths",
        description="Komma-separierte Pfade, z.B. 'business/healthcare/heim-pflege/finanzen'",
    )
    operational_status: str | None = Field(default="in-use-everywhere", alias="operational-status")
    typical_tools: list[str] | None = Field(default=None, alias="typical-tools")
    seeded_by: str = Field(default="user-edit", alias="seeded-by")

    class Config:
        populate_by_name = True


class ClassicNodePatch(BaseModel):
    label_de: str | None = Field(default=None, alias="label-de")
    summary_de: str | None = Field(default=None, alias="summary-de")
    taxonomy_paths: str | None = Field(default=None, alias="taxonomy-paths")
    operational_status: str | None = Field(default=None, alias="operational-status")
    typical_tools: list[str] | None = Field(default=None, alias="typical-tools")
    available_from: str | None = Field(default=None, alias="available-from")

    class Config:
        populate_by_name = True


# ── Helpers ─────────────────────────────────────────────────────────────

def _tenant_from(header: str | None, settings: Settings) -> str:
    return (header or settings.tenant_default).strip().lower() or "sovaia-internal"


def _overlay_dir(settings: Settings) -> Path:
    return Path(settings.overlay_dir).resolve()


def _to_node(patch: ClassicNodePatch) -> dict:
    """Wandelt Patch-Payload in einen partial Node-Dict um."""
    d: dict[str, Any] = {}
    if patch.label_de is not None:
        d["label-de"] = patch.label_de
    if patch.summary_de is not None:
        d["summary-de"] = patch.summary_de
    tags: dict[str, Any] = {}
    if patch.taxonomy_paths is not None:
        tags["taxonomy-paths"] = patch.taxonomy_paths
    if patch.operational_status is not None:
        tags["operational-status"] = patch.operational_status
    if patch.available_from is not None:
        tags["available-from"] = patch.available_from
    if tags:
        d["tags"] = tags
    if patch.typical_tools is not None:
        d["typical-tools"] = patch.typical_tools
    return d


# ── Routes ──────────────────────────────────────────────────────────────

@router.post("/classic", status_code=201)
async def create_classic(
    body: ClassicNodeCreate,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)

    node_id = f"user-{tenant}-{uuid.uuid4().hex[:8]}"
    node: dict[str, Any] = {
        "id": node_id,
        "type": body.type,
        "label-de": body.label_de,
        "tags": {
            "ownership": "classic",
            "taxonomy-paths": body.taxonomy_paths,
            "operational-status": body.operational_status or "in-use-everywhere",
            "seeded-by": body.seeded_by or "user-edit",
        },
    }
    if body.summary_de:
        node["summary-de"] = body.summary_de
    if body.typical_tools:
        node["typical-tools"] = body.typical_tools

    overlay_store.add_classic(overlay, node)
    overlay_store.save_overlay(_overlay_dir(settings), overlay)
    return node


@router.patch("/classic/{node_id}")
async def patch_classic(
    node_id: str,
    body: ClassicNodePatch,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)
    patch = _to_node(body)
    if not patch:
        raise HTTPException(status_code=400, detail="empty patch")
    try:
        overlay_store.patch_classic(overlay, node_id, patch)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"node {node_id} not found in overlay added items")
    overlay_store.save_overlay(_overlay_dir(settings), overlay)
    return {"id": node_id, "patched": patch}


@router.delete("/classic/{node_id}", status_code=204)
async def delete_classic(
    node_id: str,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)
    try:
        overlay_store.delete_classic(overlay, node_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"node {node_id} not found")
    overlay_store.save_overlay(_overlay_dir(settings), overlay)


@router.get("/overlay")
async def get_overlay(
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    tenant = _tenant_from(x_eam_tenant, settings)
    return overlay_store.load_overlay(_overlay_dir(settings), tenant)
