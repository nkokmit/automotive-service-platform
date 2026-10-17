"""Script to test YOLOv8 ONNX vehicle damage detection directly on a local test image.

Usage:
    & "C:\code\vehicle-damage-detection-assessment\env\Scripts\python.exe" scripts/test-damage-model.py
"""
import sys
from pathlib import Path

# Add damage-detection-service to path
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / "ai-services" / "damage-detection-service"))

import cv2
from app.models.yolo_onnx import YoloOnnxDetector, _compute_overall_severity

def main():
    import os
    if sys.platform == "win32":
        sys.stdout.reconfigure(encoding="utf-8")
        
    model_path = root / "ai-services" / "damage-detection-service" / "app" / "models" / "yolov8s-seg.onnx"
    test_image = Path(r"C:\code\vehicle-damage-detection-assessment\data\CarDD_COCO\test2017\000012.jpg")

    print(f"[*] Model: {model_path}")
    print(f"[*] Test Image: {test_image}")
    
    if not model_path.exists():
        print(f"[!] Error: Model not found at {model_path}")
        return

    detector = YoloOnnxDetector(str(model_path))
    print(f"[+] Loaded classes: {detector.classes}")
    print(f"[+] Input size: {detector.input_size}x{detector.input_size}")

    if not test_image.exists():
        print(f"[!] Test image not found at {test_image}")
        return

    bgr = cv2.imread(str(test_image))
    damages = detector.detect(bgr, conf_threshold=0.20)
    overall = _compute_overall_severity(damages)

    print("\n" + "="*50)
    print(f"Detection Results: {len(damages)} damage regions found")
    print(f"Overall Severity: {overall.upper()}")
    print("="*50)

    for i, d in enumerate(damages, 1):
        print(f" [{i}] {d.class_name.upper()} | Confidence: {d.confidence:.1%} | Severity: {d.severity} | Box: {d.bbox}")
    print("="*50)

if __name__ == "__main__":
    main()
