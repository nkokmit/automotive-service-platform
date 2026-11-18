"""YOLOv8s-seg ONNX Runtime inference engine with true pixel/cm2 segmentation & vehicle-aware pricing."""
from __future__ import annotations
import ast
import base64
import logging
import math
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import onnxruntime as ort

from app.config import get_settings
from app.schemas import DamageRegion, RecommendedItem

logger = logging.getLogger(__name__)
settings = get_settings()

# Khung hình tham chiếu tiêu chuẩn khi chụp hư hỏng ở khoảng cách 1.0 - 1.5m: ~ 120cm × 80cm = 9.600 cm²
REFERENCE_FRAME_WIDTH_CM = 120.0
REFERENCE_FRAME_HEIGHT_CM = 80.0
REFERENCE_FRAME_AREA_CM2 = REFERENCE_FRAME_WIDTH_CM * REFERENCE_FRAME_HEIGHT_CM  # 9600 cm²

# Bảng màu BGR trực quan cho từng loại hư hỏng trên xe
CLASS_COLORS_BGR: dict[str, tuple[int, int, int]] = {
    "dent": (0, 165, 255),          # Cam (Vết móp)
    "scratch": (0, 255, 255),       # Vàng (Vết xước)
    "crack": (255, 0, 255),         # Tím hồng (Vết nứt)
    "glass shatter": (255, 255, 0), # Xanh lơ (Vỡ kính)
    "lamp broken": (255, 100, 50),  # Xanh dương sáng (Vỡ đèn)
    "tire flat": (40, 40, 255),     # Đỏ (Xẹp lốp)
}

CLASS_LABELS_VI: dict[str, str] = {
    "dent": "Móp méo thân vỏ (Dent)",
    "scratch": "Trầy xước sơn (Scratch)",
    "crack": "Nứt vỡ thân vỏ / cản (Crack)",
    "glass shatter": "Nứt / Vỡ kính xe (Glass Shatter)",
    "lamp broken": "Vỡ / Hư hỏng cụm đèn (Lamp Broken)",
    "tire flat": "Xẹp lốp / Hư hỏng lốp (Tire Flat)",
}

# ── Cấu hình Phân khúc dòng xe & Hệ số nhân đơn giá vật tư / phụ tùng ──────────
VEHICLE_SEGMENTS: dict[str, tuple[str, float]] = {
    "economy": ("Xe cỡ nhỏ Hạng A (Hệ số 0.85x)", 0.85),
    "standard": ("Sedan / Hatchback phổ thông Hạng B–C (Hệ số 1.0x)", 1.00),
    "suv_mpv": ("SUV / CUV / Bán tải & Sedan Hạng D (Hệ số 1.3x)", 1.30),
    "luxury": ("Xe sang / Cao cấp (Hệ số 2.2x)", 2.20),
}

