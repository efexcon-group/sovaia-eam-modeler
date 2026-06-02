from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="SSA_")

    # Wo liegt die Sovaia-Reference (Read-only-Mount der Modeler-Image-Files
    # ODER via HTTP-Pull aus dem Modeler-Backend).
    reference_repo_path: str = Field(default="/etc/sovaia-reference")

    # Modeler-API für PATCH /v1/edit/sovaia/{id}.
    modeler_api_url: str = Field(default="http://architecture-modeler-api.platform:8000")
    modeler_tenant: str = Field(default="sovaia-internal")

    # ArgoCD-Status wird direkt aus den Application-CRDs gelesen (K8s-API via
    # ServiceAccount-RBAC) — kein REST-Token, kein TLS-Handling nötig.
    argocd_namespace: str = Field(default="argocd")

    # Run-Modus
    dry_run: bool = Field(default=False)
    sync_interval_seconds: int = Field(default=900)  # 15 min default


@lru_cache
def get_settings() -> Settings:
    return Settings()
