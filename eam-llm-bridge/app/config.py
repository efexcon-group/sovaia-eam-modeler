from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    dgx_llm_url: str = Field(
        default="",
        description="OpenAI-kompatibler LLM-Endpoint (z.B. http://100.73.145.52:8000). "
        "Wenn leer, returnen Endpoints einen Stub mit klarem Hinweis.",
    )
    dgx_model: str = Field(default="default")
    dgx_timeout_seconds: float = Field(default=60.0)
    dgx_api_key: str = Field(default="", description="Optional. Wird als Bearer-Token gesendet falls gesetzt.")


@lru_cache
def get_settings() -> Settings:
    return Settings()