# Từ khóa nhận diện dòng xe sang phân khúc tương ứng
SEGMENT_KEYWORDS: list[tuple[str, str, str]] = [
    # Luxury (2.2x)
    ("mercedes", "luxury", "Mercedes-Benz"),
    ("mec", "luxury", "Mercedes-Benz"),
    ("c200", "luxury", "Mercedes C200"),
    ("c300", "luxury", "Mercedes C300"),
    ("e200", "luxury", "Mercedes E200"),
    ("e300", "luxury", "Mercedes E300"),
    ("glc", "luxury", "Mercedes GLC"),
    ("gle", "luxury", "Mercedes GLE"),
    ("gls", "luxury", "Mercedes GLS"),
    ("s450", "luxury", "Mercedes S450"),
    ("maybach", "luxury", "Mercedes-Maybach"),
    ("bmw", "luxury", "BMW"),
    ("320i", "luxury", "BMW 320i"),
    ("330i", "luxury", "BMW 330i"),
    ("520i", "luxury", "BMW 520i"),
    ("530i", "luxury", "BMW 530i"),
    ("730li", "luxury", "BMW 730Li"),
    ("x3", "luxury", "BMW X3"),
    ("x5", "luxury", "BMW X5"),
    ("x7", "luxury", "BMW X7"),
    ("audi", "luxury", "Audi"),
    ("lexus", "luxury", "Lexus"),
    ("rx350", "luxury", "Lexus RX350"),
    ("es250", "luxury", "Lexus ES250"),
    ("lx570", "luxury", "Lexus LX570"),
    ("lx600", "luxury", "Lexus LX600"),
    ("porsche", "luxury", "Porsche"),
    ("macan", "luxury", "Porsche Macan"),
    ("cayenne", "luxury", "Porsche Cayenne"),
    ("panamera", "luxury", "Porsche Panamera"),
    ("volvo", "luxury", "Volvo"),
    ("xc60", "luxury", "Volvo XC60"),
    ("xc90", "luxury", "Volvo XC90"),
    ("range rover", "luxury", "Range Rover"),
    ("land rover", "luxury", "Land Rover"),
    ("defender", "luxury", "Land Rover Defender"),
    ("mini cooper", "luxury", "Mini Cooper"),
    # Economy / Hạng A (0.85x)
    ("morning", "economy", "Kia Morning"),
    ("grand i10", "economy", "Hyundai Grand i10"),
    ("i10", "economy", "Hyundai Grand i10"),
    ("fadil", "economy", "VinFast Fadil"),
    ("vf3", "economy", "VinFast VF3"),
    ("vf 3", "economy", "VinFast VF3"),
    ("vf5", "economy", "VinFast VF5"),
    ("vf 5", "economy", "VinFast VF5"),
    ("wigo", "economy", "Toyota Wigo"),
    ("brio", "economy", "Honda Brio"),
    ("celerio", "economy", "Suzuki Celerio"),
    ("attrage", "economy", "Mitsubishi Attrage"),
    ("soluto", "economy", "Kia Soluto"),
    # SUV / CUV / MPV lớn / Bán tải / D-Sedan (1.3x)
    ("cx-5", "suv_mpv", "Mazda CX-5"),
    ("cx5", "suv_mpv", "Mazda CX-5"),
    ("cx-8", "suv_mpv", "Mazda CX-8"),
    ("cx8", "suv_mpv", "Mazda CX-8"),
    ("cx-30", "suv_mpv", "Mazda CX-30"),
    ("cr-v", "suv_mpv", "Honda CR-V"),
    ("crv", "suv_mpv", "Honda CR-V"),
    ("hr-v", "suv_mpv", "Honda HR-V"),
    ("hrv", "suv_mpv", "Honda HR-V"),
    ("accord", "suv_mpv", "Honda Accord"),
    ("camry", "suv_mpv", "Toyota Camry"),
    ("corolla cross", "suv_mpv", "Toyota Corolla Cross"),
    ("yaris cross", "suv_mpv", "Toyota Yaris Cross"),
    ("fortuner", "suv_mpv", "Toyota Fortuner"),
    ("innova", "suv_mpv", "Toyota Innova Cross"),
    ("veloz", "suv_mpv", "Toyota Veloz Cross"),
    ("hilux", "suv_mpv", "Toyota Hilux"),
    ("land cruiser", "suv_mpv", "Toyota Land Cruiser"),
    ("tucson", "suv_mpv", "Hyundai Tucson"),
    ("santafe", "suv_mpv", "Hyundai SantaFe"),
    ("santa fe", "suv_mpv", "Hyundai SantaFe"),
    ("creta", "suv_mpv", "Hyundai Creta"),
    ("palisade", "suv_mpv", "Hyundai Palisade"),
    ("custin", "suv_mpv", "Hyundai Custin"),
    ("sorento", "suv_mpv", "Kia Sorento"),
    ("sportage", "suv_mpv", "Kia Sportage"),
    ("seltos", "suv_mpv", "Kia Seltos"),
    ("carnival", "suv_mpv", "Kia Carnival"),
    ("ranger", "suv_mpv", "Ford Ranger"),
    ("everest", "suv_mpv", "Ford Everest"),
    ("territory", "suv_mpv", "Ford Territory"),
    ("explorer", "suv_mpv", "Ford Explorer"),
    ("vf8", "suv_mpv", "VinFast VF8"),
    ("vf 8", "suv_mpv", "VinFast VF8"),
    ("vf9", "suv_mpv", "VinFast VF9"),
    ("vf 9", "suv_mpv", "VinFast VF9"),
    ("vf7", "suv_mpv", "VinFast VF7"),
    ("vf 7", "suv_mpv", "VinFast VF7"),
    ("vf6", "suv_mpv", "VinFast VF6"),
    ("vf 6", "suv_mpv", "VinFast VF6"),
    ("lux a", "suv_mpv", "VinFast Lux A2.0"),
    ("lux sa", "suv_mpv", "VinFast Lux SA2.0"),
    ("outlander", "suv_mpv", "Mitsubishi Outlander"),
    ("pajero", "suv_mpv", "Mitsubishi Pajero Sport"),
    ("xforce", "suv_mpv", "Mitsubishi Xforce"),
    ("triton", "suv_mpv", "Mitsubishi Triton"),
    ("forester", "suv_mpv", "Subaru Forester"),
    ("peugeot", "suv_mpv", "Peugeot 3008/5008"),
    # Standard Hạng B/C (1.0x)
    ("vios", "standard", "Toyota Vios"),
    ("altis", "standard", "Toyota Corolla Altis"),
    ("yaris", "standard", "Toyota Yaris"),
    ("city", "standard", "Honda City"),
    ("civic", "standard", "Honda Civic"),
    ("accent", "standard", "Hyundai Accent"),
    ("elantra", "standard", "Hyundai Elantra"),
    ("mazda 3", "standard", "Mazda 3"),
    ("mazda3", "standard", "Mazda 3"),
    ("mazda 2", "standard", "Mazda 2"),
    ("mazda2", "standard", "Mazda 2"),
    ("k3", "standard", "Kia K3"),
    ("cerato", "standard", "Kia Cerato"),
    ("xpander", "standard", "Mitsubishi Xpander"),
    ("xl7", "standard", "Suzuki XL7"),
    ("ertiga", "standard", "Suzuki Ertiga"),
    ("mg5", "standard", "MG5"),
    ("almera", "standard", "Nissan Almera"),
    ("toyota", "standard", "Toyota (Phổ thông)"),
    ("honda", "standard", "Honda (Phổ thông)"),
    ("hyundai", "standard", "Hyundai (Phổ thông)"),
    ("mazda", "standard", "Mazda (Phổ thông)"),
    ("kia", "standard", "Kia (Phổ thông)"),
    ("mitsubishi", "standard", "Mitsubishi (Phổ thông)"),
    ("ford", "suv_mpv", "Ford (SUV / Bán tải)"),
    ("vinfast", "suv_mpv", "VinFast"),
]


