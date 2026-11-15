"""REST router bridging `customer-vehicle-service` tables (`customers`, `vehicles`, `vehicle_service_histories`) in MySQL."""
from __future__ import annotations

from datetime import datetime
import logging
from typing import Any, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/customer-vehicles", tags=["customer-vehicle-service"])


class CustomerCreatePayload(BaseModel):
    fullName: str = Field(..., min_length=1, max_length=150)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[str] = Field(None, max_length=255)
    address: Optional[str] = Field(None, max_length=500)
    notes: Optional[str] = None
    userId: Optional[str] = None
    isActive: bool = True


class VehicleCreatePayload(BaseModel):
    licensePlate: str = Field(..., min_length=1, max_length=20)
    vin: Optional[str] = Field(None, max_length=17)
    make: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    modelYear: Optional[int] = Field(None, ge=1900, le=2100)
    trim: Optional[str] = Field(None, max_length=100)
    color: Optional[str] = Field(None, max_length=50)
    fuelType: Optional[str] = Field(None, max_length=30)
    transmission: Optional[str] = Field(None, max_length=30)
    odometerKm: Optional[int] = Field(None, ge=0)
    notes: Optional[str] = None
    isActive: bool = True


class ServiceHistoryCreatePayload(BaseModel):
    customerId: Optional[str] = None
    recordType: str = Field(default="CUSTOMER_REPORTED")
    serviceDate: Optional[str] = None
    odometerKm: Optional[int] = Field(None, ge=0)
    summary: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    garageName: Optional[str] = Field(None, max_length=150)


def _fmt_iso(val: Any) -> str:
    if val is None:
        return datetime.utcnow().isoformat() + "Z"
    if hasattr(val, "isoformat"):
        return val.isoformat() + ("Z" if not str(val).endswith("Z") else "")
    return str(val)


def _row_to_customer(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": r["id"],
        "userId": r.get("user_id") or "",
        "fullName": r.get("full_name"),
        "phone": r.get("phone"),
        "email": r.get("email"),
        "address": r.get("address"),
        "notes": r.get("notes"),
        "isActive": bool(r.get("is_active", True)),
        "createdAt": _fmt_iso(r.get("created_at")),
        "updatedAt": _fmt_iso(r.get("updated_at")),
    }


def _row_to_vehicle(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": r["id"],
        "licensePlate": r["license_plate"],
        "vin": r.get("vin"),
        "make": r.get("make"),
        "model": r.get("model"),
        "modelYear": int(r["model_year"]) if r.get("model_year") is not None else None,
        "trim": r.get("trim"),
        "color": r.get("color"),
        "fuelType": r.get("fuel_type"),
        "transmission": r.get("transmission"),
        "odometerKm": int(r["odometer_km"]) if r.get("odometer_km") is not None else None,
        "notes": r.get("notes"),
        "isActive": bool(r.get("is_active", True)),
        "createdAt": _fmt_iso(r.get("created_at")),
        "updatedAt": _fmt_iso(r.get("updated_at")),
    }


def _row_to_history(r: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": r["id"],
        "vehicleId": r["vehicle_id"],
        "customerId": r.get("customer_id"),
        "workOrderId": r.get("work_order_id"),
        "recordType": r["record_type"],
        "serviceDate": _fmt_iso(r.get("service_date")),
        "odometerKm": int(r["odometer_km"]) if r.get("odometer_km") is not None else None,
        "summary": r["summary"],
        "description": r.get("description"),
        "garageName": r.get("garage_name"),
        "createdAt": _fmt_iso(r.get("created_at")),
        "licensePlate": r.get("license_plate"),
        "vehicleMake": r.get("make"),
        "vehicleModel": r.get("model"),
        "customerName": r.get("customer_name"),
    }


