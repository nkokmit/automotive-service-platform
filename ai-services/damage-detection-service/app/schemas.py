"""Request and Response Pydantic schemas for damage detection, area & vehicle-aware pricing."""
from typing import Optional
from pydantic import BaseModel, Field


class DetectionRequest(BaseModel):
    """Input: either a public image URL or base64-encoded image bytes, plus optional vehicle info."""
    image_url: Optional[str] = Field(None, description="Public URL of the vehicle image")
    image_base64: Optional[str] = Field(
        None, description="Base64-encoded image (with or without data URI prefix)"
    )
    conf_threshold: Optional[float] = Field(
        None, ge=0.01, le=1.0,
        description="Override confidence threshold for this request"
    )
    vehicle_brand: Optional[str] = Field(
        None, description="Car brand or model name (e.g. 'Toyota Vios', 'Mazda CX-5', 'Mercedes C200')"
    )
    vehicle_segment: Optional[str] = Field(
        None, description="Optional explicit segment: economy | standard | suv_mpv | luxury"
    )


class RecommendedItem(BaseModel):
    """Recommended repair service or replacement part corresponding to detected damage."""
    id: str
    name: str
    item_type: str = Field(..., description="service | part")
    category: str
    estimated_price_vnd: int
    link: str
    reason: str


class DamageRegion(BaseModel):
    """A single detected damage region with pixel/cm2 segmentation area and vehicle-adjusted cost."""
    class_name: str
    class_label_vi: str = Field("", description="Vietnamese label for the damage class")
    class_id: int
    confidence: float
    bbox: list[float] = Field(..., description="[x1, y1, x2, y2] normalized 0-1")
    bbox_area_ratio: float = Field(0.0, description="Fraction of image area covered by bounding box")
    mask_area_px: int = Field(0, description="Exact pixel count of the segmentation mask")
    area_ratio: float = Field(..., description="True fraction of image area covered by segmentation mask")
    estimated_area_cm2: float = Field(0.0, description="Estimated real-world damaged area in cm²")
    dimensions_cm_str: str = Field("", description="Approximate width × height in cm (e.g. '18.5 × 12.0 cm')")
    severity: str = Field(..., description="low | medium | high based on true mask area_ratio")
    base_cost_vnd: int = Field(0, description="Base repair cost in VND for a standard car before segment multiplier")
    estimated_cost_vnd: int = Field(0, description="Estimated repair cost in VND adjusted for vehicle segment & area")
    min_cost_vnd: int = Field(0, description="Minimum estimated repair cost in VND")
    max_cost_vnd: int = Field(0, description="Maximum estimated repair cost in VND")
    unit_price_note: str = Field("", description="Explanation of how area (cm²) and segment multiplier determined the price")
    repair_recommendation: str = Field("", description="Assessment and recommended repair action in Vietnamese")


class DetectionResponse(BaseModel):
    """Detection result with all damage regions, total area (%, px, cm²), vehicle-aware cost, and annotated image."""
    success: bool
    num_detections: int
    damages: list[DamageRegion]
    overall_severity: str  # none | low | medium | high | critical
    vehicle_info: str = Field("Xe phổ thông (Mặc định)", description="Detected or specified vehicle brand/model")
    vehicle_segment: str = Field("standard", description="economy | standard | suv_mpv | luxury")
    segment_label_vi: str = Field("Sedan / Hatchback phổ thông (Hạng B/C)", description="Vietnamese description of the segment")
    price_multiplier: float = Field(1.0, description="Pricing multiplier applied for the vehicle segment")
    total_area_ratio: float = Field(0.0, description="Combined fraction of image area covered by all damage masks")
    total_mask_area_px: int = Field(0, description="Combined pixel count of all damage masks")
    total_estimated_area_cm2: float = Field(0.0, description="Combined estimated physical damaged area in cm²")
    subtotal_cost_vnd: int = Field(0, description="Sum of individual region costs before combo discount")
    combo_discount_vnd: int = Field(0, description="Discount in VND when repairing multiple body/paint damages together")
    combo_discount_note: str = Field("", description="Explanation of multi-region repair combo discount")
    total_estimated_cost_vnd: int = Field(0, description="Final total estimated repair cost in VND")
    total_min_cost_vnd: int = Field(0, description="Total minimum estimated repair cost in VND")
    total_max_cost_vnd: int = Field(0, description="Total maximum estimated repair cost in VND")
    recommended_items: list[RecommendedItem] = Field(default_factory=list, description="Recommended services and parts")
    overall_assessment: str = Field("", description="Detailed assessment with area and cost breakdown in Vietnamese")
    summary: str
    image_width: int
    image_height: int
    processing_time_ms: float
    annotated_image_base64: Optional[str] = Field(
        None,
        description="Base64-encoded JPEG image with segmentation masks, contours, and bounding boxes drawn",
    )
