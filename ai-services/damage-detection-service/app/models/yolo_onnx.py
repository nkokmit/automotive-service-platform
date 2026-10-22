"""YOLOv8s-seg ONNX Runtime inference engine."""
from __future__ import annotations
import logging
import time
from pathlib import Path
from typing import Any

import ast
import cv2
import numpy as np
import onnxruntime as ort

from app.config import get_settings
from app.schemas import DamageRegion

logger = logging.getLogger(__name__)
settings = get_settings()


def _compute_severity(area_ratio: float) -> str:
    if area_ratio < 0.02:
        return "low"
    elif area_ratio < 0.08:
        return "medium"
    else:
        return "high"


def _compute_overall_severity(damages: list[DamageRegion]) -> str:
    if not damages:
        return "none"
    total_area = sum(d.area_ratio for d in damages)
    high_count = sum(1 for d in damages if d.severity == "high")
    if high_count >= 3 or total_area > 0.30:
        return "critical"
    elif high_count >= 1 or total_area > 0.10:
        return "high"
    elif total_area > 0.04:
        return "medium"
    else:
        return "low"


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


class YoloOnnxDetector:
    """Wraps a YOLOv8-seg ONNX model for vehicle damage detection."""

    def __init__(self, model_path: str | Path | None = None) -> None:
        target_path = Path(model_path or settings.onnx_model_path)
        if not target_path.exists():
            # Check potential local fallback locations
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
        self.input_name = self.session.get_inputs()[0].name # trả về list các input name, lấy name của input đầu tiên, ngoài ra còn 2 thuộc tính khác là shape và type
        
        # Read model metadata dynamically if available
        meta = self.session.get_modelmeta().custom_metadata_map
        if "names" in meta:
            try:
                names_dict = ast.literal_eval(meta["names"]) # literal_eval để chuyển đổi chuỗi thành dict
                self.classes = [names_dict[i] for i in sorted(names_dict.keys())]
            except Exception:
                self.classes = settings.damage_classes
        else:
            self.classes = settings.damage_classes

        # Infer input size from ONNX metadata or input tensor
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

    def _preprocess(self, bgr: np.ndarray) -> tuple[np.ndarray, float, tuple[int, int]]:
        """Letterbox resize + normalization."""
        h, w = bgr.shape[:2]
        scale = min(self.input_size / h, self.input_size / w)
        new_h, new_w = int(h * scale), int(w * scale)
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
        return tensor, scale, (top, left)

    def detect(self, bgr: np.ndarray, conf_threshold: float | None = None) -> list[DamageRegion]:
        """Run inference and return damage regions."""
        conf = conf_threshold or settings.conf_threshold
        h, w = bgr.shape[:2]
        tensor, scale, (pad_top, pad_left) = self._preprocess(bgr)

        outputs = self.session.run(None, {self.input_name: tensor})
        # YOLOv8 output[0]: [1, num_classes+4+mask_coeffs, 8400]
        pred = outputs[0][0]  # [85+, 8400]
        # Transpose to [8400, 85+]
        pred = pred.T  # [num_anchors, 4+num_classes+32]

        num_classes = len(self.classes)
        boxes_raw = pred[:, :4]          # cx, cy, w, h
        class_scores = pred[:, 4: 4 + num_classes]
        class_ids = class_scores.argmax(axis=1)
        confidences = class_scores.max(axis=1)

        # Filter by confidence
        mask = confidences >= conf
        boxes_raw = boxes_raw[mask]
        confidences = confidences[mask]
        class_ids = class_ids[mask]

        if len(boxes_raw) == 0:
            return []

        # Convert to xyxy (normalized to input_size)
        boxes_xyxy = _xywh2xyxy(boxes_raw)

        # NMS
        keep = _nms(boxes_xyxy, confidences, settings.iou_threshold) # keep là danh sách các chỉ số của các bounding box được giữ lại sau khi áp dụng NMS
        keep = keep[: settings.max_detections]

        results = []
        for idx in keep:
            box = boxes_xyxy[idx]
            # Remove letterbox padding and rescale to original image coords
            x1 = (box[0] - pad_left) / scale
            y1 = (box[1] - pad_top) / scale
            x2 = (box[2] - pad_left) / scale
            y2 = (box[3] - pad_top) / scale
            # Clamp and normalize
            x1n = max(0.0, min(1.0, x1 / w))
            y1n = max(0.0, min(1.0, y1 / h))
            x2n = max(0.0, min(1.0, x2 / w))
            y2n = max(0.0, min(1.0, y2 / h))
            area_ratio = (x2n - x1n) * (y2n - y1n)
            cid = int(class_ids[idx])
            cname = self.classes[cid] if cid < len(self.classes) else f"class_{cid}"
            results.append(
                DamageRegion(
                    class_name=cname,
                    class_id=cid,
                    confidence=round(float(confidences[idx]), 4),
                    bbox=[round(x1n, 4), round(y1n, 4), round(x2n, 4), round(y2n, 4)],
                    area_ratio=round(area_ratio, 4),
                    severity=_compute_severity(area_ratio),
                )
            )
        return results
