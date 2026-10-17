"""Tool: analyze_vehicle_damage – calls damage-detection-service with image."""
from __future__ import annotations
import base64
import logging
from pathlib import Path
from typing import Optional

import httpx
from langchain_core.tools import tool

from app.config import get_settings
from app.tools.schemas import AnalyzeVehicleDamageInput

logger = logging.getLogger(__name__)
settings = get_settings()


def make_damage_analysis_tool(http_client: httpx.AsyncClient):
    """Factory that closes over the shared HTTP client."""
    base = settings.damage_service_url.rstrip("/")

    @tool(args_schema=AnalyzeVehicleDamageInput)
    async def analyze_vehicle_damage(
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
    ) -> str:
        """Analyze a vehicle image to detect damage using AI vision (YOLOv8s-seg).

        Detects and classifies damage types such as:
        dent, scratch, crack, glass_damage, lamp_damage, tire_damage, rust, deformation.

        Returns damage regions with severity (low/medium/high) and an overall assessment.

        Use this tool when:
        - The user shares an image of their car and asks about damage
        - The user wants to assess repair costs (provide damage info first)
        - The user uploads a photo before booking a service appointment
        """
        if not image_url and not image_base64:
            return "Vui lòng cung cấp URL ảnh hoặc dữ liệu ảnh base64."

        try:
            payload: dict = {}
            if image_url:
                payload["image_url"] = image_url
            else:
                payload["image_base64"] = image_base64

            resp = await http_client.post(
                f"{base}/api/v1/detect",
                json=payload,
                timeout=60.0,
            )
            resp.raise_for_status()
            data = resp.json()

            summary = data.get("summary", "Không có kết quả")
            overall = data.get("overall_severity", "unknown")
            damages = data.get("damages", [])
            num = data.get("num_detections", 0)
            ms = data.get("processing_time_ms", 0)

            if not damages:
                return f"✅ {summary}\nThời gian xử lý: {ms:.0f}ms"

            lines = [
                f"🔍 **Kết quả phân tích hư hỏng xe**",
                f"Mức độ tổng thể: **{overall.upper()}**",
                f"Số vùng hư hỏng: {num}",
                "",
            ]
            for d in damages:
                severity_emoji = {"low": "🟡", "medium": "🟠", "high": "🔴"}.get(
                    d["severity"], "⚪"
                )
                lines.append(
                    f"{severity_emoji} **{d['class_name']}** "
                    f"(confidence: {d['confidence']:.0%}, "
                    f"mức độ: {d['severity']})"
                )
            lines += ["", f"📝 {summary}", f"⏱ Thời gian: {ms:.0f}ms"]
            return "\n".join(lines)

        except httpx.HTTPStatusError as exc:
            logger.error("analyze_vehicle_damage HTTP error: %s", exc)
            return f"Lỗi phân tích: HTTP {exc.response.status_code}"
        except Exception as exc:
            logger.exception("analyze_vehicle_damage failed")
            return f"Không thể phân tích ảnh: {exc}"

    return analyze_vehicle_damage

