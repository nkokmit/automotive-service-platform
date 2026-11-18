"""Damage detection router with pixel/cm2 segmentation area, vehicle-aware pricing & annotated visualization."""
from __future__ import annotations
import base64
import binascii
import logging
import time

import cv2
import httpx
import numpy as np
from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, File
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response

from app.config import get_settings
from app.models.yolo_onnx import (
    YoloOnnxDetector,
    _compute_overall_severity,
    build_detection_summary_and_totals,
)
from app.schemas import DetectionRequest, DetectionResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["damage-detection"])
settings = get_settings()

_detector: YoloOnnxDetector | None = None
MAX_INFER_DIM = 1600


def get_detector() -> YoloOnnxDetector:
    global _detector
    if _detector is None:
        _detector = YoloOnnxDetector()
    return _detector


def _decode_base64_bytes(raw_b64: str) -> bytes:
    clean = (raw_b64 or "").strip()
    if "," in clean and clean.startswith("data:"):
        clean = clean.split(",", 1)[1].strip()
    clean = "".join(clean.split())
    pad = len(clean) % 4
    if pad:
        clean += "=" * (4 - pad)
    try:
        return base64.b64decode(clean)
    except (binascii.Error, ValueError) as exc:
        raise ValueError(f"Invalid base64 image data: {exc}") from exc


def _decode_image(data: bytes) -> np.ndarray:
    if not data:
        raise ValueError("Empty image bytes")
    arr = np.frombuffer(data, dtype=np.uint8)
    img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Failed to decode image")
    h, w = img.shape[:2]
    if max(h, w) > MAX_INFER_DIM:
        scale = MAX_INFER_DIM / float(max(h, w))
        new_w = max(1, int(round(w * scale)))
        new_h = max(1, int(round(h * scale)))
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return img


async def _fetch_image_url(url: str) -> bytes:
    clean_url = (url or "").strip()
    if not clean_url.startswith(("http://", "https://")):
        raise ValueError("image_url must start with http:// or https://")
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(clean_url)
            resp.raise_for_status()
            return resp.content
    except httpx.HTTPError as exc:
        raise ValueError(f"Could not fetch image_url: {exc}") from exc


