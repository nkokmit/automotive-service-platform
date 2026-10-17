"""Damage detection router."""
from __future__ import annotations
import base64
import logging
import time
from io import BytesIO

import cv2
import httpx
import numpy as np
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.concurrency import run_in_threadpool

from app.config import get_settings
from app.models.yolo_onnx import YoloOnnxDetector, _compute_overall_severity
from app.schemas import DetectionRequest, DetectionResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["damage-detection"])
settings = get_settings()

_detector: YoloOnnxDetector | None = None


def get_detector() -> YoloOnnxDetector:
    global _detector
    if _detector is None:
        _detector = YoloOnnxDetector()
    return _detector


def _decode_image(data: bytes) -> np.ndarray:
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image")
    return img


async def _fetch_image_url(url: str) -> bytes:
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.content


@router.post("/detect", response_model=DetectionResponse)
async def detect_damage(
    req: DetectionRequest,
    detector: YoloOnnxDetector = Depends(get_detector),
):
    """Detect vehicle damage from an image URL or base64 data."""
    if not req.image_url and not req.image_base64:
        raise HTTPException(status_code=422, detail="Provide image_url or image_base64")

    try:
        if req.image_url:
            img_bytes = await _fetch_image_url(req.image_url)
        else:
            img_bytes = base64.b64decode(req.image_base64)

        bgr = _decode_image(img_bytes)
        h, w = bgr.shape[:2]

        t0 = time.perf_counter()
        damages = await run_in_threadpool(
            detector.detect, bgr, req.conf_threshold
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000

        overall = _compute_overall_severity(damages)
        parts = list({d.class_name for d in damages})
        if parts:
            summary = f"Phát hiện {len(damages)} vùng hư hỏng: {', '.join(parts)}. Mức độ tổng thể: {overall}."
        else:
            summary = "Không phát hiện hư hỏng trên xe."

        return DetectionResponse(
            success=True,
            num_detections=len(damages),
            damages=damages,
            overall_severity=overall,
            summary=summary,
            image_width=w,
            image_height=h,
            processing_time_ms=round(elapsed_ms, 2),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Detection failed")
        raise HTTPException(status_code=500, detail=f"Detection error: {exc}") from exc


@router.post("/detect/upload", response_model=DetectionResponse)
async def detect_damage_upload(
    file: UploadFile = File(...),
    conf_threshold: float | None = None,
    detector: YoloOnnxDetector = Depends(get_detector),
):
    """Detect vehicle damage from an uploaded image file."""
    img_bytes = await file.read()
    try:
        bgr = _decode_image(img_bytes)
        h, w = bgr.shape[:2]

        t0 = time.perf_counter()
        damages = await run_in_threadpool(detector.detect, bgr, conf_threshold)
        elapsed_ms = (time.perf_counter() - t0) * 1000

        overall = _compute_overall_severity(damages)
        parts = list({d.class_name for d in damages})
        summary = (
            f"Phát hiện {len(damages)} vùng hư hỏng: {', '.join(parts)}. Mức độ: {overall}."
            if parts else "Không phát hiện hư hỏng."
        )
        return DetectionResponse(
            success=True,
            num_detections=len(damages),
            damages=damages,
            overall_severity=overall,
            summary=summary,
            image_width=w,
            image_height=h,
            processing_time_ms=round(elapsed_ms, 2),
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Upload detection failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/health")
async def health():
    return {"status": "ok", "service": "damage-detection-service"}
