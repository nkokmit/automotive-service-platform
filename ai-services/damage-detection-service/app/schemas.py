"""Request and Response Pydantic schemas for damage detection."""
from typing import Optional
from pydantic import BaseModel, Field


class DetectionRequest(BaseModel):
    """Input: either a public image URL or base64-encoded image bytes."""
    image_url: Optional[str] = Field(None, description="Public URL of the vehicle image")
    image_base64: Optional[str] = Field(
        None, description="Base64-encoded image (without data URI prefix)"
    )
    conf_threshold: Optional[float] = Field(
        None, ge=0.01, le=1.0,
        description="Override confidence threshold for this request"
    )


class DamageRegion(BaseModel):
    """A single detected damage region."""
    class_name: str
    class_id: int
    confidence: float
    bbox: list[float] = Field(..., description="[x1, y1, x2, y2] normalized 0-1")
    area_ratio: float = Field(..., description="Fraction of image area covered by mask")
    severity: str = Field(..., description="low | medium | high based on area_ratio")


class DetectionResponse(BaseModel):
    """Detection result with all damage regions and a summary."""
    success: bool
    num_detections: int
    damages: list[DamageRegion]
    overall_severity: str  # none | low | medium | high | critical
    summary: str
    image_width: int
    image_height: int
    processing_time_ms: float
