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
        default="../../sovaia-contracts/registry/architecture-modeler",
        description="Pfad zur Sovaia-Reference (Working-Copy oder geclonter Pfad)",
    )

    llm_bridge_url: str = Field(default="http://localhost:8001")
    license_core_url: str = Field(default="http://license-core:8080")

    oidc_issuer: str = Field(default="https://keycloak.int.efexcon.com/realms/efexcon-group")
    oidc_audience: str = Field(default="architecture-modeler-api")

    tenant_default: str = Field(default="sovaia-internal")


@lru_cache
def get_settings() -> Settings:
    return Settings()
