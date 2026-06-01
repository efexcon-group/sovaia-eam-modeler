"""Edit-Endpoints — Create / Patch / Delete via JSON-Overlay.

Classic-Knoten: vollständig editierbar (overrides, added, deleted).
Sovaia-Knoten: per Overlay editierbar (overrides nur — Baseline bleibt).
Mappings: Classic ↔ Sovaia-Verbindung mit Narrativ + Vorher/Nachher.

Tenant via Header `X-EAM-Tenant` (Default `sovaia-internal`).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict, Field

from app.config import Settings, get_settings
from app.storage import overlay as overlay_store

router = APIRouter()


# ── Pydantic-Schemas ────────────────────────────────────────────────────

class ClassicNodeCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    type: str
    label_de: str = Field(alias="label-de")
    summary_de: str | None = Field(default=None, alias="summary-de")
    taxonomy_paths: str = Field(alias="taxonomy-paths")
    operational_status: str | None = Field(default="in-use-everywhere", alias="operational-status")
    typical_tools: list[str] | None = Field(default=None, alias="typical-tools")


class ClassicNodePatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    label_de: str | None = Field(default=None, alias="label-de")
    summary_de: str | None = Field(default=None, alias="summary-de")
    taxonomy_paths: str | None = Field(default=None, alias="taxonomy-paths")
    operational_status: str | None = Field(default=None, alias="operational-status")
    typical_tools: list[str] | None = Field(default=None, alias="typical-tools")


class ImpactPatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    automation_grade: int | None = Field(default=None, alias="automation-grade")
    headcount_delta: float | None = Field(default=None, alias="headcount-delta")
    cost_delta: float | None = Field(default=None, alias="cost-delta")
    time_to_value: str | None = Field(default=None, alias="time-to-value")
    operational_status: str | None = Field(default=None, alias="operational-status")
    available_from: str | None = Field(default=None, alias="available-from")
    evidence: str | None = None


class SovaiaNodePatch(BaseModel):
    """Felder die für Sovaia-Knoten editierbar sind. Baseline bleibt unverändert,
    Edits landen als overrides im Tenant-Overlay."""
    model_config = ConfigDict(populate_by_name=True)
    label_de: str | None = Field(default=None, alias="label-de")
    summary_de: str | None = Field(default=None, alias="summary-de")
    impact: ImpactPatch | None = None


class CostBlock(BaseModel):
    capex: float | None = None
    opex_monatlich: float | None = Field(default=None, alias="opex-monatlich")
    annahmen: str | None = None
    model_config = ConfigDict(populate_by_name=True)


class MappingCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    # M:N — beide Seiten als Listen. Leere classic-node-ids = Transformation/Mehrwert.
    classic_node_ids: list[str] = Field(default_factory=list, alias="classic-node-ids")
    sovaia_node_ids: list[str] = Field(default_factory=list, alias="sovaia-node-ids")
    narrative_de: str = Field(alias="narrative-de")
    vorher: CostBlock | None = None
    nachher: CostBlock | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


class MappingPatch(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    classic_node_ids: list[str] | None = Field(default=None, alias="classic-node-ids")
    sovaia_node_ids: list[str] | None = Field(default=None, alias="sovaia-node-ids")
    narrative_de: str | None = Field(default=None, alias="narrative-de")
    vorher: CostBlock | None = None
    nachher: CostBlock | None = None
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)


# ── Helpers ─────────────────────────────────────────────────────────────

def _tenant_from(header: str | None, settings: Settings) -> str:
    return (header or settings.tenant_default).strip().lower() or "sovaia-internal"


def _overlay_dir(settings: Settings) -> Path:
    return Path(settings.overlay_dir).resolve()


def _classic_patch_to_node(patch: ClassicNodePatch) -> dict:
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
    if tags:
        d["tags"] = tags
    if patch.typical_tools is not None:
        d["typical-tools"] = patch.typical_tools
    return d


def _sovaia_patch_to_node(patch: SovaiaNodePatch) -> dict:
    d: dict[str, Any] = {}
    if patch.label_de is not None:
        d["label-de"] = patch.label_de
    if patch.summary_de is not None:
        d["summary-de"] = patch.summary_de
    if patch.impact is not None:
        impact_dict: dict[str, Any] = {}
        if patch.impact.automation_grade is not None:
            impact_dict["automation-grade"] = patch.impact.automation_grade
        if patch.impact.headcount_delta is not None:
            impact_dict["headcount-delta"] = patch.impact.headcount_delta
        if patch.impact.cost_delta is not None:
            impact_dict["cost-delta"] = patch.impact.cost_delta
        if patch.impact.time_to_value is not None:
            impact_dict["time-to-value"] = patch.impact.time_to_value
        if patch.impact.operational_status is not None:
            impact_dict["operational-status"] = patch.impact.operational_status
        if patch.impact.available_from is not None:
            impact_dict["available-from"] = patch.impact.available_from
        if patch.impact.evidence is not None:
            impact_dict["evidence"] = patch.impact.evidence
        if impact_dict:
            d["impact"] = impact_dict
    return d


def _mapping_to_dict(mapping: MappingCreate | MappingPatch) -> dict:
    d: dict[str, Any] = {}
    if isinstance(mapping, MappingCreate):
        d["classic-node-ids"] = list(mapping.classic_node_ids)
        d["sovaia-node-ids"] = list(mapping.sovaia_node_ids)
    else:
        if mapping.classic_node_ids is not None:
            d["classic-node-ids"] = list(mapping.classic_node_ids)
        if mapping.sovaia_node_ids is not None:
            d["sovaia-node-ids"] = list(mapping.sovaia_node_ids)
    if mapping.narrative_de is not None:
        d["narrative-de"] = mapping.narrative_de
    if mapping.vorher is not None:
        d["vorher"] = mapping.vorher.model_dump(by_alias=True, exclude_none=True)
    if mapping.nachher is not None:
        d["nachher"] = mapping.nachher.model_dump(by_alias=True, exclude_none=True)
    if mapping.confidence is not None:
        d["confidence"] = mapping.confidence
    return d


# ── Classic-Routes ──────────────────────────────────────────────────────

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
            "seeded-by": "user-edit",
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
    patch = _classic_patch_to_node(body)
    if not patch:
        raise HTTPException(status_code=400, detail="empty patch")
    try:
        overlay_store.patch_classic(overlay, node_id, patch)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"classic node {node_id} not found")
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
        raise HTTPException(status_code=404, detail=f"classic node {node_id} not found")
    overlay_store.save_overlay(_overlay_dir(settings), overlay)


# ── Sovaia-Routes (Overlay über Baseline) ───────────────────────────────

@router.patch("/sovaia/{node_id}")
async def patch_sovaia(
    node_id: str,
    body: SovaiaNodePatch,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)
    patch = _sovaia_patch_to_node(body)
    if not patch:
        raise HTTPException(status_code=400, detail="empty patch")
    overlay_store.patch_sovaia(overlay, node_id, patch)
    overlay_store.save_overlay(_overlay_dir(settings), overlay)
    return {"id": node_id, "patched": patch}


@router.delete("/sovaia/{node_id}", status_code=204)
async def revert_sovaia(
    node_id: str,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    """Reverts den Override — Baseline-Sovaia bleibt sichtbar."""
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)
    overlay_store.revert_sovaia(overlay, node_id)
    overlay_store.save_overlay(_overlay_dir(settings), overlay)


# ── Mapping-Routes ──────────────────────────────────────────────────────

@router.get("/mappings")
async def list_mappings(
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> list[dict]:
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)
    return overlay.get("mappings") or []


@router.post("/mappings", status_code=201)
async def create_mapping(
    body: MappingCreate,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)
    if not body.narrative_de:
        raise HTTPException(status_code=400, detail="narrative-de required")
    if not body.sovaia_node_ids:
        raise HTTPException(status_code=400, detail="sovaia-node-ids required (>=1)")
    now = datetime.now(timezone.utc).isoformat()
    mapping = _mapping_to_dict(body)
    mapping["id"] = f"map-{uuid.uuid4().hex[:10]}"
    mapping["created-at"] = now
    mapping["updated-at"] = now
    overlay_store.add_mapping(overlay, mapping)
    overlay_store.save_overlay(_overlay_dir(settings), overlay)
    return mapping


@router.patch("/mappings/{mapping_id}")
async def patch_mapping_route(
    mapping_id: str,
    body: MappingPatch,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)
    patch = _mapping_to_dict(body)
    if not patch:
        raise HTTPException(status_code=400, detail="empty patch")
    patch["updated-at"] = datetime.now(timezone.utc).isoformat()
    try:
        updated = overlay_store.patch_mapping(overlay, mapping_id, patch)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"mapping {mapping_id} not found")
    overlay_store.save_overlay(_overlay_dir(settings), overlay)
    return updated


@router.delete("/mappings/{mapping_id}", status_code=204)
async def delete_mapping_route(
    mapping_id: str,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> None:
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)
    try:
        overlay_store.delete_mapping(overlay, mapping_id)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"mapping {mapping_id} not found")
    overlay_store.save_overlay(_overlay_dir(settings), overlay)


# ── Overlay-Inspektion (Debug) ──────────────────────────────────────────

@router.get("/overlay")
async def get_overlay(
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    tenant = _tenant_from(x_eam_tenant, settings)
    return overlay_store.load_overlay(_overlay_dir(settings), tenant)


# ── License (interim Option a — bis license-core-HTTP-Loader) ───────────

class LicensePut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    mode: str = "strict"  # open | strict | preview
    license_groups: list[str] = Field(default_factory=list, alias="license-groups")
    allowed_layers: list[str] = Field(default_factory=list, alias="allowed-layers")
    allowed_paths: list[str] = Field(default_factory=list, alias="allowed-paths")
    version: str = "0.1.0"


@router.get("/license")
async def get_license(
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)
    return overlay.get("license") or {}


@router.put("/license")
async def put_license(
    body: LicensePut,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    tenant = _tenant_from(x_eam_tenant, settings)
    overlay = overlay_store.load_overlay(_overlay_dir(settings), tenant)
    license_block = overlay_store.set_license(overlay, body.model_dump(by_alias=True))
    overlay_store.save_overlay(_overlay_dir(settings), overlay)
    return license_block