def resolve_vehicle_segment(
    vehicle_brand: str | None = None,
    vehicle_segment: str | None = None,
) -> tuple[str, str, str, float]:
    """Xác định tên xe hiển thị, mã phân khúc, nhãn phân khúc tiếng Việt và hệ số nhân giá."""
    if vehicle_segment and vehicle_segment.strip().lower() in VEHICLE_SEGMENTS:
        seg_key = vehicle_segment.strip().lower()
        seg_label, mult = VEHICLE_SEGMENTS[seg_key]
        display = (vehicle_brand or "").strip() or seg_label.split(" (")[0]
        return display, seg_key, seg_label, mult

    if vehicle_brand and vehicle_brand.strip():
        raw = vehicle_brand.strip()
        lower = raw.lower()
        for kw, seg_key, canonical_name in SEGMENT_KEYWORDS:
            if kw in lower:
                seg_label, mult = VEHICLE_SEGMENTS[seg_key]
                display_name = raw if len(raw) <= 35 else canonical_name
                return display_name, seg_key, seg_label, mult
        # Nếu nhập tên hãng/xe khác chưa có trong từ điển, mặc định phân khúc tiêu chuẩn 1.0x
        seg_label, mult = VEHICLE_SEGMENTS["standard"]
        return raw, "standard", seg_label, mult

    seg_label, mult = VEHICLE_SEGMENTS["standard"]
    return "Xe phổ thông (Mặc định)", "standard", seg_label, mult


# Bảng định mức chi phí sửa chữa cơ sở (VNĐ) theo từng loại hư hỏng và mức độ diện tích (cho xe chuẩn 1.0x)
DAMAGE_PRICING_RULES: dict[str, dict[str, tuple[int, int, str]]] = {
    "scratch": {
        "low": (
            350_000,
            800_000,
            "Trầy xước bề mặt diện tích nhỏ: Đánh bóng xóa xước 3 bước hoặc chấm dặm sơn cục bộ.",
        ),
        "medium": (
            800_000,
            1_800_000,
            "Trầy xước phạm vào lớp sơn lót diện tích vừa: Xử lý bề mặt, bả matit mỏng và sơn dặm 1 phần chi tiết.",
        ),
        "high": (
            1_800_000,
            4_200_000,
            "Trầy xước sâu trên diện tích rộng: Xả nhám, sơn lót chống gỉ và sơn lại toàn bộ chi tiết thân vỏ.",
        ),
    },
    "dent": {
        "low": (
            500_000,
            1_200_000,
            "Móp nhẹ diện tích nhỏ: Nắn hút vết lõm không sơn (PDR) hoặc gò nhẹ phục hồi.",
        ),
        "medium": (
            1_200_000,
            2_800_000,
            "Móp méo diện tích trung bình: Gò nắn phục hồi phom thân vỏ kết hợp bả matit và sơn lại chi tiết.",
        ),
        "high": (
            2_800_000,
            6_500_000,
            "Móp biến dạng diện tích lớn: Gò nắn khung vỏ chuyên sâu bằng máy rút tôn, làm đồng và sơn nguyên mảng.",
        ),
    },
    "crack": {
        "low": (
            600_000,
            1_400_000,
            "Vết nứt nhỏ: Hàn nhiệt gia cố khe nứt, xử lý phẳng bề mặt và sơn dặm vùng hư hỏng.",
        ),
        "medium": (
            1_400_000,
            3_200_000,
            "Nứt vỡ diện tích vừa: Hàn phục hồi kết cấu nhựa/kim loại, gia cố lưới thép và sơn lại toàn bộ chi tiết.",
        ),
        "high": (
            3_200_000,
            7_500_000,
            "Nứt vỡ nghiêm trọng trên diện rộng: Khuyến nghị thay mới cản/ốp thân vỏ chính hãng và sơn đồng bộ.",
        ),
    },
    "glass shatter": {
        "low": (
            500_000,
            1_500_000,
            "Rạn/nứt kính cục bộ: Bơm keo resin chuyên dụng ép chân không phục hồi kính và đánh bóng.",
        ),
        "medium": (
            2_500_000,
            5_500_000,
            "Vỡ kính diện tích trung bình: Thay mới mặt kính (kính sườn/kính hậu/kính chắn gió) kèm keo tiêu chuẩn.",
        ),
        "high": (
            4_500_000,
            10_500_000,
            "Vỡ kính diện rộng nghiêm trọng: Thay mới toàn bộ kính an toàn nhiều lớp chính hãng + dán lại phim cách nhiệt.",
        ),
    },
    "lamp broken": {
        "low": (
            600_000,
            1_500_000,
            "Nứt nhẹ mặt đèn: Hàn phục hồi vỏ đèn, thay mặt mica hoặc đánh bóng phủ nano chống ố.",
        ),
        "medium": (
            1_500_000,
            3_800_000,
            "Vỡ mặt kính/vỏ cụm đèn: Thay mặt kính đèn pha/hậu chuyên dụng, đi lại keo chống nước tuyệt đối.",
        ),
        "high": (
            3_800_000,
            9_500_000,
            "Vỡ nát cụm đèn diện tích lớn: Thay mới nguyên cụm đèn chiếu sáng/đèn hậu chính hãng và căn chỉnh chùm sáng.",
        ),
    },
    "tire flat": {
        "low": (
            150_000,
            450_000,
            "Xẹp lốp nhẹ: Kiểm tra rò rỉ, vá nấm trong lốp tiêu chuẩn và cân bằng động bánh xe.",
        ),
        "medium": (
            450_000,
            2_200_000,
            "Xẹp lốp / hư hại thành lốp vừa: Kiểm tra la-zăng, thay van cảm biến hoặc thay lốp mới phân khúc phổ thông.",
        ),
        "high": (
            2_200_000,
            4_800_000,
            "Xẹp lốp nặng / rách hỏng lốp: Thay mới lốp chính hãng (Michelin/Bridgestone) kết hợp cân chỉnh độ chụm thước lái.",
        ),
    },
}


