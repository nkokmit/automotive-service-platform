"""Tool: analyze_vehicle_damage – calls damage-detection-service with image."""
from __future__ import annotations
import logging
from typing import Optional

import httpx
from langchain_core.tools import tool

from app.config import get_settings
from app.tools.schemas import AnalyzeVehicleDamageInput

logger = logging.getLogger(__name__)
settings = get_settings()


def make_damage_analysis_tool(
    http_client: httpx.AsyncClient,
    attached_image_url: str | None = None,
    attached_image_base64: str | None = None,
):
    """Factory that closes over the shared HTTP client and optional attached image."""
    base = settings.damage_service_url.rstrip("/")

    @tool(args_schema=AnalyzeVehicleDamageInput)
    async def analyze_vehicle_damage(
        image_url: Optional[str] = None,
        image_base64: Optional[str] = None,
    ) -> str:
        """Analyze a vehicle image to detect damage using AI vision (YOLOv8s-seg).

        Detects and classifies 6 CarDD damage types:
        dent, scratch, crack, glass shatter, lamp broken, tire flat.

        Returns damage regions with severity (low/medium/high) and an overall assessment.

        Use this tool when:
        - The user shares or attaches an image of their car and asks about damage
        - The user wants to assess repair needs from a photo
        - The user uploads a photo before booking a service appointment
        """
        eff_url = image_url or attached_image_url
        eff_b64 = image_base64 or attached_image_base64

        if not eff_url and not eff_b64:
            return "Vui lòng cung cấp URL ảnh hoặc đính kèm dữ liệu ảnh base64."

        try:
            payload: dict = {}
            if eff_url and eff_url.startswith("http"):
                payload["image_url"] = eff_url
            elif eff_b64:
                payload["image_base64"] = eff_b64
            else:
                payload["image_url"] = eff_url

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
                "🔍 **Kết quả phân tích hư hỏng xe**",
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
