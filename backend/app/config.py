from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="EAM_")

    env: str = Field(default="local", description="local | dev | staging | prod")

    database_url: str = Field(
        default="postgresql+psycopg://eam:eam@localhost:5432/architecture_modeler"
    )

    reference_repo_path: str = Field(
        default="reference",
        description="Pfad zur Sovaia-Reference. Source-of-Truth ist backend/reference/ "
        "in DIESEM Repo (wird ins Image gebacken nach /etc/sovaia-reference, im Container "
        "via EAM_REFERENCE_REPO_PATH überschrieben). Default 'reference' gilt für lokalen "
        "uvicorn-Start aus backend/.",
    )

    llm_bridge_url: str = Field(default="http://localhost:8001")
    llm_bridge_timeout: float = Field(
        default=180.0,
        description="Timeout (Sekunden) für Calls an eam-llm-bridge. Muss länger sein als der DGX-Timeout der Bridge.",
    )
    license_core_url: str = Field(default="http://license-core:8080")
    license_source: str = Field(
        default="overlay",
        description="License-Quelle (ADR-090): 'overlay' (Default, Group-IDs aus dem "
        "Tenant-Overlay) | 'license-core' (effective/{orgId}-Endpoint). 'lease' folgt "
        "additiv für single-tenant-Kunden.",
    )

    oidc_issuer: str = Field(default="https://keycloak.int.efexcon.com/auth/realms/efexcon-group")
    oidc_audience: str = Field(default="architecture-modeler-api")
    oidc_tenant_claim: str = Field(
        default="tenant",
        description="Token-Claim, aus dem der Tenant abgeleitet wird (ADR-091 Login-Block).",
    )
    auth_required: bool = Field(
        default=False,
        description="Wenn true: unauthentifizierte Requests (außer Health/Docs) → 401. "
        "Default false → additiv: Token wird validiert WENN vorhanden, sonst Header/Default "
        "(bricht internen Betrieb + status-sync-agent nicht).",
    )

    tenant_default: str = Field(default="sovaia-internal")

    overlay_dir: str = Field(
        default="./overlays",
        description="Verzeichnis für JSON-Overlays (Tenant-Edits über YAML-Baseline). "
        "Wird automatisch erstellt wenn nicht vorhanden.",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
