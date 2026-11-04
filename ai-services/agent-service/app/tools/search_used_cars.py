"""Tool: search_used_cars – MySQL async query for used car listings."""
from __future__ import annotations
import logging
from typing import Optional

from langchain_core.tools import tool
from sqlalchemy import text

from app.tools.schemas import SearchUsedCarsInput

logger = logging.getLogger(__name__)


def make_search_used_cars_tool(db_session_factory):
    """Factory that closes over the async MySQL session factory."""

    @tool(args_schema=SearchUsedCarsInput)
    async def search_used_cars(
        brand: Optional[str] = None,
        min_price: Optional[float] = None,
        max_price: Optional[float] = None,
        year_from: Optional[int] = None,
        year_to: Optional[int] = None,
        limit: int = 10,
    ) -> str:
        """Search used car listings from the MySQL database (`used_cars`).

        Filter by brand/model, price range in VND, and manufacture year.
        Returns a list of matching vehicles with key details.

        Use this when the user wants to:
        - Browse used cars for sale
        - Find specific brands or models within a budget
        - Lookup pricing for a car model year
        """
        try:
            conditions = []
            params: dict = {"limit": int(limit)}

            if brand:
                conditions.append("(LOWER(brand) LIKE :brand OR LOWER(model) LIKE :brand)")
                params["brand"] = f"%{brand.strip().lower()}%"
            if min_price is not None:
                conditions.append("price >= :min_price")
                params["min_price"] = float(min_price)
            if max_price is not None:
                conditions.append("price <= :max_price")
                params["max_price"] = float(max_price)
            if year_from is not None:
                conditions.append("year >= :year_from")
                params["year_from"] = int(year_from)
            if year_to is not None:
                conditions.append("year <= :year_to")
                params["year_to"] = int(year_to)

            where = "WHERE " + " AND ".join(conditions) if conditions else ""
            sql = text(
                f"""
                SELECT id, brand, model, year, price, mileage, color, location, description
                FROM used_cars
                {where}
                ORDER BY year DESC, price ASC
                LIMIT :limit
                """
            )

            async with db_session_factory() as session:
                result = await session.execute(sql, params)
                rows = result.mappings().all()

            if not rows:
                return "Không tìm thấy xe cũ phù hợp với tiêu chí tìm kiếm trong cơ sở dữ liệu MySQL."

            lines = []
            for r in rows:
                price_val = float(r["price"]) if r["price"] is not None else 0
                price_fmt = f"{price_val:,.0f} VNĐ" if price_val else "N/A"
                mileage_fmt = f"{int(r['mileage']):,} km" if r["mileage"] is not None else "N/A"
                desc = (r.get("description") or "").strip()
                desc_suffix = f" — {desc}" if desc else ""
                lines.append(
                    f"• **{r['brand']} {r['model']} ({r['year']})** | "
                    f"Giá: **{price_fmt}** | ODO: {mileage_fmt} | "
                    f"Màu: {r.get('color', 'N/A')} | Khu vực: {r.get('location', '')}{desc_suffix}"
                )
            return f"Tìm thấy {len(rows)} xe trong cơ sở dữ liệu MySQL:\n" + "\n".join(lines)

        except Exception as exc:
            logger.error("MySQL `used_cars` query failed: %s", exc)
            return f"Hiện chưa thể truy vấn bảng `used_cars` từ MySQL ({exc})."

    return search_used_cars