@router.post("/detect", response_model=DetectionResponse)
async def detect_damage(
    req: DetectionRequest,
    detector: YoloOnnxDetector = Depends(get_detector),
):
    """Detect vehicle damage (with pixel/cm2 segmentation mask area & vehicle-aware cost) from URL or base64."""
    if not req.image_url and not req.image_base64:
        raise HTTPException(status_code=422, detail="Provide image_url or image_base64")

    try:
        if req.image_base64:
            img_bytes = _decode_base64_bytes(req.image_base64)
        else:
            img_bytes = await _fetch_image_url(req.image_url or "")

        bgr = _decode_image(img_bytes)
        h, w = bgr.shape[:2]

        t0 = time.perf_counter()
        damages, _, annotated_b64 = await run_in_threadpool(
            detector.detect_and_annotate,
            bgr,
            req.conf_threshold,
            req.vehicle_brand,
            req.vehicle_segment,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000

        overall = _compute_overall_severity(damages)
        totals = build_detection_summary_and_totals(
            damages,
            overall,
            vehicle_brand=req.vehicle_brand,
            vehicle_segment=req.vehicle_segment,
        )

        return DetectionResponse(
            success=True,
            num_detections=len(damages),
            damages=damages,
            overall_severity=overall,
            vehicle_info=totals["vehicle_info"],
            vehicle_segment=totals["vehicle_segment"],
            segment_label_vi=totals["segment_label_vi"],
            price_multiplier=totals["price_multiplier"],
            total_area_ratio=totals["total_area_ratio"],
            total_mask_area_px=totals["total_mask_area_px"],
            total_estimated_area_cm2=totals["total_estimated_area_cm2"],
            subtotal_cost_vnd=totals["subtotal_cost_vnd"],
            combo_discount_vnd=totals["combo_discount_vnd"],
            combo_discount_note=totals["combo_discount_note"],
            total_estimated_cost_vnd=totals["total_estimated_cost_vnd"],
            total_min_cost_vnd=totals["total_min_cost_vnd"],
            total_max_cost_vnd=totals["total_max_cost_vnd"],
            recommended_items=totals["recommended_items"],
            overall_assessment=totals["overall_assessment"],
            summary=totals["summary"],
            image_width=w,
            image_height=h,
            processing_time_ms=round(elapsed_ms, 2),
            annotated_image_base64=annotated_b64,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Detection failed")
        raise HTTPException(status_code=500, detail=f"Detection error: {exc}") from exc


@router.post("/detect/upload", response_model=DetectionResponse)
async def detect_damage_upload(
    file: UploadFile = File(...),
    conf_threshold: float | None = Form(None),
    vehicle_brand: str | None = Form(None),
    vehicle_segment: str | None = Form(None),
    detector: YoloOnnxDetector = Depends(get_detector),
):
    """Detect vehicle damage from an uploaded image file with optional vehicle brand/segment."""
    img_bytes = await file.read()
    try:
        bgr = _decode_image(img_bytes)
        h, w = bgr.shape[:2]
        t0 = time.perf_counter()
        damages, _, annotated_b64 = await run_in_threadpool(
            detector.detect_and_annotate,
            bgr,
            conf_threshold or settings.conf_threshold,
            vehicle_brand,
            vehicle_segment,
        )
        elapsed_ms = (time.perf_counter() - t0) * 1000
        overall = _compute_overall_severity(damages)
        totals = build_detection_summary_and_totals(
            damages,
            overall,
            vehicle_brand=vehicle_brand,
            vehicle_segment=vehicle_segment,
        )

        return DetectionResponse(
            success=True,
            num_detections=len(damages),
            damages=damages,
            overall_severity=overall,
            vehicle_info=totals["vehicle_info"],
            vehicle_segment=totals["vehicle_segment"],
            segment_label_vi=totals["segment_label_vi"],
            price_multiplier=totals["price_multiplier"],
            total_area_ratio=totals["total_area_ratio"],
            total_mask_area_px=totals["total_mask_area_px"],
            total_estimated_area_cm2=totals["total_estimated_area_cm2"],
            subtotal_cost_vnd=totals["subtotal_cost_vnd"],
            combo_discount_vnd=totals["combo_discount_vnd"],
            combo_discount_note=totals["combo_discount_note"],
            total_estimated_cost_vnd=totals["total_estimated_cost_vnd"],
            total_min_cost_vnd=totals["total_min_cost_vnd"],
            total_max_cost_vnd=totals["total_max_cost_vnd"],
            recommended_items=totals["recommended_items"],
            overall_assessment=totals["overall_assessment"],
            summary=totals["summary"],
            image_width=w,
            image_height=h,
            processing_time_ms=round(elapsed_ms, 2),
            annotated_image_base64=annotated_b64,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Upload detection failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.post("/detect/visualize", response_class=Response)
async def detect_damage_visualize(
    file: UploadFile = File(...),
    conf_threshold: float | None = None,
    detector: YoloOnnxDetector = Depends(get_detector),
):
    """Upload an image and receive the annotated JPEG image directly."""
    img_bytes = await file.read()
    try:
        bgr = _decode_image(img_bytes)
        _, annotated_bgr, _ = await run_in_threadpool(
            detector.detect_and_annotate, bgr, conf_threshold or settings.conf_threshold
        )
        ok, buf = cv2.imencode(".jpg", annotated_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        if not ok:
            raise RuntimeError("Failed to encode annotated image")
        return Response(content=buf.tobytes(), media_type="image/jpeg")
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Visualize detection failed")
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/health")
async def health():
    return {"status": "ok", "service": "damage-detection-service"}
