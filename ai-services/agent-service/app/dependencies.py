from functools import lru_cache
from typing import AsyncGenerator
import httpx
from qdrant_client import AsyncQdrantClient
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.config import get_settings

settings = get_settings()

# ── Qdrant ──────────────────────────────────────────────────────────────────
_qdrant_client: AsyncQdrantClient | None = None


async def get_qdrant() -> AsyncQdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        qdrant_key = (
            settings.qdrant_api_key.get_secret_value().strip()
            if settings.qdrant_api_key
            else None
        )
        _qdrant_client = AsyncQdrantClient(
            url=settings.qdrant_url,
            api_key=qdrant_key,
            timeout=5,
            check_compatibility=False,
        )
    return _qdrant_client


# ── Relational Database (MySQL Primary via aiomysql) ─────────────────────────
_db_url = settings.effective_database_url
_connect_args = (
    {"connect_timeout": 3}
    if _db_url.startswith("mysql")
    else {"timeout": 3.0}
)

_engine: AsyncEngine = create_async_engine(
    _db_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args=_connect_args,
)
_session_factory = async_sessionmaker(_engine, expire_on_commit=False)


def get_engine() -> AsyncEngine:
    """Return the shared async SQLAlchemy engine."""
    return _engine


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with _session_factory() as session:
        yield session


# ── Checkpointer (Conversation Memory) ──────────────────────────────────────
from langgraph.checkpoint.memory import MemorySaver

_checkpointer: MemorySaver = MemorySaver()


def get_checkpointer() -> MemorySaver:
    """Return the shared in-memory checkpointer for multi-turn sessions."""
    return _checkpointer


# ── HTTP clients ─────────────────────────────────────────────────────────────
@lru_cache
def get_http_client() -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=60.0)