def _round_vnd(amount: float, step: int = 50_000) -> int:
    """Làm tròn số tiền VNĐ tới bội số gần nhất của `step` (mặc định 50.000đ)."""
    return int(round(amount / step) * step)


def _compute_physical_area_and_dims(
    area_ratio: float, bbox: list[float]
) -> tuple[float, str]:
    """Ước tính diện tích vật lý thực tế (cm²) và kích thước (rộng × cao cm) của vết hư hỏng."""
    area_cm2 = round(max(1.5, area_ratio * REFERENCE_FRAME_AREA_CM2), 1)
    bw = max(0.01, bbox[2] - bbox[0]) * REFERENCE_FRAME_WIDTH_CM
    bh = max(0.01, bbox[3] - bbox[1]) * REFERENCE_FRAME_HEIGHT_CM
    # Điều chỉnh kích thước hiệu dụng theo hệ số lấp đầy của mask bên trong bbox
    bbox_area_cm2 = max(1.0, bw * bh)
    fill_factor = min(1.0, max(0.25, math.sqrt(area_cm2 / bbox_area_cm2)))
    eff_w = max(1.0, round(bw * fill_factor, 1))
    eff_h = max(1.0, round(bh * fill_factor, 1))
    return area_cm2, f"~ {eff_w} × {eff_h} cm"


def _estimate_damage_cost_and_plan(
    class_name: str,
    area_ratio: float,
    area_cm2: float,
    severity: str,
    price_multiplier: float = 1.0,
    vehicle_display: str = "Xe phổ thông",
) -> tuple[str, int, int, int, int, str, str]:
    """Tính giá sửa chữa (VNĐ) dựa trên loại hư hỏng, diện tích thực tế (cm² & %) và hệ số dòng xe."""
    label_vi = CLASS_LABELS_VI.get(class_name, class_name)
    class_rules = DAMAGE_PRICING_RULES.get(class_name, DAMAGE_PRICING_RULES["scratch"])
    base_min, base_max, plan = class_rules.get(severity, class_rules["medium"])

    # Nội suy tuyến tính chi phí cơ sở theo tỷ lệ diện tích thực tế (area_ratio)
    if severity == "low":
        progress = min(1.0, max(0.0, area_ratio / 0.015))
    elif severity == "medium":
        progress = min(1.0, max(0.0, (area_ratio - 0.015) / (0.05 - 0.015)))
    else:
        progress = min(1.0, max(0.0, (area_ratio - 0.05) / (0.25 - 0.05)))

    raw_base = base_min + progress * (base_max - base_min)
    base_cost = _round_vnd(raw_base, 50_000)
    base_cost = max(base_min, min(base_max, base_cost))

    # Nhân hệ số phân khúc dòng xe (price_multiplier)
    adj_min = _round_vnd(base_min * price_multiplier, 50_000)
    adj_max = _round_vnd(base_max * price_multiplier, 50_000)
    estimated_cost = _round_vnd(raw_base * price_multiplier, 50_000)
    estimated_cost = max(adj_min, min(adj_max, estimated_cost))

    base_fmt = f"{base_cost:,.0f}".replace(",", ".")
    if abs(price_multiplier - 1.0) > 0.01:
        unit_note = (
            f"Diện tích ~{area_cm2} cm² ({area_ratio:.2%} ảnh) → Giá chuẩn {base_fmt}đ "
            f"× hệ số {price_multiplier:.2g}x ({vehicle_display})"
        )
    else:
        unit_note = (
            f"Diện tích ~{area_cm2} cm² ({area_ratio:.2%} ảnh) × định mức {label_vi.split(' (')[0]} "
            f"mức {severity.upper()} ({vehicle_display})"
        )

    return label_vi, base_cost, estimated_cost, adj_min, adj_max, unit_note, plan


def _build_recommended_items(
    damages: list[DamageRegion], price_multiplier: float
) -> list[RecommendedItem]:
    """Gợi ý các gói dịch vụ sửa chữa và phụ tùng thay thế trên sàn tương ứng với hư hỏng."""
    seen: set[str] = set()
    items: list[RecommendedItem] = []

    for d in damages:
        cname = d.class_name
        if cname in ("scratch", "dent", "crack") and "sv_dong_son" not in seen:
            seen.add("sv_dong_son")
            items.append(
                RecommendedItem(
                    id="sv3",
                    name="Dịch vụ Đồng sơn & Phục hồi thân vỏ chính hãng",
                    item_type="service",
                    category="Sơn & thân vỏ",
                    estimated_price_vnd=_round_vnd(2_500_000 * price_multiplier, 50_000),
                    link="/services?category=S%C6%A1n%20%26%20th%C3%A2n%20v%E1%BB%8F",
                    reason="Khắc phục triệt để vết trầy xước, móp méo, nứt cản trong phòng sơn tiêu chuẩn.",
                )
            )
        if cname == "tire flat" and "pt_lop" not in seen:
            seen.add("pt_lop")
            items.append(
                RecommendedItem(
                    id="pt1",
                    name="Lốp Michelin Primacy 4 chính hãng + Cân bằng động",
                    item_type="part",
                    category="Lốp xe",
                    estimated_price_vnd=_round_vnd(2_450_000 * price_multiplier, 50_000),
                    link="/parts",
                    reason="Thay thế lốp bị xẹp nặng / rách thành lốp đảm bảo an toàn vận hành.",
                )
            )
        if cname == "lamp broken" and "pt_den" not in seen:
            seen.add("pt_den")
            items.append(
                RecommendedItem(
                    id="pt_lamp",
                    name="Phục hồi mặt kính / Thay cụm đèn pha-hậu LED chính hãng",
                    item_type="part",
                    category="Đèn / Pha",
                    estimated_price_vnd=_round_vnd(2_200_000 * price_multiplier, 50_000),
                    link="/parts",
                    reason="Đảm bảo độ sáng tiêu chuẩn và chống hấp hơi nước tuyệt đối cho cụm đèn.",
                )
            )
        if cname == "glass shatter" and "sv_kinh" not in seen:
            seen.add("sv_kinh")
            items.append(
                RecommendedItem(
                    id="sv_glass",
                    name="Hàn kính chân không / Thay kính chắn gió an toàn nhiều lớp",
                    item_type="service",
                    category="Sửa chữa",
                    estimated_price_vnd=_round_vnd(3_200_000 * price_multiplier, 50_000),
                    link="/services?category=S%E1%BB%ADa%20ch%E1%BB%AFa",
                    reason="Xử lý nứt vỡ kính xe an toàn, cách âm và chịu lực theo chuẩn nhà sản xuất.",
                )
            )

    return items


