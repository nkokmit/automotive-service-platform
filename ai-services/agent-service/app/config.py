from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path

_env_file = Path(__file__).resolve().parent.parent / ".env"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=[str(_env_file), ".env"],
        extra="ignore",
    )

    # LLM (Google Gemini default, OpenAI optional fallback)
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3-flash-preview"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    # Qdrant
    qdrant_url: str = "http://qdrant:6333"
    qdrant_api_key: str = ""
    qdrant_news_collection: str = "car_news"
    qdrant_dense_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    # PostgreSQL
    postgres_dsn: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/automotive"

    # Garage service
    garage_service_url: str = "http://garage-service:8000"

    # Damage detection
    damage_service_url: str = "http://damage-detection-service:8001"

    # Server
    host: str = "0.0.0.0"
    port: int = 8002
    debug: bool = False

@lru_cache
def get_settings() -> Settings:
    return Settings()
