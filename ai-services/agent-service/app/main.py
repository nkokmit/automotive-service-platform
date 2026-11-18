"""FastAPI application entrypoint for agent-service."""
from __future__ import annotations
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.dependencies import get_engine, get_qdrant
from app.routers.chat import router as chat_router
from app.routers.customer_vehicles import router as customer_vehicles_router
from app.seed import ensure_mysql_seeded, ensure_qdrant_seeded

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()

_http_client: httpx.AsyncClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _http_client
    _http_client = httpx.AsyncClient(timeout=30.0)
    logger.info(
        "Agent service starting (DB=%s, Qdrant=%s)",
        settings.effective_database_url.split("@")[-1],
        settings.qdrant_url,
    )
    if settings.auto_seed_on_startup:
        # 1. Auto-initialize & seed MySQL `customer_vehicle_service` (`used_cars`, `customers`, `vehicles`, `vehicle_service_histories`)
        await ensure_mysql_seeded(get_engine())
        # 2. Auto-initialize & seed Qdrant `car_news` hybrid vector collection
        qdrant = await get_qdrant()
        await ensure_qdrant_seeded(qdrant, settings.qdrant_news_collection)

    logger.info("Agent service ready")
    yield
    await _http_client.aclose()
    logger.info("Agent service stopped")


app = FastAPI(
    title="Automotive AI Agent Service",
    description="LangGraph ReAct agent for the Automotive Service Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(customer_vehicles_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