def _compute_severity(area_ratio: float) -> str:
    """Tính mức độ nghiêm trọng dựa trên tỷ lệ diện tích pixel thực của mask hư hỏng."""
    if area_ratio < 0.015:
        return "low"
    elif area_ratio < 0.05:
        return "medium"
    else:
        return "high"


def _compute_overall_severity(damages: list[DamageRegion]) -> str:
    if not damages:
        return "none"
    total_area = sum(d.area_ratio for d in damages)
    high_count = sum(1 for d in damages if d.severity == "high")
    if high_count >= 3 or total_area > 0.25:
        return "critical"
    elif high_count >= 1 or total_area > 0.06:
        return "high"
    elif total_area > 0.02:
        return "medium"
    else:
        return "low"


def build_detection_summary_and_totals(
    damages: list[DamageRegion],
    overall_severity: str,
    vehicle_brand: str | None = None,
    vehicle_segment: str | None = None,
) -> dict[str, Any]:
    """Tổng hợp diện tích hư hỏng (%, px, cm²), hệ số dòng xe, chiết khấu combo và tổng chi phí."""
    veh_display, seg_key, seg_label, multiplier = resolve_vehicle_segment(
        vehicle_brand, vehicle_segment
    )

    if not damages:
        return {
            "vehicle_info": veh_display,
            "vehicle_segment": seg_key,
            "segment_label_vi": seg_label,
            "price_multiplier": multiplier,
            "total_area_ratio": 0.0,
            "total_mask_area_px": 0,
            "total_estimated_area_cm2": 0.0,
            "subtotal_cost_vnd": 0,
            "combo_discount_vnd": 0,
            "combo_discount_note": "",
            "total_estimated_cost_vnd": 0,
            "total_min_cost_vnd": 0,
            "total_max_cost_vnd": 0,
            "recommended_items": [],
            "summary": f"[{veh_display}] Không phát hiện hư hỏng trên xe.",
            "overall_assessment": (
                f"Hệ thống AI không phát hiện vết trầy xước, móp méo hay hư hỏng ngoại thất nào trên ảnh "
                f"đối với dòng xe {veh_display}. Chi phí sửa chữa dự kiến: 0 VNĐ."
            ),
        }

    total_area_ratio = round(float(sum(d.area_ratio for d in damages)), 4)
    total_mask_px = int(sum(d.mask_area_px for d in damages))
    total_area_cm2 = round(float(sum(d.estimated_area_cm2 for d in damages)), 1)
    subtotal_est = int(sum(d.estimated_cost_vnd for d in damages))
    total_min = int(sum(d.min_cost_vnd for d in damages))
    total_max = int(sum(d.max_cost_vnd for d in damages))

    # Tính chiết khấu Combo khi sửa gộp từ 2 vùng hư hỏng trở lên
    combo_discount = 0
    combo_note = ""
    if len(damages) >= 3:
        combo_discount = _round_vnd(subtotal_est * 0.15, 50_000)
        combo_note = (
            f"Giảm 15% (-{combo_discount:,.0f} VNĐ) chiết khấu combo khi làm đồng sơn / "
            f"sửa gộp {len(damages)} vùng hư hỏng cùng lúc.".replace(",", ".")
        )
    elif len(damages) == 2:
        combo_discount = _round_vnd(subtotal_est * 0.10, 50_000)
        combo_note = (
            f"Giảm 10% (-{combo_discount:,.0f} VNĐ) chiết khấu combo khi xử lý gộp "
            f"2 vùng hư hỏng trong cùng 1 lần vào phòng sơn/xưởng.".replace(",", ".")
        )

    final_est = max(0, subtotal_est - combo_discount)
    final_min = max(0, total_min - combo_discount)

    severity_vi_map = {
        "low": "Nhẹ (LOW)",
        "medium": "Trung bình (MEDIUM)",
        "high": "Nặng (HIGH)",
        "critical": "Rất nghiêm trọng (CRITICAL)",
    }
    sev_vi = severity_vi_map.get(overall_severity, overall_severity.upper())

    parts = [
        f"{d.class_label_vi or d.class_name} (diện tích: ~{d.estimated_area_cm2} cm² [{d.area_ratio:.2%}, {d.mask_area_px:,} px], "
        f"giá: {d.estimated_cost_vnd:,.0f} VNĐ)".replace(",", ".")
        for d in damages
    ]
    est_fmt = f"{final_est:,.0f}".replace(",", ".")
    min_fmt = f"{final_min:,.0f}".replace(",", ".")
    max_fmt = f"{total_max:,.0f}".replace(",", ".")

    summary = (
        f"[{veh_display} · Hệ số {multiplier:.2g}x] Phát hiện {len(damages)} vùng hư hỏng "
        f"(Tổng diện tích: ~{total_area_cm2} cm² | {total_area_ratio:.2%} ảnh | {total_mask_px:,} px). "
        f"Mức độ: {sev_vi}. Tổng chi phí dự kiến: {est_fmt} VNĐ ({min_fmt} – {max_fmt} VNĐ)."
    )
    overall_assessment = (
        f"Đánh giá cho dòng xe **{veh_display}** ({seg_label}): Qua phân tích phân đoạn pixel (YOLOv8-seg), "
        f"phát hiện {len(damages)} vùng hư hỏng gồm: {'; '.join(parts)}. "
        f"Tổng diện tích vùng bị tổn hại ước tính khoảng **{total_area_cm2} cm²** "
        f"(chiếm {total_area_ratio:.2%} khung hình, tương đương {total_mask_px:,} pixel), mức độ **{sev_vi}**. "
        + (f"{combo_note} " if combo_note else "")
        + f"Tổng kinh phí sửa chữa sau khi áp dụng hệ số dòng xe ({multiplier:.2g}x) là **{est_fmt} VNĐ** "
        f"(dao động từ {min_fmt} đến {max_fmt} VNĐ)."
    )

    recommended = _build_recommended_items(damages, multiplier)

    return {
        "vehicle_info": veh_display,
        "vehicle_segment": seg_key,
        "segment_label_vi": seg_label,
        "price_multiplier": multiplier,
        "total_area_ratio": total_area_ratio,
        "total_mask_area_px": total_mask_px,
        "total_estimated_area_cm2": total_area_cm2,
        "subtotal_cost_vnd": subtotal_est,
        "combo_discount_vnd": combo_discount,
        "combo_discount_note": combo_note,
        "total_estimated_cost_vnd": final_est,
        "total_min_cost_vnd": final_min,
        "total_max_cost_vnd": total_max,
        "recommended_items": recommended,
        "summary": summary,
        "overall_assessment": overall_assessment,
    }


