"""Script to test YOLOv8 ONNX vehicle damage detection, cm2 area & vehicle segment pricing."""
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "ai-services" / "damage-detection-service"))

import cv2
from app.models.yolo_onnx import (
    YoloOnnxDetector,
    _compute_overall_severity,
    build_detection_summary_and_totals,
)


def main():
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")

    model_path = root / "ai-services" / "damage-detection-service" / "app" / "models" / "yolov8s-seg.onnx"
    test_image = Path(r"C:\code\vehicle-damage-detection-assessment\data\CarDD_COCO\test2017\000012.jpg")
    if not test_image.exists():
        test_image = root / "outputs" / "damage_visualizations" / "annotated_000012.jpg"

    detector = YoloOnnxDetector(str(model_path))
    bgr = cv2.imread(str(test_image))

    print("=" * 75)
    for brand in ["Kia Morning", "Toyota Vios", "Mazda CX-5", "Mercedes C200"]:
        damages, _, _ = detector.detect_and_annotate(bgr, conf_threshold=0.20, vehicle_brand=brand)
        overall = _compute_overall_severity(damages)
        totals = build_detection_summary_and_totals(damages, overall, vehicle_brand=brand)
        print(
            f"[{totals['vehicle_info']:15s}] Hệ số: {totals['price_multiplier']:.2f}x | "
            f"Diện tích: ~{totals['total_estimated_area_cm2']} cm² ({totals['total_area_ratio']:.2%}) | "
            f"Tổng giá: {totals['total_estimated_cost_vnd']:,} VNĐ"
        )
    print("=" * 75)


if __name__ == "__main__":
    main()
