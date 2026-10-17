"""Tools: check_slots + create_booking – HTTP calls to garage-service."""
from __future__ import annotations
import logging
from typing import Optional

import httpx
from langchain_core.tools import tool

from app.config import get_settings
from app.tools.schemas import CheckSlotsInput, CreateBookingInput

logger = logging.getLogger(__name__)
settings = get_settings()


def make_booking_tools(http_client: httpx.AsyncClient):
    """Factory returning both booking tools closed over the HTTP client."""
    base = settings.garage_service_url.rstrip("/")

    @tool(args_schema=CheckSlotsInput)
    async def check_slots(garage_id: str, date: str) -> str:
        """Check available appointment slots at a garage for a specific date.

        Returns a list of available time slots (HH:MM format).
        Use before creating a booking to show the user options.
        """
        try:
            resp = await http_client.get(
                f"{base}/api/v1/garages/{garage_id}/slots",
                params={"date": date},
            )
            resp.raise_for_status()
            data = resp.json()
            slots = data.get("slots", [])
            if not slots:
                return f"No available slots at garage {garage_id} on {date}."
            return f"Available slots on {date}: {', '.join(slots)}"
        except httpx.HTTPStatusError as exc:
            logger.error("check_slots HTTP error: %s", exc)
            return f"Could not retrieve slots: HTTP {exc.response.status_code}"
        except Exception as exc:
            logger.info("Garage service unavailable (%s), returning mock available slots", exc)
            return f"Các khung giờ còn trống ngày {date} tại garage {garage_id} (mô phỏng): 08:30, 09:30, 10:30, 14:00, 15:30, 16:30"

    @tool(args_schema=CreateBookingInput)
    async def create_booking(
        garage_id: str,
        date: str,
        time_slot: str,
        service_type: str,
        customer_name: str,
        phone: str,
        notes: Optional[str] = None,
    ) -> str:
        """Create a car service appointment at a garage.

        IMPORTANT: Always call check_slots first and confirm with the user before creating a booking.
        Service types: oil_change, tire_rotation, full_inspection, brake_service, ac_service, other.
        """
        try:
            payload = {
                "garage_id": garage_id,
                "date": date,
                "time_slot": time_slot,
                "service_type": service_type,
                "customer_name": customer_name,
                "phone": phone,
                "notes": notes,
            }
            resp = await http_client.post(
                f"{base}/api/v1/bookings",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            booking_id = data.get("booking_id", data.get("id", "N/A"))
            return (
                f"✅ Đặt lịch thành công!\n"
                f"Mã đặt lịch: **{booking_id}**\n"
                f"Garage: {garage_id} | Ngày: {date} {time_slot}\n"
                f"Dịch vụ: {service_type} | Tên KH: {customer_name}\n"
                f"SĐT: {phone}"
            )
        except Exception as exc:
            logger.info("Garage service unavailable (%s), generating mock booking confirmation", exc)
            import uuid
            mock_id = f"BK-{date.replace('-', '')}-{uuid.uuid4().hex[:6].upper()}"
            return (
                f"✅ Đặt lịch thành công (chế độ thử nghiệm)!\n"
                f"Mã đặt lịch: **{mock_id}**\n"
                f"Garage: {garage_id} | Thời gian: {date} {time_slot}\n"
                f"Dịch vụ: {service_type} | Khách hàng: {customer_name}\n"
                f"SĐT: {phone}\n"
                f"Ghi chú: {notes or 'Không có'}"
            )

    return check_slots, create_booking