def _xywh2xyxy(boxes: np.ndarray) -> np.ndarray:
    """Convert [cx, cy, w, h] to [x1, y1, x2, y2]."""
    out = np.empty_like(boxes)
    out[:, 0] = boxes[:, 0] - boxes[:, 2] / 2
    out[:, 1] = boxes[:, 1] - boxes[:, 3] / 2
    out[:, 2] = boxes[:, 0] + boxes[:, 2] / 2
    out[:, 3] = boxes[:, 1] + boxes[:, 3] / 2
    return out


def _nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float) -> list[int]:
    """Pure numpy NMS."""
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = (x2 - x1) * (y2 - y1)
    order = scores.argsort()[::-1]
    keep = []
    while order.size:
        i = order[0]
        keep.append(int(i))
        xx1 = np.maximum(x1[i], x1[order[1:]])
        yy1 = np.maximum(y1[i], y1[order[1:]])
        xx2 = np.minimum(x2[i], x2[order[1:]])
        yy2 = np.minimum(y2[i], y2[order[1:]])
        inter = np.maximum(0.0, xx2 - xx1) * np.maximum(0.0, yy2 - yy1)
        iou = inter / (areas[i] + areas[order[1:]] - inter + 1e-7)
        order = order[np.where(iou <= iou_threshold)[0] + 1]
    return keep


def _sigmoid(x: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(x, -50.0, 50.0)))


