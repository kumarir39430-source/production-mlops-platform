"""Central application configuration, loaded from environment variables / .env."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/app/core/config.py -> repository root is three levels above "core"
REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "ModelOps AI"
    environment: Literal["development", "testing", "production"] = "development"

    log_level: str = "INFO"
    log_json: bool = True

    # Comma-separated string (simple to set in .env); use `cors_origin_list` in code.
    cors_origins: str = "http://localhost:5173"

    # Required: no default, so secrets/credentials never live in source code.
    # SecretStr prevents accidental printing/logging of the value.
    database_url: SecretStr

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # database_url comes from the environment
