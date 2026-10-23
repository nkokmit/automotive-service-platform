"""Test True Pixel Segmentation Mask Area Calculation & Visualization with YOLOv8s-seg ONNX."""
import sys
from pathlib import Path
import cv2

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
DAMAGE_DIR = ROOT / "ai-services" / "damage-detection-service"
sys.path.insert(0, str(DAMAGE_DIR))

from app.models.yolo_onnx import YoloOnnxDetector, _compute_overall_severity

CARDD_TEST_DIR = Path(r"C:\code\vehicle-damage-detection-assessment\data\CarDD_COCO\test2017")
OUTPUT_DIR = ROOT / "outputs" / "damage_visualizations"
ARTIFACT_DIR = Path(r"C:\Users\hungmit\.gemini\antigravity\brain\92ae0591-ff07-4b91-b4cc-427be08ffe3e")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model_path = DAMAGE_DIR / "app" / "models" / "yolov8s-seg.onnx"
    detector = YoloOnnxDetector(model_path)

    # Tìm một số ảnh test trong CarDD có phát hiện hư hỏng đa dạng
    test_images = sorted(CARDD_TEST_DIR.glob("*.jpg"))[25:50] 
    saved_count = 0

    print("================================================================================")
    print("KIỂM THỬ TÍNH DIỆN TÍCH HƯ HỎNG THỰC TẾ (PIXEL MASK) & VẼ ẢNH KẾT QUẢ YOLOv8s-seg")
    print("================================================================================")

    for img_path in test_images:
        bgr = cv2.imread(str(img_path))
        if bgr is None:
            continue
        h, w = bgr.shape[:2]
        damages, annotated_bgr, b64_str = detector.detect_and_annotate(bgr, conf_threshold=0.25)
        if not damages:
            continue

        overall = _compute_overall_severity(damages)
        out_file = OUTPUT_DIR / f"annotated_{img_path.name}"
        cv2.imwrite(str(out_file), annotated_bgr)

        # Copy 3 ảnh tiêu biểu sang thư mục artifact để hiển thị
        if saved_count < 3 and ARTIFACT_DIR.exists():
            cv2.imwrite(str(ARTIFACT_DIR / f"annotated_{img_path.name}"), annotated_bgr)

        saved_count += 1
        print(f"\n[{saved_count}] Ảnh gốc: {img_path.name} ({w}x{h} = {w*h:,} px) | Mức độ tổng thể: {overall.upper()}")
        print(f"    -> Đã lưu ảnh vẽ mask & bbox tại: {out_file}")
        for d in damages:
            diff_ratio = (1.0 - d.area_ratio / max(d.bbox_area_ratio, 1e-6)) * 100
            print(
                f"    • Nhãn: {d.class_name:<14} | Conf: {d.confidence:6.2%} | "
                f"Khung BBox: {d.bbox_area_ratio:6.2%} | "
                f"Mask thực tế: {d.area_ratio:6.2%} ({d.mask_area_px:,} px - nhỏ hơn BBox {diff_ratio:.1f}%) | "
                f"Mức độ: {d.severity.upper()}"
            )

        if saved_count >= 5:
            break

    print("\n================================================================================")
    print(f"[SUCCESS] Đã xử lý và xuất {saved_count} ảnh kết quả phân đoạn tại: {OUTPUT_DIR}")
    print("================================================================================")


if __name__ == "__main__":
    main()

