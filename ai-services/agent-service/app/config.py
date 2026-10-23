"""Application configuration using pydantic-settings with SecretStr and fail-fast validation."""
from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field, HttpUrl, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_agent_dir = Path(__file__).resolve().parent.parent
_root_dir = _agent_dir.parent.parent
_env_files = [
    str(_agent_dir / ".env"),
    str(_root_dir / ".env"),
    ".env",
]


class Settings(BaseSettings):
    """Strongly typed application settings loaded from .env with fail-fast validation."""

    model_config = SettingsConfigDict(
        env_file=_env_files,
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── LLM Configuration (SecretStr hides keys from logs & repr) ──────────────
    gemini_api_key: Optional[SecretStr] = Field(
        default=None,
        description="Google Gemini API key for the ReAct Agent",
    )
    gemini_model: str = Field(
        default="gemini-3-flash-preview",
        description="Default Gemini model name",
    )
    openai_api_key: Optional[SecretStr] = Field(
        default=None,
        description="OpenAI API key (optional fallback)",
    )
    openai_model: str = Field(
        default="gpt-4o-mini",
        description="OpenAI model name",
    )

    # ── Qdrant Vector Database ────────────────────────────────────────────────
    qdrant_url: str = Field(
        default="http://qdrant:6333",
        description="Qdrant service URL",
    )
    qdrant_api_key: Optional[SecretStr] = Field(
        default=None,
        description="Qdrant API key if authentication is enabled",
    )
    qdrant_news_collection: str = Field(
        default="car_news",
        description="Qdrant collection name for automotive news & tips",
    )
    qdrant_dense_model: str = Field(
        default="sentence-transformers/all-MiniLM-L6-v2",
        description="Dense embedding model name",
    )

    # ── Relational Database ───────────────────────────────────────────────────
    postgres_dsn: str = Field(
        default="postgresql+asyncpg://postgres:postgres@postgres:5432/automotive",
        description="Async database connection DSN",
    )

    # ── Microservice Endpoints (Validated URLs) ───────────────────────────────
    garage_service_url: str = Field(
        default="http://garage-service:8000",
        description="Garage appointment booking service URL",
    )
    damage_service_url: str = Field(
        default="http://damage-detection-service:8001",
        description="YOLOv8 damage detection service URL",
    )

    # ── Server Runtime ────────────────────────────────────────────────────────
    host: str = Field(default="0.0.0.0", description="Server host bind IP")
    port: int = Field(default=8002, ge=1, le=65535, description="Server port")
    debug: bool = Field(default=False, description="Debug mode flag")

    # ── Fail-Fast Validators ──────────────────────────────────────────────────
    @field_validator("qdrant_url", "garage_service_url", "damage_service_url")
    @classmethod
    def validate_service_urls(cls, v: str) -> str:
        """Fail-fast: Kiểm tra định dạng HTTP/HTTPS URL ngay khi ứng dụng khởi động."""
        if not v or not v.strip():
            raise ValueError("URL endpoint không được để trống.")
        # HttpUrl will validate scheme and syntax, raising ValidationError if malformed
        HttpUrl(v.strip())
        return v.strip().rstrip("/")

    @model_validator(mode="after")
    def validate_llm_api_keys(self) -> "Settings":
        """Fail-fast: Đảm bảo ít nhất một API Key của LLM đã được cung cấp trong file .env."""
        gemini_val = (
            self.gemini_api_key.get_secret_value().strip()
            if self.gemini_api_key
            else ""
        )
        openai_val = (
            self.openai_api_key.get_secret_value().strip()
            if self.openai_api_key
            else ""
        )
        if not gemini_val and not openai_val:
            raise ValueError(
                "Yêu cầu cấu hình API Key: Bạn cần cung cấp ít nhất GEMINI_API_KEY hoặc "
                "OPENAI_API_KEY trong file .env để ReAct Agent có thể hoạt động!"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Singleton getter for application settings."""
    return Settings()
