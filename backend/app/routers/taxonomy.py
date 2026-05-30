from pathlib import Path

import yaml
from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings

router = APIRouter()


def _load(base: Path, rel: str) -> dict:
    full = (base / rel).resolve()
    if not full.exists():
        raise HTTPException(status_code=404, detail=f"taxonomy file not found: {rel}")
    with full.open() as f:
        return yaml.safe_load(f)


@router.get("/schichten")
async def get_schichten(settings: Settings = Depends(get_settings)) -> dict:
    """Top-Level Schichten-Taxonomie (7 Layer)."""
    return _load(Path(settings.reference_repo_path), "taxonomy/schichten.yaml")


@router.get("/{layer_id}")
async def get_layer_tree(layer_id: str, settings: Settings = Depends(get_settings)) -> dict:
    """Detail-Baum einer Schicht (z.B. business → business-tree.yaml)."""
    if "/" in layer_id or ".." in layer_id:
        raise HTTPException(status_code=400, detail="invalid layer_id")
    return _load(Path(settings.reference_repo_path), f"taxonomy/{layer_id}-tree.yaml")
