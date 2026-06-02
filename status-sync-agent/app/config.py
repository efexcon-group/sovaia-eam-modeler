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

    # ArgoCD-Server (intern erreichbar). Token wird über Secret gemountet.
    argocd_server: str = Field(default="https://argocd-server.argocd:443")
    argocd_token: str = Field(default="")  # via Secret
    # Pfad zu einem CA-Bundle für den internen argocd-server (self-signed Cert).
    # Gesetzt → TLS wird gegen dieses CA verifiziert (production-grade).
    # Leer → System-CA-Bundle.
    argocd_ca_cert: str = Field(default="")
    argocd_insecure: bool = Field(default=False)  # production: TLS immer verifizieren

    # Run-Modus
    dry_run: bool = Field(default=False)
    sync_interval_seconds: int = Field(default=900)  # 15 min default


@lru_cache
def get_settings() -> Settings:
    return Settings()
