"""Tools: lookup_vehicle_and_service_history & record_vehicle_service_history – Integration with customer-vehicle-service."""
from __future__ import annotations

from datetime import datetime
import logging
from typing import Any, Optional
import uuid

from langchain_core.tools import tool
from sqlalchemy import text

from app.tools.schemas import (
    LookupVehicleHistoryInput,
    RecordVehicleServiceHistoryInput,
)

logger = logging.getLogger(__name__)

_RECORD_TYPE_LABELS = {
    "GARAGE_SERVICE": "Dịch vụ hệ thống AutoCare",
    "EXTERNAL_SERVICE": "Garage đối tác / bên ngoài",
    "CUSTOMER_REPORTED": "Khách hàng tự ghi nhận",
}


def _next_milestone_advice(odometer_km: int | None) -> str:
    """Return personalized next maintenance milestone recommendation based on current odometer."""
    if not odometer_km or odometer_km <= 0:
        return "Khuyến nghị kiểm tra bảo dưỡng định kỳ mỗi 5.000 km hoặc 6 tháng."
    next_5k = ((odometer_km // 5000) + 1) * 5000
    rem = next_5k - odometer_km
    if next_5k % 40000 == 0:
        level = "Cấp 4 (Bảo dưỡng lớn: thay dầu máy, lọc dầu, dầu hộp số, dầu phanh, nước làm mát, bugi)"
    elif next_5k % 20000 == 0:
        level = "Cấp 3 (Thay dầu máy, lọc dầu, lọc gió động cơ, lọc gió điều hòa, vệ sinh kim phun & phanh 4 bánh)"
    elif next_5k % 10000 == 0:
        level = "Cấp 2 (Thay dầu máy, lọc dầu, đảo lốp cân bằng động, kiểm tra má phanh)"
    else:
        level = "Cấp 1 (Thay dầu máy, vệ sinh lọc gió, kiểm tra gầm và áp suất lốp)"
    return f"Mốc bảo dưỡng tiếp theo: **{next_5k:,} km** (còn khoảng **{rem:,} km**) — {level}."


def make_customer_vehicle_tools(db_session_factory):
    """Factory creating tools integrated with `customer-vehicle-service` database."""

    @tool(args_schema=LookupVehicleHistoryInput)
    async def lookup_vehicle_and_service_history(
        license_plate: Optional[str] = None,
        customer_phone: Optional[str] = None,
        customer_name: Optional[str] = None,
        keyword: Optional[str] = None,
    ) -> str:
        """Tra cứu hồ sơ xe, thông tin khách hàng và lịch sử bảo dưỡng/sửa chữa từ `customer-vehicle-service`.

        Sử dụng công cụ này khi người dùng hỏi về:
        - Lịch sử bảo dưỡng, sửa chữa của một xe theo biển số (VD: 51H-123.45, 30H-111.22)
        - Hồ sơ khách hàng hoặc các xe khách từng mang đến theo SĐT (VD: 0901234567) hoặc họ tên (VD: Nguyễn Văn An)
        - Số km (ODO) hiện tại của xe và tư vấn mốc bảo dưỡng tiếp theo
        """
        try:
            async with db_session_factory() as session:
                # 1. If searching by customer_phone or customer_name first
                matched_customers: list[dict[str, Any]] = []
                if customer_phone or customer_name:
                    c_conds = ["deleted_at IS NULL"]
                    c_params: dict[str, Any] = {}
                    if customer_phone:
                        c_conds.append("phone LIKE :phone")
                        c_params["phone"] = f"%{customer_phone.strip()}%"
                    if customer_name:
                        c_conds.append("LOWER(full_name) LIKE :cname")
                        c_params["cname"] = f"%{customer_name.strip().lower()}%"
                    c_sql = text(
                        f"""
                        SELECT id, full_name, phone, email, address, notes, is_active
                        FROM customers
                        WHERE {' AND '.join(c_conds)}
                        ORDER BY created_at DESC
                        LIMIT 5
                        """
                    )
                    c_res = await session.execute(c_sql, c_params)
                    matched_customers = [dict(r) for r in c_res.mappings().all()]

                # 2. Search vehicles by license_plate, keyword, or linked to matched_customers via service history
                v_conds = ["v.deleted_at IS NULL"]
                v_params: dict[str, Any] = {}

                if license_plate:
                    clean_plate = license_plate.strip().upper().replace(" ", "")
                    v_conds.append(
                        "(UPPER(REPLACE(v.license_plate, ' ', '')) LIKE :plate OR UPPER(v.license_plate) LIKE :raw_plate)"
                    )
                    v_params["plate"] = f"%{clean_plate}%"
                    v_params["raw_plate"] = f"%{license_plate.strip().upper()}%"
                elif keyword:
                    kw = f"%{keyword.strip().lower()}%"
                    v_conds.append(
                        "(LOWER(v.license_plate) LIKE :kw OR LOWER(v.make) LIKE :kw "
                        "OR LOWER(v.model) LIKE :kw OR LOWER( COALESCE(v.vin, '') ) LIKE :kw)"
                    )
                    v_params["kw"] = kw
                elif matched_customers:
                    c_ids = [c["id"] for c in matched_customers]
                    placeholders = ", ".join(f":cid_{i}" for i in range(len(c_ids)))
                    for i, cid in enumerate(c_ids):
                        v_params[f"cid_{i}"] = cid
                    v_conds.append(
                        f"v.id IN (SELECT DISTINCT vehicle_id FROM vehicle_service_histories WHERE customer_id IN ({placeholders}))"
                    )

                v_sql = text(
                    f"""
                    SELECT v.id, v.license_plate, v.vin, v.make, v.model, v.model_year,
                           v.trim, v.color, v.fuel_type, v.transmission, v.odometer_km, v.notes, v.is_active
                    FROM vehicles v
                    WHERE {' AND '.join(v_conds)}
                    ORDER BY v.updated_at DESC
                    LIMIT 5
                    """
                )
                v_res = await session.execute(v_sql, v_params)
                vehicles = [dict(r) for r in v_res.mappings().all()]

                if not vehicles and not matched_customers:
                    return (
                        "Không tìm thấy hồ sơ xe hoặc khách hàng phù hợp trong `customer-vehicle-service`. "
                        "Bạn có thể cung cấp biển số xe (VD: `51H-123.45`, `51H-678.90`, `30H-111.22`) hoặc SĐT khách hàng (`0901234567`)."
                    )

                sections: list[str] = []

                if matched_customers:
                    cust_lines = ["### 👤 Hồ sơ khách hàng (`customer-vehicle-service`)"]
                    for c in matched_customers:
                        status_str = "Đang hoạt động" if c["is_active"] else "Tạm ngưng"
                        cust_lines.append(
                            f"- **{c['full_name']}** | SĐT: `{c['phone'] or 'N/A'}` | "
                            f"Email: `{c['email'] or 'N/A'}` | Địa chỉ: {c['address'] or 'N/A'} ({status_str})"
                        )
                        if c.get("notes"):
                            cust_lines.append(f"  *Ghi chú KH*: {c['notes']}")
                    sections.append("\n".join(cust_lines))

                for v in vehicles:
                    vid = v["id"]
                    odo = v.get("odometer_km")
                    odo_str = f"{int(odo):,} km" if odo is not None else "Chưa cập nhật"
                    v_header = (
                        f"### 🚗 Xe biển số **{v['license_plate']}** — {v['make']} {v['model']} "
                        f"{v.get('trim') or ''} ({v.get('model_year') or 'N/A'})\n"
                        f"- **Màu sắc**: {v.get('color') or 'N/A'} | **Nhiên liệu**: {v.get('fuel_type') or 'N/A'} | "
                        f"**Hộp số**: {v.get('transmission') or 'N/A'}\n"
                        f"- **Số VIN**: `{v.get('vin') or 'Chưa đăng ký'}` | **ODO hiện tại**: **{odo_str}**\n"
                        f"- 💡 {_next_milestone_advice(odo)}"
                    )

                    h_sql = text(
                        """
                        SELECT h.id, h.record_type, h.service_date, h.odometer_km,
                               h.summary, h.description, h.garage_name,
                               c.full_name AS customer_name, c.phone AS customer_phone
                        FROM vehicle_service_histories h
                        LEFT JOIN customers c ON c.id = h.customer_id
                        WHERE h.vehicle_id = :vid
                        ORDER BY h.service_date DESC
                        LIMIT 10
                        """
                    )
                    h_res = await session.execute(h_sql, {"vid": vid})
                    histories = [dict(r) for r in h_res.mappings().all()]

                    if histories:
                        h_lines = [f"\n**📋 Lịch sử bảo dưỡng & sửa chữa ({len(histories)} lần ghi nhận):**"]
                        for idx, h in enumerate(histories, 1):
                            s_date = h["service_date"]
                            date_str = (
                                s_date.strftime("%d/%m/%Y")
                                if hasattr(s_date, "strftime")
                                else str(s_date)[:10]
                            )
                            h_odo = f"{int(h['odometer_km']):,} km" if h.get("odometer_km") else "N/A"
                            rtype = _RECORD_TYPE_LABELS.get(h["record_type"], h["record_type"])
                            garage = h.get("garage_name") or "Khách tự khai báo"
                            brought_by = (
                                f" | Người mang xe: {h['customer_name']} ({h['customer_phone']})"
                                if h.get("customer_name")
                                else ""
                            )
                            desc = f"\n     *Chi tiết*: {h['description']}" if h.get("description") else ""
                            h_lines.append(
                                f"{idx}. **[{date_str} — mốc {h_odo}] {h['summary']}**\n"
                                f"   • Nguồn: {rtype} tại **{garage}**{brought_by}{desc}"
                            )
                        sections.append(v_header + "\n" + "\n".join(h_lines))
                    else:
                        sections.append(v_header + "\n- *Chưa có bản ghi lịch sử bảo dưỡng nào.*")

                return "\n\n".join(sections)

        except Exception as exc:
            logger.warning("lookup_vehicle_and_service_history failed: %s", exc)
            return f"Không thể tra cứu dữ liệu từ customer-vehicle-service lúc này ({exc})."

    @tool(args_schema=RecordVehicleServiceHistoryInput)
    async def record_vehicle_service_history(
        license_plate: str,
        summary: str,
        make: Optional[str] = None,
        model: Optional[str] = None,
        model_year: Optional[int] = None,
        odometer_km: Optional[int] = None,
        description: Optional[str] = None,
        garage_name: Optional[str] = None,
        customer_name: Optional[str] = None,
        customer_phone: Optional[str] = None,
    ) -> str:
        """Ghi nhận bổ sung lịch sử bảo dưỡng/sửa chữa hoặc đăng ký xe mới vào `customer-vehicle-service`.

        Sử dụng công cụ này khi khách hàng hoặc nhân viên yêu cầu:
        - Lưu lại lịch sử bảo dưỡng, thay dầu, sửa chữa thân vỏ cho biển số xe
        - Đăng ký thông tin xe mới kèm nhật ký bảo dưỡng vào hệ thống
        """
        try:
            now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
            clean_plate = license_plate.strip().upper()

            async with db_session_factory() as session:
                async with session.begin():
                    # 1. Resolve or create customer if provided
                    customer_id: Optional[str] = None
                    if customer_phone or customer_name:
                        c_res = await session.execute(
                            text(
                                """
                                SELECT id FROM customers
                                WHERE deleted_at IS NULL
                                  AND ((:phone IS NOT NULL AND phone = :phone)
                                       OR (:name IS NOT NULL AND LOWER(full_name) = LOWER(:name)))
                                LIMIT 1
                                """
                            ),
                            {"phone": customer_phone, "name": customer_name},
                        )
                        row = c_res.first()
                        if row:
                            customer_id = row[0]
                        else:
                            customer_id = str(uuid.uuid4())
                            await session.execute(
                                text(
                                    """
                                    INSERT INTO customers
                                        (id, full_name, phone, is_active, created_at, updated_at)
                                    VALUES
                                        (:id, :full_name, :phone, TRUE, :now, :now)
                                    """
                                ),
                                {
                                    "id": customer_id,
                                    "full_name": customer_name or "Khách hàng AutoCare",
                                    "phone": customer_phone,
                                    "now": now,
                                },
                            )

                    # 2. Resolve or create vehicle by license_plate
                    v_res = await session.execute(
                        text(
                            """
                            SELECT id, odometer_km, make, model FROM vehicles
                            WHERE deleted_at IS NULL AND UPPER(license_plate) = :plate
                            LIMIT 1
                            """
                        ),
                        {"plate": clean_plate},
                    )
                    v_row = v_res.mappings().first()
                    if v_row:
                        vehicle_id = v_row["id"]
                        current_odo = v_row["odometer_km"] or 0
                        new_odo = max(current_odo, odometer_km or current_odo)
                        if odometer_km and odometer_km > current_odo:
                            await session.execute(
                                text(
                                    "UPDATE vehicles SET odometer_km = :odo, updated_at = :now WHERE id = :id"
                                ),
                                {"odo": new_odo, "now": now, "id": vehicle_id},
                            )
                        v_make = v_row["make"]
                        v_model = v_row["model"]
                    else:
                        vehicle_id = str(uuid.uuid4())
                        v_make = make or "Chưa rõ hãng"
                        v_model = model or "Chưa rõ dòng"
                        new_odo = odometer_km or 0
                        await session.execute(
                            text(
                                """
                                INSERT INTO vehicles
                                    (id, license_plate, make, model, model_year, odometer_km, is_active, created_at, updated_at)
                                VALUES
                                    (:id, :plate, :make, :model, :year, :odo, TRUE, :now, :now)
                                """
                            ),
                            {
                                "id": vehicle_id,
                                "plate": clean_plate,
                                "make": v_make,
                                "model": v_model,
                                "year": model_year or 2022,
                                "odo": new_odo,
                                "now": now,
                            },
                        )

                    # 3. Insert service history record
                    history_id = str(uuid.uuid4())
                    rec_type = "EXTERNAL_SERVICE" if garage_name else "CUSTOMER_REPORTED"
                    await session.execute(
                        text(
                            """
                            INSERT INTO vehicle_service_histories
                                (id, vehicle_id, customer_id, record_type, service_date, odometer_km, summary, description, garage_name, created_at)
                            VALUES
                                (:id, :vehicle_id, :customer_id, :record_type, :now, :odo, :summary, :description, :garage_name, :now)
                            """
                        ),
                        {
                            "id": history_id,
                            "vehicle_id": vehicle_id,
                            "customer_id": customer_id,
                            "record_type": rec_type,
                            "now": now,
                            "odo": odometer_km,
                            "summary": summary.strip(),
                            "description": description,
                            "garage_name": garage_name,
                        },
                    )

            return (
                f"✅ Đã lưu bản ghi lịch sử bảo dưỡng vào `customer-vehicle-service`!\n"
                f"- **Biển số xe**: `{clean_plate}` ({v_make} {v_model})\n"
                f"- **Hạng mục**: {summary}\n"
                f"- **Số ODO**: {f'{odometer_km:,} km' if odometer_km else 'Chưa ghi nhận'}\n"
                f"- **Đơn vị thực hiện**: {garage_name or 'Khách hàng tự ghi nhận'}\n"
                f"- **Mã bản ghi**: `{history_id[:8]}...`"
            )
        except Exception as exc:
            logger.warning("record_vehicle_service_history error: %s", exc)
            return f"Không thể ghi nhận lịch sử bảo dưỡng vào cơ sở dữ liệu ({exc})."

    return lookup_vehicle_and_service_history, record_vehicle_service_history

