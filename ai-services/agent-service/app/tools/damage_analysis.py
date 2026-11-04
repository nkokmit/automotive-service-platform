"""Tool: analyze_vehicle_damage – calls damage-detection-service with image, cm2 area & vehicle-aware cost."""
from __future__ import annotations
import logging
from typing import Any, Optional

import httpx
from langchain_core.tools import tool

from app.config import get_settings
from app.tools.schemas import AnalyzeVehicleDamageInput

logger = logging.getLogger(__name__)
settings = get_settings()

CLASS_LABELS_VI_FALLBACK: dict[str, str] = {
    "dent": "Móp méo thân vỏ (Dent)",
    "scratch": "Trầy xước sơn (Scratch)",
    "crack": "Nứt vỡ thân vỏ / cản (Crack)",
    "glass shatter": "Nứt / Vỡ kính xe (Glass Shatter)",
    "lamp broken": "Vỡ / Hư hỏng cụm đèn (Lamp Broken)",
    "tire flat": "Xẹp lốp / Hư hỏng lốp (Tire Flat)",
}

# Danh sách từ khóa dòng xe để tự động nhận diện từ câu hỏi trong khung chat
KNOWN_VEHICLE_PATTERNS: list[tuple[str, str]] = [
    ("mercedes c300", "Mercedes C300"),
    ("mercedes c200", "Mercedes C200"),
    ("mercedes e200", "Mercedes E200"),
    ("mercedes e300", "Mercedes E300"),
    ("mercedes glc", "Mercedes GLC"),
    ("mercedes", "Mercedes-Benz"),
    ("c200", "Mercedes C200"),
    ("c300", "Mercedes C300"),
    ("glc", "Mercedes GLC"),
    ("maybach", "Mercedes-Maybach"),
    ("bmw 320i", "BMW 320i"),
    ("bmw x3", "BMW X3"),
    ("bmw x5", "BMW X5"),
    ("bmw", "BMW"),
    ("audi", "Audi"),
    ("lexus rx", "Lexus RX350"),
    ("lexus", "Lexus"),
    ("porsche", "Porsche"),
    ("volvo", "Volvo"),
    ("range rover", "Range Rover"),
    ("kia morning", "Kia Morning"),
    ("morning", "Kia Morning"),
    ("grand i10", "Hyundai Grand i10"),
    ("hyundai i10", "Hyundai Grand i10"),
    ("i10", "Hyundai Grand i10"),
    ("vinfast fadil", "VinFast Fadil"),
    ("fadil", "VinFast Fadil"),
    ("vf3", "VinFast VF3"),
    ("vf 3", "VinFast VF3"),
    ("vf5", "VinFast VF5"),
    ("vf 5", "VinFast VF5"),
    ("wigo", "Toyota Wigo"),
    ("brio", "Honda Brio"),
    ("mazda cx-5", "Mazda CX-5"),
    ("mazda cx5", "Mazda CX-5"),
    ("cx-5", "Mazda CX-5"),
    ("cx5", "Mazda CX-5"),
    ("cx-8", "Mazda CX-8"),
    ("cx8", "Mazda CX-8"),
    ("honda cr-v", "Honda CR-V"),
    ("cr-v", "Honda CR-V"),
    ("crv", "Honda CR-V"),
    ("hr-v", "Honda HR-V"),
    ("toyota camry", "Toyota Camry"),
    ("camry", "Toyota Camry"),
    ("corolla cross", "Toyota Corolla Cross"),
    ("fortuner", "Toyota Fortuner"),
    ("innova", "Toyota Innova"),
    ("santafe", "Hyundai SantaFe"),
    ("santa fe", "Hyundai SantaFe"),
    ("tucson", "Hyundai Tucson"),
    ("creta", "Hyundai Creta"),
    ("sorento", "Kia Sorento"),
    ("seltos", "Kia Seltos"),
    ("carnival", "Kia Carnival"),
    ("ford ranger", "Ford Ranger"),
    ("ranger", "Ford Ranger"),
    ("everest", "Ford Everest"),
    ("territory", "Ford Territory"),
    ("vf8", "VinFast VF8"),
    ("vf 8", "VinFast VF8"),
    ("vf9", "VinFast VF9"),
    ("vf 9", "VinFast VF9"),
    ("vf6", "VinFast VF6"),
    ("vf7", "VinFast VF7"),
    ("toyota vios", "Toyota Vios"),
    ("vios", "Toyota Vios"),
    ("honda city", "Honda City"),
    ("honda civic", "Honda Civic"),
    ("civic", "Honda Civic"),
    ("hyundai accent", "Hyundai Accent"),
    ("accent", "Hyundai Accent"),
    ("elantra", "Hyundai Elantra"),
    ("mazda 3", "Mazda 3"),
    ("mazda3", "Mazda 3"),
    ("xpander", "Mitsubishi Xpander"),
    ("xforce", "Mitsubishi Xforce"),
    ("toyota", "Toyota"),
    ("honda", "Honda"),
    ("mazda", "Mazda"),
    ("hyundai", "Hyundai"),
    ("kia", "Kia"),
    ("vinfast", "VinFast"),
    ("ford", "Ford"),
    ("mitsubishi", "Mitsubishi"),
]


