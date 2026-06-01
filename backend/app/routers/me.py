"""GET /v1/me — gibt Tenant + License-Info zurück.

Frontend nutzt das zum Bauen License-aware UI (Layer-Tabs, Tile-Grid).
"""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, Header

from app.config import Settings, get_settings
from app.services import license_resolver
from app.storage import overlay as overlay_store

router = APIRouter()


@router.get("")
async def me(
    x_eam_tenant: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> dict:
    tenant = (x_eam_tenant or settings.tenant_default).strip().lower() or settings.tenant_default
    overlay = overlay_store.load_overlay(Path(settings.overlay_dir).resolve(), tenant)
    raw_license = overlay.get("license") or {}
    resolved = license_resolver.resolve_license(raw_license, settings.reference_repo_path)
    return {
        "tenant": tenant,
        "license-raw": raw_license,        # was im Overlay steht (Group-IDs + Legacy-Pfade)
        "license": resolved,                # was nach Resolver gilt (für UI nutzbar)
    }
