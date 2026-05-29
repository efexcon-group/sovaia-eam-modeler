from pathlib import Path

import yaml
from fastapi import APIRouter, Depends, HTTPException

from app.config import Settings, get_settings

router = APIRouter()


def _load_yaml(base: Path, rel_path: str) -> dict:
    full = (base / rel_path).resolve()
    if not full.exists():
        raise HTTPException(status_code=404, detail=f"reference file not found: {rel_path}")
    with full.open() as f:
        return yaml.safe_load(f)


@router.get("/schema")
async def get_schema(settings: Settings = Depends(get_settings)) -> dict:
    """Meta-Modell (15 Node-Types, 7 Edge-Types, Story-Schema)."""
    return _load_yaml(Path(settings.reference_repo_path), "schema.yaml")


@router.get("/sovaia")
async def get_sovaia_reference(settings: Settings = Depends(get_settings)) -> dict:
    """Top-Level Sovaia-Reference mit Cluster-Anchors."""
    return _load_yaml(Path(settings.reference_repo_path), "sovaia-reference.yaml")


@router.get("/sovaia/{cluster_path:path}")
async def get_cluster_detail(
    cluster_path: str, settings: Settings = Depends(get_settings)
) -> dict:
    """Lazy-Load eines Detail-Files (z.B. verticals/care.yaml)."""
    if ".." in cluster_path or cluster_path.startswith("/"):
        raise HTTPException(status_code=400, detail="invalid path")
    return _load_yaml(Path(settings.reference_repo_path), cluster_path)


@router.get("/stories")
async def list_stories(settings: Settings = Depends(get_settings)) -> list[dict]:
    """Liste aller Baseline-Stories aus stories/."""
    stories_dir = Path(settings.reference_repo_path) / "stories"
    if not stories_dir.exists():
        return []
    items: list[dict] = []
    for f in sorted(stories_dir.glob("*.yaml")):
        with f.open() as fh:
            data = yaml.safe_load(fh) or {}
        items.append(
            {
                "id": data.get("id", f.stem),
                "title": data.get("title", ""),
                "industry-tag": data.get("industry-tag"),
                "persona-target": data.get("persona-target"),
                "summary-de": data.get("summary-de"),
            }
        )
    return items
