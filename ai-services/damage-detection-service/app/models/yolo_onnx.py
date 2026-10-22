"""YOLOv8s-seg ONNX Runtime inference engine with true pixel-mask segmentation & visualization."""
from __future__ import annotations
import ast
import base64
import logging
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import onnxruntime as ort

from app.config import get_settings
from app.schemas import DamageRegion

logger = logging.getLogger(__name__)
settings = get_settings()

# Bảng màu BGR trực quan cho từng loại hư hỏng trên xe
CLASS_COLORS_BGR: dict[str, tuple[int, int, int]] = {
    "dent": (0, 165, 255),          # Cam (Vết móp)
    "scratch": (0, 255, 255),       # Vàng (Vết xước)
    "crack": (255, 0, 255),         # Tím hồng (Vết nứt)
    "glass shatter": (255, 255, 0), # Xanh lơ (Vỡ kính)
    "lamp broken": (255, 100, 50),  # Xanh dương sáng (Vỡ đèn)
    "tire flat": (40, 40, 255),     # Đỏ (Xẹp lốp)
}


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
        self.input_name = self.session.get_inputs()[0].name  # trả về list các input name, lấy name của input đầu tiên, ngoài ra còn 2 thuộc tính khác là shape và type

        # Read model metadata dynamically if available
        meta = self.session.get_modelmeta().custom_metadata_map
        if "names" in meta:
            try:
                names_dict = ast.literal_eval(meta["names"])  # literal_eval để chuyển đổi chuỗi thành dict
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
        # 1. Nhân vô hướng 32 hệ số mask với 32 prototype masks -> [mh, mw] (160x160)
        logits = np.tensordot(mask_coeff, proto, axes=([0], [0]))
        prob = _sigmoid(logits)

        # 2. Cắt (crop) mask theo bounding box trên không gian prototype (160x160)
        scale_x = mw / float(self.input_size)
        scale_y = mh / float(self.input_size)
        mx1 = max(0, int(np.floor(box_in[0] * scale_x)))
        my1 = max(0, int(np.floor(box_in[1] * scale_y)))
        mx2 = min(mw, int(np.ceil(box_in[2] * scale_x)))
        my2 = min(mh, int(np.ceil(box_in[3] * scale_y)))

        cropped_prob = np.zeros_like(prob, dtype=np.float32)
        if mx2 > mx1 and my2 > my1:
            cropped_prob[my1:my2, mx1:mx2] = prob[my1:my2, mx1:mx2]

        # 3. Phóng lên kích thước input_size (640x640), loại bỏ vùng viền xám letterbox padding
        mask_input = cv2.resize(cropped_prob, (self.input_size, self.input_size), interpolation=cv2.INTER_LINEAR)
        mask_unpadded = mask_input[pad_top : pad_top + new_h, pad_left : pad_left + new_w]

        # 4. Resize về đúng kích thước ảnh gốc (orig_w, orig_h) và nhị phân hóa (> 0.5)
        if mask_unpadded.size == 0:
            return np.zeros((orig_h, orig_w), dtype=bool)
        mask_orig = cv2.resize(mask_unpadded, (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
        return mask_orig > 0.5

    def detect_with_masks(
        self, bgr: np.ndarray, conf_threshold: float | None = None
    ) -> tuple[list[DamageRegion], list[np.ndarray]]:
        """Chạy inference trả về danh sách vùng hư hỏng (với diện tích mask thực tế) kèm danh sách binary_mask."""
        conf = conf_threshold or settings.conf_threshold
        h, w = bgr.shape[:2]
        total_image_px = float(h * w)
        tensor, scale, (pad_top, pad_left), (new_h, new_w) = self._preprocess(bgr)

        outputs = self.session.run(None, {self.input_name: tensor})
        # outputs[0]: [1, 4 + num_classes + 32, 8400]
        # outputs[1]: [1, 32, 160, 160] (prototype masks)
        pred = outputs[0][0].T  # [8400, 4 + num_classes + 32]
        proto = outputs[1][0] if len(outputs) > 1 else None

        num_classes = len(self.classes)
        boxes_raw = pred[:, :4]  # cx, cy, w, h
        class_scores = pred[:, 4 : 4 + num_classes]
        mask_coeffs = pred[:, 4 + num_classes :] if proto is not None else None

        class_ids = class_scores.argmax(axis=1)
        confidences = class_scores.max(axis=1)

        # Lọc theo ngưỡng confidence
        valid = confidences >= conf
        boxes_raw = boxes_raw[valid]
        confidences = confidences[valid]
        class_ids = class_ids[valid]
        if mask_coeffs is not None:
            mask_coeffs = mask_coeffs[valid]

        if len(boxes_raw) == 0:
            return [], []

        boxes_xyxy = _xywh2xyxy(boxes_raw)

        # NMS
        keep = _nms(boxes_xyxy, confidences, settings.iou_threshold)  # keep là danh sách các chỉ số của các bounding box được giữ lại sau khi áp dụng NMS
        keep = keep[: settings.max_detections]

        results: list[DamageRegion] = []
        binary_masks: list[np.ndarray] = []

        for idx in keep:
            box = boxes_xyxy[idx]
            # Chuyển tọa độ từ ảnh letterbox về ảnh gốc
            x1 = (box[0] - pad_left) / scale
            y1 = (box[1] - pad_top) / scale
            x2 = (box[2] - pad_left) / scale
            y2 = (box[3] - pad_top) / scale

            x1n = max(0.0, min(1.0, float(x1 / w)))
            y1n = max(0.0, min(1.0, float(y1 / h)))
            x2n = max(0.0, min(1.0, float(x2 / w)))
            y2n = max(0.0, min(1.0, float(y2 / h)))
            bbox_area_ratio = (x2n - x1n) * (y2n - y1n)

            # Giải mã mask phân đoạn thực tế nếu có outputs[1]
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

            results.append(
                DamageRegion(
                    class_name=cname,
                    class_id=cid,
                    confidence=round(float(confidences[idx]), 4),
                    bbox=[round(x1n, 4), round(y1n, 4), round(x2n, 4), round(y2n, 4)],
                    bbox_area_ratio=round(float(bbox_area_ratio), 4),
                    mask_area_px=mask_area_px,
                    area_ratio=round(float(true_area_ratio), 4),
                    severity=_compute_severity(true_area_ratio),
                )
            )
            binary_masks.append(bmask)

        return results, binary_masks

    def detect(self, bgr: np.ndarray, conf_threshold: float | None = None) -> list[DamageRegion]:
        """Run inference and return damage regions (backward-compatible API)."""
        damages, _ = self.detect_with_masks(bgr, conf_threshold)
        return damages

    def draw_annotations(
        self,
        bgr: np.ndarray,
        damages: list[DamageRegion],
        binary_masks: list[np.ndarray],
    ) -> np.ndarray:
        """Vẽ mask bán trong suốt, đường viền contour, bounding box và nhãn thông số lên ảnh."""
        annotated = bgr.copy()
        h, w = annotated.shape[:2]

        for d, bmask in zip(damages, binary_masks):
            color = CLASS_COLORS_BGR.get(d.class_name, (0, 200, 255))

            # 1. Tô màu mask phân đoạn bán trong suốt (alpha = 0.42) + vẽ đường viền contour
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

            # 2. Vẽ khung chữ nhật Bounding Box
            px1 = int(round(d.bbox[0] * w))
            py1 = int(round(d.bbox[1] * h))
            px2 = int(round(d.bbox[2] * w))
            py2 = int(round(d.bbox[3] * h))
            cv2.rectangle(annotated, (px1, py1), (px2, py2), color, 2, lineType=cv2.LINE_AA)

            # 3. Vẽ nhãn thông tin: Tên hư hỏng + Độ tin cậy + Diện tích thực (Mask %) + Mức độ
            label = (
                f"{d.class_name} {d.confidence:.0%} | "
                f"Mask: {d.area_ratio:.2%} ({d.mask_area_px:,}px) | {d.severity.upper()}"
            )
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = max(0.5, min(0.75, w / 1200.0))
            thickness = 2
            (tw, th), baseline = cv2.getTextSize(label, font, font_scale, thickness)

            label_y1 = max(0, py1 - th - baseline - 10)
            label_y2 = label_y1 + th + baseline + 10
            label_x2 = min(w, px1 + tw + 12)

            cv2.rectangle(annotated, (px1, label_y1), (label_x2, label_y2), color, -1)
            # Chọn màu chữ đen trên nền sáng (vàng/xanh lơ) và chữ trắng trên nền đậm
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
        self, bgr: np.ndarray, conf_threshold: float | None = None
    ) -> tuple[list[DamageRegion], np.ndarray, str]:
        """Chạy phát hiện + phân đoạn thực tế và trả về (damages, annotated_bgr, annotated_base64)."""
        damages, binary_masks = self.detect_with_masks(bgr, conf_threshold)
        annotated_bgr = self.draw_annotations(bgr, damages, binary_masks)
        ok, buf = cv2.imencode(".jpg", annotated_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        b64_str = base64.b64encode(buf.tobytes()).decode("utf-8") if ok else ""
        return damages, annotated_bgr, b64_str
