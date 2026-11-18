"""FastAPI entrypoint for damage-detection-service."""
from __future__ import annotations
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers.detect import router as detect_router, get_detector

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly load the ONNX model at startup
    model_path = Path(settings.onnx_model_path)
    if model_path.exists():
        get_detector()  # triggers model load
        logger.info("YOLOv8s-seg model pre-loaded successfully")
    else:
        logger.warning(
            "ONNX model not found at %s – detection will fail until model is provided",
            settings.onnx_model_path,
        )
    yield
    logger.info("Damage detection service stopped")


app = FastAPI(
    title="Vehicle Damage Detection Service",
    description="YOLOv8s-seg ONNX inference for automotive damage detection",
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

app.include_router(detect_router)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.host, port=settings.port, reload=settings.debug)
