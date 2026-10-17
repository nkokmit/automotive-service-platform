from functools import lru_cache
from typing import AsyncGenerator
import httpx
from qdrant_client import AsyncQdrantClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.config import get_settings

settings = get_settings()

# ── Qdrant ──────────────────────────────────────────────────────────────────
_qdrant_client: AsyncQdrantClient | None = None

async def get_qdrant() -> AsyncQdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key or None,
        )
    return _qdrant_client

# ── PostgreSQL ───────────────────────────────────────────────────────────────
_engine = create_async_engine(settings.postgres_dsn, pool_pre_ping=True)
_session_factory = async_sessionmaker(_engine, expire_on_commit=False)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _session_factory() as session:
        yield session

# ── HTTP clients ─────────────────────────────────────────────────────────────
@lru_cache
def get_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=30.0)