def extract_vehicle_brand_from_text(text: str | None) -> str | None:
    """Trích xuất tên dòng xe từ nội dung tin nhắn của người dùng (nếu có)."""
    if not text:
        return None
    lower = f" {text.lower()} "
    for kw, canonical in KNOWN_VEHICLE_PATTERNS:
        if kw in lower:
            return canonical
    return None


def _fmt_vnd(amount: int | float) -> str:
    return f"{int(amount):,}".replace(",", ".") + " VNĐ"


def _is_valid_http_url(url: str | None) -> bool:
    if not url:
        return False
    u = url.strip().lower()
    if not (u.startswith("http://") or u.startswith("https://")):
        return False
    fake_domains = ("example.com", "placeholder", "attached_image", "localhost/image", "your-image")
    return not any(fd in u for fd in fake_domains)


def _is_valid_b64(b64: str | None) -> bool:
    if not b64:
        return False
    clean = b64.strip()
    if "," in clean and clean.startswith("data:"):
        clean = clean.split(",", 1)[1].strip()
    return len(clean) >= 128 and " " not in clean[:64]


def format_damage_report_text(data: dict[str, Any]) -> str:
    """Format DetectionResponse JSON into a comprehensive Vietnamese assessment with cm2 area & vehicle pricing."""
    summary = data.get("summary", "Không có kết quả")
    overall = data.get("overall_severity", "unknown")
    damages = data.get("damages", [])
    num = data.get("num_detections", 0)
    ms = data.get("processing_time_ms", 0)
    img_w = data.get("image_width", 0)
    img_h = data.get("image_height", 0)

    vehicle_info = data.get("vehicle_info", "Xe phổ thông (Mặc định)")
    segment_label_vi = data.get("segment_label_vi", "Sedan / Hatchback phổ thông (Hệ số 1.0x)")
    price_multiplier = data.get("price_multiplier", 1.0)

    total_area_ratio = data.get("total_area_ratio", 0.0)
    total_mask_px = data.get("total_mask_area_px", 0)
    total_area_cm2 = data.get("total_estimated_area_cm2", 0.0)
    subtotal_est = data.get("subtotal_cost_vnd", 0)
    combo_discount = data.get("combo_discount_vnd", 0)
    combo_note = data.get("combo_discount_note", "")
    total_est = data.get("total_estimated_cost_vnd", 0)
    total_min = data.get("total_min_cost_vnd", 0)
    total_max = data.get("total_max_cost_vnd", 0)
    recommended_items = data.get("recommended_items", [])
    overall_assessment = data.get("overall_assessment", "")

    if not damages:
        return (
            f"✅ **Kết quả phân tích ảnh xe ({vehicle_info})**: Không phát hiện vùng hư hỏng nào trên xe.\n"
            "- Diện tích hư hỏng: **0 cm² (0.00% | 0 px)**\n"
            "- Chi phí sửa chữa dự kiến: **0 VNĐ**\n"
            f"- Thời gian xử lý AI: {ms:.0f}ms"
        )

    severity_vi = {
        "low": "Nhẹ (LOW)",
        "medium": "Trung bình (MEDIUM)",
        "high": "Nặng (HIGH)",
        "critical": "Rất nghiêm trọng (CRITICAL)",
    }.get(overall, overall.upper())

    lines = [
        "🔍 **BÁO CÁO PHÂN TÍCH DIỆN TÍCH HƯ HỎNG & ĐỊNH GIÁ THEO DÒNG XE**",
        f"- **Dòng xe áp dụng**: **{vehicle_info}** — *{segment_label_vi}* (Hệ số đơn giá: **{price_multiplier:.2g}x**)",
        f"- **Mức độ hư hỏng tổng thể**: {severity_vi} ({num} vùng hư hỏng, ảnh {img_w}×{img_h} px)",
        f"- **Tổng diện tích bị hư hỏng thực tế**: **~{total_area_cm2} cm²** (Chiếm **{total_area_ratio:.2%}** ảnh | **{total_mask_px:,} pixel**)",
    ]

    if combo_discount > 0:
        lines.extend([
            f"- **Tạm tính từng vùng**: {_fmt_vnd(subtotal_est)}",
            f"- **Chiết khấu gộp Combo đồng sơn**: **-{_fmt_vnd(combo_discount)}** ({combo_note})",
        ])

    lines.extend([
        f"- **Tổng chi phí sửa chữa dự kiến**: **{_fmt_vnd(total_est)}** (Khoảng giá tham khảo: {_fmt_vnd(total_min)} – {_fmt_vnd(total_max)})",
        "",
        "### 📋 Chi tiết diện tích (cm², %, px) & Báo giá từng hạng mục:",
    ])

    for idx, d in enumerate(damages, 1):
        sev = d.get("severity", "low")
        severity_emoji = {"low": "🟡", "medium": "🟠", "high": "🔴"}.get(sev, "⚪")
        sev_label = {"low": "Nhẹ", "medium": "Trung bình", "high": "Nặng"}.get(sev, sev)
        cname = d.get("class_name", "unknown")
        label_vi = d.get("class_label_vi") or CLASS_LABELS_VI_FALLBACK.get(cname, cname)
        area_pct = d.get("area_ratio", 0.0)
        area_cm2 = d.get("estimated_area_cm2", 0.0)
        dims_str = d.get("dimensions_cm_str", "")
        bbox_pct = d.get("bbox_area_ratio", 0.0)
        mask_px = d.get("mask_area_px", 0)
        base_cost = d.get("base_cost_vnd", 0)
        est_cost = d.get("estimated_cost_vnd", 0)
        min_cost = d.get("min_cost_vnd", 0)
        max_cost = d.get("max_cost_vnd", 0)
        unit_note = d.get("unit_price_note", "")
        plan = d.get("repair_recommendation", "Kiểm tra trực tiếp tại garage để xác định phương án.")

        lines.extend([
            f"{idx}. {severity_emoji} **{label_vi}** (Độ tin cậy: {d.get('confidence', 0):.0%})",
            f"   - **Diện tích bị hư hỏng**: **~{area_cm2} cm²** ({dims_str}) | Chiếm **{area_pct:.2%}** ảnh ({mask_px:,} px) | BBox: {bbox_pct:.2%}",
            f"   - **Đánh giá mức độ**: {sev_label} (`{sev.upper()}`)",
            f"   - **Phương án khắc phục**: {plan}",
            f"   - **Cách tính giá**: {unit_note}" if unit_note else f"   - **Giá chuẩn cơ sở**: {_fmt_vnd(base_cost)}",
            f"   - **Thành tiền dự kiến**: **{_fmt_vnd(est_cost)}** (Dao động: {_fmt_vnd(min_cost)} – {_fmt_vnd(max_cost)})",
        ])

    if recommended_items:
        lines.extend(["", "### 🛠️ Gói Dịch vụ & Phụ tùng khuyến nghị trên hệ thống:"])
        for item in recommended_items:
            lines.append(
                f"- **{item.get('name')}** ({item.get('category')}) – Giá tham khảo: **{_fmt_vnd(item.get('estimated_price_vnd', 0))}** | *{item.get('reason')}*"
            )

    lines += [
        "",
        f"💰 **TỔNG GIÁ TIỀN SỬA CHỮA DỰ KIẾN ({vehicle_info})**: **{_fmt_vnd(total_est)}** (Khoảng giá: {_fmt_vnd(total_min)} – {_fmt_vnd(total_max)})",
    ]
    if overall_assessment:
        lines.append(f"📝 **Nhận định chuyên môn**: {overall_assessment}")
    else:
        lines.append(f"📝 **Tóm tắt**: {summary}")
    lines.append(f"⏱ Thời gian phân tích ONNX: {ms:.0f}ms")
    return "\n".join(lines)


