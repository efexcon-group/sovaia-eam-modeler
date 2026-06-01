from pathlib import Path

import yaml
from fastapi import APIRouter, Depends, Header, HTTPException

from app.config import Settings, get_settings
from app.storage import overlay as overlay_store

router = APIRouter()


def _load(base: Path, rel: str) -> dict:
    full = (base / rel).resolve()
    if not full.exists():
        raise HTTPException(status_code=404, detail=f"taxonomy file not found: {rel}")
    with full.open() as f:
        return yaml.safe_load(f)


def _tenant_license(x_eam_tenant: str | None, settings: Settings) -> dict | None:
    tenant = (x_eam_tenant or settings.tenant_default).strip().lower() or settings.tenant_default
    overlay = overlay_store.load_overlay(Path(settings.overlay_dir).resolve(), tenant)
    return overlay.get("license")


@router.get("/schichten")
async def get_schichten(
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Top-Level Schichten-Taxonomie (7 Layer) — License-gefiltert."""
    data = _load(Path(settings.reference_repo_path), "taxonomy/schichten.yaml")
    license_block = _tenant_license(x_eam_tenant, settings)
    if license_block and license_block.get("mode") != "open":
        data["schichten"] = [
            s for s in (data.get("schichten") or [])
            if overlay_store.is_layer_allowed(license_block, s.get("id"))
        ]
    return data


@router.get("/{layer_id}")
async def get_layer_tree(
    layer_id: str,
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Detail-Baum einer Schicht (z.B. business → business-tree.yaml) — License-gefiltert."""
    if "/" in layer_id or ".." in layer_id:
        raise HTTPException(status_code=400, detail="invalid layer_id")
    data = _load(Path(settings.reference_repo_path), f"taxonomy/{layer_id}-tree.yaml")
    license_block = _tenant_license(x_eam_tenant, settings)
    if license_block and license_block.get("mode") != "open":
        if not overlay_store.is_layer_allowed(license_block, layer_id):
            raise HTTPException(status_code=403, detail=f"layer '{layer_id}' not licensed")
        # Roots + Children rekursiv filtern.
        data["roots"] = _filter_tree(data.get("roots") or [], layer_id, license_block)
    return data


def _filter_tree(nodes: list[dict], parent_path: str, license_block: dict) -> list[dict]:
    out = []
    for n in nodes:
        nid = n.get("id")
        if not nid:
            continue
        full = f"{parent_path}/{nid}"
        if not overlay_store.is_path_allowed(license_block, full):
            continue
        n2 = dict(n)
        if n.get("children"):
            n2["children"] = _filter_tree(n["children"], full, license_block)
        out.append(n2)
    return out