@router.get("/customers")
async def list_customers(
    keyword: Optional[str] = Query(None),
    isActive: Optional[bool] = Query(None),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    conds = ["deleted_at IS NULL"]
    params: dict[str, Any] = {"limit": size, "offset": page * size}
    if keyword and keyword.strip():
        conds.append(
            "(LOWER(full_name) LIKE :kw OR LOWER(COALESCE(phone, '')) LIKE :kw OR LOWER(COALESCE(email, '')) LIKE :kw)"
        )
        params["kw"] = f"%{keyword.strip().lower()}%"
    if isActive is not None:
        conds.append("is_active = :is_active")
        params["is_active"] = isActive

    where_sql = " AND ".join(conds)
    count_res = await db.execute(text(f"SELECT COUNT(*) FROM customers WHERE {where_sql}"), params)
    total = int(count_res.scalar() or 0)

    res = await db.execute(
        text(
            f"""
            SELECT id, user_id, full_name, phone, email, address, notes, is_active, created_at, updated_at
            FROM customers
            WHERE {where_sql}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    )
    items = [_row_to_customer(dict(r)) for r in res.mappings().all()]
    total_pages = max(1, (total + size - 1) // size)
    return {
        "code": 0,
        "message": "Success",
        "result": {
            "items": items,
            "page": page,
            "size": size,
            "totalElements": total,
            "totalPages": total_pages,
            "hasNext": (page + 1) < total_pages,
            "hasPrevious": page > 0,
        },
    }


@router.post("/customers")
async def create_customer(payload: CustomerCreatePayload, db: AsyncSession = Depends(get_db)):
    cid = str(uuid.uuid4())
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    async with db.begin():
        await db.execute(
            text(
                """
                INSERT INTO customers
                    (id, user_id, full_name, phone, email, address, notes, is_active, created_at, updated_at)
                VALUES
                    (:id, :user_id, :full_name, :phone, :email, :address, :notes, :is_active, :now, :now)
                """
            ),
            {
                "id": cid,
                "user_id": payload.userId,
                "full_name": payload.fullName.strip(),
                "phone": payload.phone,
                "email": payload.email,
                "address": payload.address,
                "notes": payload.notes,
                "is_active": payload.isActive,
                "now": now,
            },
        )
    return {
        "code": 0,
        "message": "Tạo khách hàng thành công",
        "result": {
            "id": cid,
            "userId": payload.userId or "",
            "fullName": payload.fullName.strip(),
            "phone": payload.phone,
            "email": payload.email,
            "address": payload.address,
            "notes": payload.notes,
            "isActive": payload.isActive,
            "createdAt": now,
            "updatedAt": now,
        },
    }


@router.get("/vehicles")
async def list_vehicles(
    licensePlate: Optional[str] = Query(None),
    keyword: Optional[str] = Query(None),
    isActive: Optional[bool] = Query(None),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    conds = ["deleted_at IS NULL"]
    params: dict[str, Any] = {"limit": size, "offset": page * size}
    if licensePlate and licensePlate.strip():
        conds.append("UPPER(license_plate) LIKE :plate")
        params["plate"] = f"%{licensePlate.strip().upper()}%"
    if keyword and keyword.strip():
        conds.append(
            "(LOWER(license_plate) LIKE :kw OR LOWER(make) LIKE :kw OR LOWER(model) LIKE :kw OR LOWER(COALESCE(vin, '')) LIKE :kw)"
        )
        params["kw"] = f"%{keyword.strip().lower()}%"
    if isActive is not None:
        conds.append("is_active = :is_active")
        params["is_active"] = isActive

    where_sql = " AND ".join(conds)
    count_res = await db.execute(text(f"SELECT COUNT(*) FROM vehicles WHERE {where_sql}"), params)
    total = int(count_res.scalar() or 0)

    res = await db.execute(
        text(
            f"""
            SELECT id, license_plate, vin, make, model, model_year, trim, color,
                   fuel_type, transmission, odometer_km, notes, is_active, created_at, updated_at
            FROM vehicles
            WHERE {where_sql}
            ORDER BY updated_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    )
    items = [_row_to_vehicle(dict(r)) for r in res.mappings().all()]
    total_pages = max(1, (total + size - 1) // size)
    return {
        "code": 0,
        "message": "Success",
        "result": {
            "items": items,
            "page": page,
            "size": size,
            "totalElements": total,
            "totalPages": total_pages,
            "hasNext": (page + 1) < total_pages,
            "hasPrevious": page > 0,
        },
    }


@router.post("/vehicles")
async def create_vehicle(payload: VehicleCreatePayload, db: AsyncSession = Depends(get_db)):
    vid = str(uuid.uuid4())
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    plate = payload.licensePlate.strip().upper()
    vin_val = payload.vin.strip().upper() if payload.vin and len(payload.vin.strip()) == 17 else None
    async with db.begin():
        await db.execute(
            text(
                """
                INSERT INTO vehicles
                    (id, license_plate, vin, make, model, model_year, trim, color, fuel_type, transmission, odometer_km, notes, is_active, created_at, updated_at)
                VALUES
                    (:id, :plate, :vin, :make, :model, :year, :trim, :color, :fuel, :trans, :odo, :notes, :is_active, :now, :now)
                """
            ),
            {
                "id": vid,
                "plate": plate,
                "vin": vin_val,
                "make": payload.make.strip(),
                "model": payload.model.strip(),
                "year": payload.modelYear,
                "trim": payload.trim,
                "color": payload.color,
                "fuel": payload.fuelType,
                "trans": payload.transmission,
                "odo": payload.odometerKm,
                "notes": payload.notes,
                "is_active": payload.isActive,
                "now": now,
            },
        )
    return {
        "code": 0,
        "message": "Tạo xe thành công",
        "result": {
            "id": vid,
            "licensePlate": plate,
            "vin": vin_val,
            "make": payload.make.strip(),
            "model": payload.model.strip(),
            "modelYear": payload.modelYear,
            "trim": payload.trim,
            "color": payload.color,
            "fuelType": payload.fuelType,
            "transmission": payload.transmission,
            "odometerKm": payload.odometerKm,
            "notes": payload.notes,
            "isActive": payload.isActive,
            "createdAt": now,
            "updatedAt": now,
        },
    }


@router.get("/vehicles/{vehicle_id}/service-history")
async def get_vehicle_service_history(
    vehicle_id: str,
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    params = {"vid": vehicle_id, "limit": size, "offset": page * size}
    count_res = await db.execute(
        text("SELECT COUNT(*) FROM vehicle_service_histories WHERE vehicle_id = :vid"),
        params,
    )
    total = int(count_res.scalar() or 0)
    res = await db.execute(
        text(
            """
            SELECT h.id, h.vehicle_id, h.customer_id, h.work_order_id, h.record_type,
                   h.service_date, h.odometer_km, h.summary, h.description, h.garage_name, h.created_at,
                   v.license_plate, v.make, v.model,
                   c.full_name AS customer_name
            FROM vehicle_service_histories h
            LEFT JOIN vehicles v ON v.id = h.vehicle_id
            LEFT JOIN customers c ON c.id = h.customer_id
            WHERE h.vehicle_id = :vid
            ORDER BY h.service_date DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    )
    items = [_row_to_history(dict(r)) for r in res.mappings().all()]
    total_pages = max(1, (total + size - 1) // size)
    return {
        "code": 0,
        "message": "Success",
        "result": {
            "items": items,
            "page": page,
            "size": size,
            "totalElements": total,
            "totalPages": total_pages,
            "hasNext": (page + 1) < total_pages,
            "hasPrevious": page > 0,
        },
    }


@router.post("/vehicles/{vehicle_id}/service-history")
async def create_vehicle_service_history(
    vehicle_id: str,
    payload: ServiceHistoryCreatePayload,
    db: AsyncSession = Depends(get_db),
):
    hid = str(uuid.uuid4())
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    s_date = now
    if payload.serviceDate:
        try:
            s_date = datetime.fromisoformat(payload.serviceDate.replace("Z", "")).strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            s_date = now

    rtype = payload.recordType if payload.recordType in ("EXTERNAL_SERVICE", "CUSTOMER_REPORTED") else "CUSTOMER_REPORTED"
    async with db.begin():
        v_check = await db.execute(text("SELECT id, odometer_km FROM vehicles WHERE id = :vid"), {"vid": vehicle_id})
        v_row = v_check.mappings().first()
        if not v_row:
            raise HTTPException(status_code=404, detail="Không tìm thấy xe trong hệ thống")

        if payload.odometerKm and (v_row["odometer_km"] is None or payload.odometerKm > v_row["odometer_km"]):
            await db.execute(
                text("UPDATE vehicles SET odometer_km = :odo, updated_at = :now WHERE id = :vid"),
                {"odo": payload.odometerKm, "now": now, "vid": vehicle_id},
            )

        await db.execute(
            text(
                """
                INSERT INTO vehicle_service_histories
                    (id, vehicle_id, customer_id, record_type, service_date, odometer_km, summary, description, garage_name, created_at)
                VALUES
                    (:id, :vid, :cid, :rtype, :sdate, :odo, :summary, :desc, :garage, :now)
                """
            ),
            {
                "id": hid,
                "vid": vehicle_id,
                "cid": payload.customerId,
                "rtype": rtype,
                "sdate": s_date,
                "odo": payload.odometerKm,
                "summary": payload.summary.strip(),
                "desc": payload.description,
                "garage": payload.garageName,
                "now": now,
            },
        )

    return {
        "code": 0,
        "message": "Thêm lịch sử bảo dưỡng thành công",
        "result": {
            "id": hid,
            "vehicleId": vehicle_id,
            "customerId": payload.customerId,
            "workOrderId": None,
            "recordType": rtype,
            "serviceDate": s_date,
            "odometerKm": payload.odometerKm,
            "summary": payload.summary.strip(),
            "description": payload.description,
            "garageName": payload.garageName,
            "createdAt": now,
        },
    }


@router.get("/service-history")
async def list_all_service_history(
    customerId: Optional[str] = Query(None),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    conds = ["1=1"]
    params: dict[str, Any] = {"limit": size, "offset": page * size}
    if customerId and customerId.strip():
        conds.append("h.customer_id = :cid")
        params["cid"] = customerId.strip()

    where_sql = " AND ".join(conds)
    count_res = await db.execute(
        text(f"SELECT COUNT(*) FROM vehicle_service_histories h WHERE {where_sql}"),
        params,
    )
    total = int(count_res.scalar() or 0)
    res = await db.execute(
        text(
            f"""
            SELECT h.id, h.vehicle_id, h.customer_id, h.work_order_id, h.record_type,
                   h.service_date, h.odometer_km, h.summary, h.description, h.garage_name, h.created_at,
                   v.license_plate, v.make, v.model,
                   c.full_name AS customer_name
            FROM vehicle_service_histories h
            LEFT JOIN vehicles v ON v.id = h.vehicle_id
            LEFT JOIN customers c ON c.id = h.customer_id
            WHERE {where_sql}
            ORDER BY h.service_date DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    )
    items = [_row_to_history(dict(r)) for r in res.mappings().all()]
    total_pages = max(1, (total + size - 1) // size)
    return {
        "code": 0,
        "message": "Success",
        "result": {
            "items": items,
            "page": page,
            "size": size,
            "totalElements": total,
            "totalPages": total_pages,
            "hasNext": (page + 1) < total_pages,
            "hasPrevious": page > 0,
        },
    }