class YoloOnnxDetector:
    """Wraps a YOLOv8-seg ONNX model for vehicle damage detection & instance segmentation."""

    def __init__(self, model_path: str | Path | None = None) -> None:
        target_path = Path(model_path or settings.onnx_model_path)
        if not target_path.exists():
            candidates = [
                Path(__file__).resolve().parent.parent / "models" / "yolov8s-seg.onnx",
                Path(__file__).resolve().parent.parent / "models" / "yolov8m-seg.onnx",
                Path("/models/yolov8s-seg.onnx"),
            ]
            for c in candidates:
                if c.exists():
                    target_path = c
                    break

        path_str = str(target_path)
        providers = ["CUDAExecutionProvider", "CPUExecutionProvider"]
        self.session = ort.InferenceSession(path_str, providers=providers)
        self.input_name = self.session.get_inputs()[0].name

        meta = self.session.get_modelmeta().custom_metadata_map
        if "names" in meta:
            try:
                names_dict = ast.literal_eval(meta["names"])
                self.classes = [names_dict[i] for i in sorted(names_dict.keys())]
            except Exception:
                self.classes = settings.damage_classes
        else:
            self.classes = settings.damage_classes

        input_shape = self.session.get_inputs()[0].shape
        if len(input_shape) >= 4 and isinstance(input_shape[2], int):
            self.input_size = input_shape[2]
        elif "imgsz" in meta:
            try:
                imgsz_val = ast.literal_eval(meta["imgsz"])
                self.input_size = imgsz_val[0] if isinstance(imgsz_val, list) else int(imgsz_val)
            except Exception:
                self.input_size = settings.input_size
        else:
            self.input_size = settings.input_size

        logger.info(
            "YOLO-seg ONNX loaded from %s (classes=%s, input_size=%d)",
            path_str, self.classes, self.input_size
        )

    def _preprocess(self, bgr: np.ndarray) -> tuple[np.ndarray, float, tuple[int, int], tuple[int, int]]:
        """Letterbox resize + normalization."""
        h, w = bgr.shape[:2]
        scale = min(self.input_size / h, self.input_size / w)
        new_h, new_w = int(round(h * scale)), int(round(w * scale))
        resized = cv2.resize(bgr, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        pad_h = self.input_size - new_h
        pad_w = self.input_size - new_w
        top, left = pad_h // 2, pad_w // 2
        padded = cv2.copyMakeBorder(
            resized, top, pad_h - top, left, pad_w - left,
            cv2.BORDER_CONSTANT, value=(114, 114, 114)
        )
        rgb = cv2.cvtColor(padded, cv2.COLOR_BGR2RGB)
        tensor = rgb.astype(np.float32) / 255.0
        tensor = np.transpose(tensor, (2, 0, 1))[np.newaxis]  # NCHW
        return tensor, scale, (top, left), (new_h, new_w)

    def _decode_single_mask(
        self,
        mask_coeff: np.ndarray,
        proto: np.ndarray,
        box_in: np.ndarray,
        pad_top: int,
        pad_left: int,
        new_h: int,
        new_w: int,
        orig_h: int,
        orig_w: int,
    ) -> np.ndarray:
        """Giải mã mask phân đoạn (Instance Segmentation Mask) từ 32 hệ số mask và prototype tensor [32, 160, 160]."""
        _, mh, mw = proto.shape
        logits = np.tensordot(mask_coeff, proto, axes=([0], [0]))
        prob = _sigmoid(logits)

        scale_x = mw / float(self.input_size)
        scale_y = mh / float(self.input_size)
        mx1 = max(0, int(np.floor(box_in[0] * scale_x)))
        my1 = max(0, int(np.floor(box_in[1] * scale_y)))
        mx2 = min(mw, int(np.ceil(box_in[2] * scale_x)))
        my2 = min(mh, int(np.ceil(box_in[3] * scale_y)))

        cropped_prob = np.zeros_like(prob, dtype=np.float32)
        if mx2 > mx1 and my2 > my1:
            cropped_prob[my1:my2, mx1:mx2] = prob[my1:my2, mx1:mx2]

        mask_input = cv2.resize(cropped_prob, (self.input_size, self.input_size), interpolation=cv2.INTER_LINEAR)
        mask_unpadded = mask_input[pad_top : pad_top + new_h, pad_left : pad_left + new_w]

        if mask_unpadded.size == 0:
            return np.zeros((orig_h, orig_w), dtype=bool)
        mask_orig = cv2.resize(mask_unpadded, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
        return mask_orig > 0.5

    def detect_with_masks(
        self,
        bgr: np.ndarray,
        conf_threshold: float | None = None,
        vehicle_brand: str | None = None,
        vehicle_segment: str | None = None,
    ) -> tuple[list[DamageRegion], list[np.ndarray]]:
        """Chạy inference trả về danh sách vùng hư hỏng (với diện tích mask, cm² & giá theo dòng xe) kèm binary_mask."""
        conf = conf_threshold or settings.conf_threshold
        veh_display, _, _, price_multiplier = resolve_vehicle_segment(
            vehicle_brand, vehicle_segment
        )

        h, w = bgr.shape[:2]
        total_image_px = float(h * w)
        tensor, scale, (pad_top, pad_left), (new_h, new_w) = self._preprocess(bgr)

        outputs = self.session.run(None, {self.input_name: tensor})
        pred = outputs[0][0].T  # [8400, 4 + num_classes + 32]
        proto = outputs[1][0] if len(outputs) > 1 else None

        num_classes = len(self.classes)
        boxes_raw = pred[:, :4]  # cx, cy, w, h
        class_scores = pred[:, 4 : 4 + num_classes]
        mask_coeffs = pred[:, 4 + num_classes :] if proto is not None else None

        class_ids = class_scores.argmax(axis=1)
        confidences = class_scores.max(axis=1)

        valid = confidences >= conf
        boxes_raw = boxes_raw[valid]
        confidences = confidences[valid]
        class_ids = class_ids[valid]
        if mask_coeffs is not None:
            mask_coeffs = mask_coeffs[valid]

        if len(boxes_raw) == 0:
            return [], []

        boxes_xyxy = _xywh2xyxy(boxes_raw)

        keep = _nms(boxes_xyxy, confidences, settings.iou_threshold)
        keep = keep[: settings.max_detections]

        results: list[DamageRegion] = []
        binary_masks: list[np.ndarray] = []

        for idx in keep:
            box = boxes_xyxy[idx]
            x1 = (box[0] - pad_left) / scale
            y1 = (box[1] - pad_top) / scale
            x2 = (box[2] - pad_left) / scale
            y2 = (box[3] - pad_top) / scale

            x1n = max(0.0, min(1.0, float(x1 / w)))
            y1n = max(0.0, min(1.0, float(y1 / h)))
            x2n = max(0.0, min(1.0, float(x2 / w)))
            y2n = max(0.0, min(1.0, float(y2 / h)))
            bbox_area_ratio = (x2n - x1n) * (y2n - y1n)

            if proto is not None and mask_coeffs is not None:
                bmask = self._decode_single_mask(
                    mask_coeffs[idx],
                    proto,
                    box,
                    pad_top,
                    pad_left,
                    new_h,
                    new_w,
                    h,
                    w,
                )
                mask_area_px = int(np.count_nonzero(bmask))
                true_area_ratio = mask_area_px / total_image_px
            else:
                bmask = np.zeros((h, w), dtype=bool)
                mask_area_px = int(round(bbox_area_ratio * total_image_px))
                true_area_ratio = bbox_area_ratio

            cid = int(class_ids[idx])
            cname = self.classes[cid] if cid < len(self.classes) else f"class_{cid}"
            sev = _compute_severity(true_area_ratio)
            bbox_norm = [round(x1n, 4), round(y1n, 4), round(x2n, 4), round(y2n, 4)]
            area_cm2, dims_str = _compute_physical_area_and_dims(true_area_ratio, bbox_norm)

            (
                label_vi,
                base_cost,
                est_cost,
                min_cost,
                max_cost,
                unit_note,
                plan,
            ) = _estimate_damage_cost_and_plan(
                cname,
                true_area_ratio,
                area_cm2,
                sev,
                price_multiplier=price_multiplier,
                vehicle_display=veh_display,
            )

            results.append(
                DamageRegion(
                    class_name=cname,
                    class_label_vi=label_vi,
                    class_id=cid,
                    confidence=round(float(confidences[idx]), 4),
                    bbox=bbox_norm,
                    bbox_area_ratio=round(float(bbox_area_ratio), 4),
                    mask_area_px=mask_area_px,
                    area_ratio=round(float(true_area_ratio), 4),
                    estimated_area_cm2=area_cm2,
                    dimensions_cm_str=dims_str,
                    severity=sev,
                    base_cost_vnd=base_cost,
                    estimated_cost_vnd=est_cost,
                    min_cost_vnd=min_cost,
                    max_cost_vnd=max_cost,
                    unit_price_note=unit_note,
                    repair_recommendation=plan,
                )
            )
            binary_masks.append(bmask)

        return results, binary_masks

    def detect(
        self,
        bgr: np.ndarray,
        conf_threshold: float | None = None,
        vehicle_brand: str | None = None,
        vehicle_segment: str | None = None,
    ) -> list[DamageRegion]:
        """Run inference and return damage regions (backward-compatible API)."""
        damages, _ = self.detect_with_masks(
            bgr, conf_threshold, vehicle_brand=vehicle_brand, vehicle_segment=vehicle_segment
        )
        return damages

    def draw_annotations(
        self,
        bgr: np.ndarray,
        damages: list[DamageRegion],
        binary_masks: list[np.ndarray],
    ) -> np.ndarray:
        """Vẽ mask bán trong suốt, đường viền contour, bounding box và nhãn thông số (cm² + VNĐ) lên ảnh."""
        annotated = bgr.copy()
        h, w = annotated.shape[:2]

        for d, bmask in zip(damages, binary_masks):
            color = CLASS_COLORS_BGR.get(d.class_name, (0, 200, 255))

            if bmask is not None and np.any(bmask):
                overlay_color = np.array(color, dtype=np.float32)
                annotated[bmask] = (
                    annotated[bmask].astype(np.float32) * 0.58 + overlay_color * 0.42
                ).astype(np.uint8)

                mask_u8 = (bmask.astype(np.uint8)) * 255
                contours, _ = cv2.findContours(
                    mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
                )
                cv2.drawContours(annotated, contours, -1, color, 2, lineType=cv2.LINE_AA)

            px1 = int(round(d.bbox[0] * w))
            py1 = int(round(d.bbox[1] * h))
            px2 = int(round(d.bbox[2] * w))
            py2 = int(round(d.bbox[3] * h))
            cv2.rectangle(annotated, (px1, py1), (px2, py2), color, 2, lineType=cv2.LINE_AA)

            cost_k = f"{d.estimated_cost_vnd / 1_000_000:.2f}M" if d.estimated_cost_vnd >= 1_000_000 else f"{d.estimated_cost_vnd // 1000}k"
            label = (
                f"{d.class_name} {d.confidence:.0%} | "
                f"~{d.estimated_area_cm2:.0f}cm2 ({d.area_ratio:.1%}) | {cost_k} VND"
            )
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = max(0.48, min(0.72, w / 1250.0))
            thickness = 2
            (tw, th), baseline = cv2.getTextSize(label, font, font_scale, thickness)

            label_y1 = max(0, py1 - th - baseline - 10)
            label_y2 = label_y1 + th + baseline + 10
            label_x2 = min(w, px1 + tw + 12)

            cv2.rectangle(annotated, (px1, label_y1), (label_x2, label_y2), color, -1)
            luminance = 0.114 * color[0] + 0.587 * color[1] + 0.299 * color[2]
            text_color = (20, 20, 20) if luminance > 170 else (255, 255, 255)
            cv2.putText(
                annotated,
                label,
                (px1 + 6, label_y2 - baseline - 4),
                font,
                font_scale,
                text_color,
                thickness,
                lineType=cv2.LINE_AA,
            )

        return annotated

    def detect_and_annotate(
        self,
        bgr: np.ndarray,
        conf_threshold: float | None = None,
        vehicle_brand: str | None = None,
        vehicle_segment: str | None = None,
    ) -> tuple[list[DamageRegion], np.ndarray, str]:
        """Chạy phát hiện + phân đoạn thực tế và trả về (damages, annotated_bgr, annotated_base64)."""
        damages, binary_masks = self.detect_with_masks(
            bgr,
            conf_threshold,
            vehicle_brand=vehicle_brand,
            vehicle_segment=vehicle_segment,
        )
        annotated_bgr = self.draw_annotations(bgr, damages, binary_masks)
        ok, buf = cv2.imencode(".jpg", annotated_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        b64_str = base64.b64encode(buf.tobytes()).decode("utf-8") if ok else ""
        return damages, annotated_bgr, b64_str
