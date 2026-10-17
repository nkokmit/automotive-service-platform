"""Tool: search_used_cars – PostgreSQL async query for used car listings."""
from __future__ import annotations
import logging
from typing import Optional

from langchain_core.tools import tool
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.tools.schemas import SearchUsedCarsInput

logger = logging.getLogger(__name__)


def make_search_used_cars_tool(db_session_factory):
    """Factory that closes over the async session factory."""

    @tool(args_schema=SearchUsedCarsInput)
    async def search_used_cars(
        brand: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        limit: int = 10,
    ) -> str:
        """Search used car listings from the database.

        Filter by brand (make), price range in VND, and manufacture year.
        Returns a list of matching vehicles with key details.

        Use this when the user wants to:
        - Browse used cars for sale
        - Find specific brands within a budget
        - Lookup pricing for a car model year
        """
        try:
            conditions = []
            params: dict = {"limit": limit}

            if brand:
                conditions.append("LOWER(brand) LIKE :brand")
                params["brand"] = f"%{brand.lower()}%"
            if min_price is not None:
                conditions.append("price >= :min_price")
                params["min_price"] = min_price
            if max_price is not None:
                conditions.append("price <= :max_price")
                params["max_price"] = max_price
            if year_from is not None:
                conditions.append("year >= :year_from")
                params["year_from"] = year_from
            if year_to is not None:
                conditions.append("year <= :year_to")
                params["year_to"] = year_to

            where = "WHERE " + " AND ".join(conditions) if conditions else ""
            sql = text(
                f"""
                SELECT id, brand, model, year, price, mileage, color, location, description
                FROM used_cars
                {where}
                ORDER BY created_at DESC
                LIMIT :limit
                """
            )

            async with db_session_factory() as session:
                result = await session.execute(sql, params)
                rows = result.mappings().all()

            if not rows:
                return "Không tìm thấy xe cũ phù hợp với tiêu chí tìm kiếm."

            lines = []
            for r in rows:
                price_fmt = f"{r['price']:,.0f} VNĐ" if r["price"] else "N/A"
                mileage_fmt = f"{r['mileage']:,} km" if r["mileage"] else "N/A"
                lines.append(
                    f"• {r['brand']} {r['model']} {r['year']} | "
                    f"Giá: {price_fmt} | Km: {mileage_fmt} | "
                    f"Màu: {r.get('color', 'N/A')} | {r.get('location', '')}"
                )
            return f"Tìm thấy {len(rows)} xe:\n" + "\n".join(lines)

        except Exception as exc:
            logger.info("Database unavailable (%s), returning fallback mock data for testing", exc)
            mock_cars = [
                {"brand": "Toyota", "model": "Camry 2.5Q", "year": 2022, "price": 1180000000, "mileage": 25000, "color": "Trắng ngọc trai", "location": "Hà Nội"},
                {"brand": "Honda", "model": "CR-V 1.5L", "year": 2021, "price": 920000000, "mileage": 38000, "color": "Xanh titan", "location": "TP.HCM"},
                {"brand": "Hyundai", "model": "Tucson 2.0", "year": 2020, "price": 790000000, "mileage": 52000, "color": "Đỏ garnet", "location": "Hà Nội"},
                {"brand": "Mazda", "model": "CX-5 2.0", "year": 2023, "price": 850000000, "mileage": 12000, "color": "Trắng ngọc", "location": "Đà Nẵng"},
                {"brand": "VinFast", "model": "VF8 Plus", "year": 2023, "price": 1200000000, "mileage": 8000, "color": "Trắng", "location": "Hà Nội"},
                {"brand": "Kia", "model": "Sorento 2.2D", "year": 2022, "price": 1050000000, "mileage": 30000, "color": "Đen", "location": "Hà Nội"},
            ]
            filtered = mock_cars
            if brand:
                filtered = [c for c in filtered if brand.lower() in c["brand"].lower() or brand.lower() in c["model"].lower()]
            if min_price:
                filtered = [c for c in filtered if c["price"] >= min_price]
            if max_price:
                filtered = [c for c in filtered if c["price"] <= max_price]
            if year_from:
                filtered = [c for c in filtered if c["year"] >= year_from]
            if year_to:
                filtered = [c for c in filtered if c["year"] <= year_to]

            if not filtered:
                filtered = mock_cars[:limit]

            lines = []
            for r in filtered[:limit]:
                price_fmt = f"{r['price']:,.0f} VNĐ"
                mileage_fmt = f"{r['mileage']:,} km"
                lines.append(
                    f"• {r['brand']} {r['model']} {r['year']} | "
                    f"Giá: {price_fmt} | Km: {mileage_fmt} | "
                    f"Màu: {r['color']} | {r['location']}"
                )
            return f"Tìm thấy {len(lines)} xe (dữ liệu mô phỏng):\n" + "\n".join(lines)

    return search_used_cars