async def execute_damage_detection(
    http_client: httpx.AsyncClient,
    image_url: Optional[str] = None,
    image_base64: Optional[str] = None,
    vehicle_brand: Optional[str] = None,
    vehicle_segment: Optional[str] = None,
) -> tuple[str, dict[str, Any] | None]:
    """Call damage-detection-service and return (formatted_text, raw_response_dict)."""
    base = settings.damage_service_url.rstrip("/")
    payload: dict[str, Any] = {}
    if _is_valid_b64(image_base64):
        clean_b64 = (image_base64 or "").strip()
        if "," in clean_b64 and clean_b64.startswith("data:"):
            clean_b64 = clean_b64.split(",", 1)[1].strip()
        payload["image_base64"] = clean_b64
    elif _is_valid_http_url(image_url):
        payload["image_url"] = (image_url or "").strip()
    else:
        return "Vui lòng cung cấp URL ảnh hợp lệ hoặc đính kèm file ảnh xe.", None

    if vehicle_brand:
        payload["vehicle_brand"] = vehicle_brand.strip()
    if vehicle_segment:
        payload["vehicle_segment"] = vehicle_segment.strip()

    resp = await http_client.post(
        f"{base}/api/v1/detect",
        json=payload,
        timeout=60.0,
    )
    resp.raise_for_status()
    data = resp.json()
    formatted = format_damage_report_text(data)
    return formatted, data


