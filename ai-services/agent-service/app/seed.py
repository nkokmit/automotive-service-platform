"""Database & Vector Store initializer using the repository's SQL migrations and seed scripts (no hardcoded data)."""
from __future__ import annotations

import asyncio
import importlib.util
import logging
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
import uuid

import pymysql
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    PointStruct,
    SparseVectorParams,
    VectorParams,
)
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.config import get_settings
from app.tools.search_car_news import _encode_dense, _encode_sparse

logger = logging.getLogger(__name__)
settings = get_settings()

# Project root (`c:\code\automotive-service-platform`)
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent
_FLYWAY_DIR = (
    _REPO_ROOT
    / "backend"
    / "services"
    / "customer-vehicle-service"
    / "src"
    / "main"
    / "resources"
    / "db"
    / "migration"
)
_INIT_SQL_FILE = _REPO_ROOT / "scripts" / "init-db" / "01_init.sql"
_QDRANT_SEED_SCRIPT = _REPO_ROOT / "scripts" / "seed_qdrant.py"


def _split_sql_statements(sql_content: str) -> list[str]:
    """Strip SQL comments and split a migration file into executable SQL statements."""
    lines: list[str] = []
    for line in sql_content.splitlines():
        stripped = line.strip()
        if stripped.startswith("--"):
            continue
        lines.append(line)
    cleaned = "\n".join(lines)
    return [stmt.strip() for stmt in cleaned.split(";") if stmt.strip() and not stmt.strip().upper().startswith("USE ")]


def _sync_mysql_from_migration_files(dsn: str) -> int:
    """Connect to MySQL and run existing Flyway SQL migrations + 01_init.sql if tables are missing."""
    parsed = urlparse(dsn.replace("mysql+aiomysql://", "mysql://"))
    host = parsed.hostname or "localhost"
    port = parsed.port or 3306
    user = parsed.username or "app"
    password = parsed.password or "apppassword123"
    db_name = (parsed.path or "/customer_vehicle_service").lstrip("/").split("?")[0] or "customer_vehicle_service"

    conn = pymysql.connect(
        host=host,
        port=port,
        user=user,
        password=password,
        database=db_name,
        charset="utf8mb4",
        autocommit=True,
        connect_timeout=3,
    )
    try:
        with conn.cursor() as cur:
            cur.execute("SHOW TABLES")
            existing_tables = {row[0] for row in cur.fetchall()}

            # 1. If Flyway tables (`customers`, `vehicles`, `vehicle_service_histories`) are missing, run V1..V5 SQL files
            if not {"customers", "vehicles", "vehicle_service_histories"}.issubset(existing_tables):
                if _FLYWAY_DIR.exists():
                    for sql_file in sorted(_FLYWAY_DIR.glob("V*.sql")):
                        sql_text = sql_file.read_text(encoding="utf-8")
                        for stmt in _split_sql_statements(sql_text):
                            try:
                                cur.execute(stmt)
                            except Exception as exc:
                                logger.debug("Skipped SQL statement in %s: %s", sql_file.name, exc)

            # 2. If `used_cars` table is missing or empty, run `scripts/init-db/01_init.sql`
            need_used_cars = "used_cars" not in existing_tables
            if not need_used_cars:
                cur.execute("SELECT COUNT(*) FROM used_cars")
                need_used_cars = int(cur.fetchone()[0] or 0) == 0

            if need_used_cars and _INIT_SQL_FILE.exists():
                sql_text = _INIT_SQL_FILE.read_text(encoding="utf-8")
                for stmt in _split_sql_statements(sql_text):
                    cur.execute(stmt)

            cur.execute("SELECT COUNT(*) FROM used_cars")
            total_used_cars = int(cur.fetchone()[0] or 0)
            return total_used_cars
    finally:
        conn.close()


async def ensure_mysql_seeded(engine: AsyncEngine) -> int:
    """Verify MySQL connection and apply existing `.sql` migration files if tables are not yet initialized."""
    try:
        count = await asyncio.to_thread(
            _sync_mysql_from_migration_files,
            settings.effective_database_url,
        )
        logger.info("MySQL database synchronized (`used_cars`=%d rows).", count)
        return count
    except Exception as exc:
        logger.warning("MySQL synchronization skipped (%s).", exc)
        return 0


def _load_articles_from_seed_script() -> list[dict[str, Any]]:
    """Load ARTICLES from `scripts/seed_qdrant.py` so data is never duplicated in app code."""
    if not _QDRANT_SEED_SCRIPT.exists():
        return []
    spec = importlib.util.spec_from_file_location("seed_qdrant_module", _QDRANT_SEED_SCRIPT)
    if spec and spec.loader:
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return getattr(mod, "ARTICLES", [])
    return []


def _build_qdrant_points_from_script() -> list[PointStruct]:
    """Encode articles from `scripts/seed_qdrant.py` into Qdrant PointStruct objects."""
    articles = _load_articles_from_seed_script()
    points: list[PointStruct] = []
    for idx, art in enumerate(articles):
        full_text = f"{art['title']}. {art['content']}"
        dense_vec = _encode_dense(full_text)
        sparse_vec = _encode_sparse(full_text)
        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"article-{idx}-{art['title']}"))
        points.append(
            PointStruct(
                id=point_id,
                vector={
                    "dense": dense_vec,
                    "sparse": sparse_vec,
                },
                payload=art,
            )
        )
    return points


async def ensure_qdrant_seeded(
    qdrant_client: AsyncQdrantClient,
    collection_name: str | None = None,
) -> int:
    """Ensure Qdrant `car_news` collection exists and is populated from `scripts/seed_qdrant.py` if empty."""
    col = collection_name or settings.qdrant_news_collection
    try:
        collections_resp = await qdrant_client.get_collections()
        existing = [c.name for c in collections_resp.collections]

        if col not in existing:
            logger.info("Creating Qdrant hybrid collection '%s'...", col)
            await qdrant_client.create_collection(
                collection_name=col,
                vectors_config={
                    "dense": VectorParams(size=384, distance=Distance.COSINE),
                },
                sparse_vectors_config={
                    "sparse": SparseVectorParams(),
                },
            )

        count_resp = await qdrant_client.count(collection_name=col, exact=True)
        current_count = int(count_resp.count or 0)

        if current_count == 0:
            points = await asyncio.to_thread(_build_qdrant_points_from_script)
            if points:
                await qdrant_client.upsert(
                    collection_name=col,
                    points=points,
                    wait=True,
                )
                current_count = len(points)
                logger.info("Qdrant collection '%s' populated with %d points from scripts/seed_qdrant.py.", col, current_count)
        else:
            logger.info("Qdrant collection '%s' ready (%d points).", col, current_count)
        return current_count
    except Exception as exc:
        logger.warning("Qdrant check skipped for '%s' (%s).", col, exc)
        return 0
