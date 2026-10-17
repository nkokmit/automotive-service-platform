from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path

_local_model_default = Path(__file__).resolve().parent / "models" / "yolov8s-seg.onnx"
_default_path = str(_local_model_default) if _local_model_default.exists() else "/models/yolov8s-seg.onnx"

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    onnx_model_path: str = _default_path
    conf_threshold: float = 0.25
    iou_threshold: float = 0.45
    max_detections: int = 100
    input_size: int = 640  # YOLOv8 default (auto-adapted from ONNX metadata if available)

    host: str = "0.0.0.0"
    port: int = 8001
    debug: bool = False

    # CarDD dataset default damage classes
    damage_classes: list[str] = [
        "dent", "scratch", "crack", "glass shatter", "lamp broken", "tire flat"
    ]

@lru_cache
def get_settings() -> Settings:
    return Settings()