def make_damage_analysis_tool(
    http_client: httpx.AsyncClient,
    attached_image_url: str | None = None,
    attached_image_base64: str | None = None,
    attached_vehicle_brand: str | None = None,
    attached_vehicle_segment: str | None = None,
    damage_capture: dict[str, Any] | None = None,
):
    """Factory that closes over the shared HTTP client, attached image, vehicle info, and capture dict."""

    @tool(args_schema=AnalyzeVehicleDamageInput)
    async def analyze_vehicle_damage(
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
        vehicle_brand: Optional[str] = None,
        vehicle_segment: Optional[str] = None,
    ) -> str:
        """Analyze a vehicle image to detect damage using AI vision (YOLOv8s-seg).

        Detects and segments 6 CarDD damage types:
        dent, scratch, crack, glass shatter, lamp broken, tire flat.

        Extracts exact damaged area in cm², %, and pixels, evaluates severity (low/medium/high),
        applies vehicle brand/segment pricing multipliers (Economy 0.85x, Standard 1.0x, SUV/MPV 1.3x, Luxury 2.2x),
        calculates multi-damage combo discounts, and recommends repair services/parts.
        """
        if damage_capture is not None and "formatted_text" in damage_capture:
            return damage_capture["formatted_text"]

        eff_b64 = attached_image_base64 if _is_valid_b64(attached_image_base64) else (
            image_base64 if _is_valid_b64(image_base64) else None
        )
        eff_url = attached_image_url if _is_valid_http_url(attached_image_url) else (
            image_url if _is_valid_http_url(image_url) else None
        )
        eff_brand = attached_vehicle_brand or vehicle_brand
        eff_seg = attached_vehicle_segment or vehicle_segment

        if not eff_b64 and not eff_url:
            return "Vui lòng đính kèm ảnh xe hoặc cung cấp đường dẫn URL ảnh hợp lệ để phân tích."

        try:
            formatted, data = await execute_damage_detection(
                http_client,
                image_url=eff_url,
                image_base64=eff_b64,
                vehicle_brand=eff_brand,
                vehicle_segment=eff_seg,
            )
            if damage_capture is not None and data is not None:
                damage_capture["report"] = data
                damage_capture["formatted_text"] = formatted
            return formatted

        except httpx.HTTPStatusError as exc:
            logger.error("analyze_vehicle_damage HTTP error: %s", exc)
            return f"Lỗi phân tích: HTTP {exc.response.status_code}"
        except Exception as exc:
            logger.exception("analyze_vehicle_damage failed")
            return f"Không thể phân tích ảnh: {exc}"

    return analyze_vehicle_damage
