"""Damage detection service configuration with pydantic-settings and validation."""
from functools import lru_cache
from pathlib import Path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_damage_dir = Path(__file__).resolve().parent.parent
_root_dir = _damage_dir.parent.parent
_local_model_default = Path(__file__).resolve().parent / "models" / "yolov8s-seg.onnx"
_default_path = (
    str(_local_model_default)
    if _local_model_default.exists()
    else "/models/yolov8s-seg.onnx"
)


class Settings(BaseSettings):
    """Strongly typed damage-detection settings loaded from .env."""

    model_config = SettingsConfigDict(
        env_file=[str(_damage_dir / ".env"), str(_root_dir / ".env"), ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )

    onnx_model_path: str = Field(
        default=_default_path,
        description="Đường dẫn tới file mô hình ONNX",
    )
    conf_threshold: float = Field(
        default=0.25,
        ge=0.01,
        le=1.0,
        description="Ngưỡng lọc confidence cho các dự đoán",
    )
    iou_threshold: float = Field(
        default=0.45,
        ge=0.01,
        le=1.0,
        description="Ngưỡng NMS IoU loại bỏ trùng lặp",
    )
    max_detections: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="Số lượng phát hiện tối đa mỗi ảnh",
    )
    input_size: int = Field(
        default=640,
        ge=320,
        le=1280,
        description="Kích thước ảnh vuông đầu vào mô hình YOLOv8",
    )

    host: str = Field(default="0.0.0.0", description="Host bind IP")
    port: int = Field(default=8001, ge=1, le=65535, description="Server port")
    debug: bool = Field(default=False, description="Chế độ debug")

    damage_classes: list[str] = [
        "dent", "scratch", "crack", "glass shatter", "lamp broken", "tire flat"
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()
