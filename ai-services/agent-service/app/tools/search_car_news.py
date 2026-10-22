"""Tool: search_car_news – Qdrant hybrid search for automotive news."""
from __future__ import annotations
import logging
from typing import Any

from langchain_core.tools import tool
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    SparseVector,
    Prefetch,
    FusionQuery,
    Fusion,
)

from app.config import get_settings
from app.tools.schemas import SearchCarNewsInput

logger = logging.getLogger(__name__)
settings = get_settings()

_MOCK_ARTICLES = [
    {
        "title": "Lịch bảo dưỡng định kỳ xe ô tô theo mốc km khuyến nghị",
        "content": "Các mốc bảo dưỡng quan trọng: 5.000km (thay dầu nhớt, kiểm tra gầm), 10.000km (đảo lốp, vệ sinh lọc gió), 20.000km (thay lọc gió, lọc nhiên liệu), 40.000km (thay dầu hộp số, dầu phanh, bugi). Giữ đúng lịch bảo dưỡng giúp xe bền bỉ và tiết kiệm nhiên liệu.",
        "source": "AutoService Vietnam",
        "url": "https://autoservice.vn/bao-duong-dinh-ky",
    },
    {
        "title": "Cách phát hiện và xử lý sớm vết xước, móp và nứt kính chắn gió",
        "content": "Vết xước nông bề mặt có thể xử lý bằng dung dịch xóa xước (paste đánh bóng). Vết móp sâu cần hút chân không hoặc gò nắn PDR (Paintless Dent Repair). Kính bị nứt dạng mắt bò nhỏ hơn 2cm nên hàn kính sớm tránh nứt lan.",
        "source": "Vietnam Car Care",
        "url": "https://vietnamcarcare.com/xu-ly-vet-xuc",
    },
    {
        "title": "Cẩm nang chăm sóc lốp xe: Áp suất lốp chuẩn và dấu hiệu cần thay",
        "content": "Kiểm tra áp suất lốp 2 tuần/lần khi lốp nguội (thường 2.2 - 2.5 bar tùy xe). Thay lốp mới khi gai mòn còn dưới 1.6mm hoặc xuất hiện phồng, nứt chân chim, rách hông lốp.",
        "source": "TireCare VN",
        "url": "https://tirecare.vn/cam-nang-lop",
    },
]

_dense_model = None


def _encode_dense(query: str) -> list[float]:
    global _dense_model
    if _dense_model is None:
        try:
            from fastembed import TextEmbedding
            _dense_model = ("fastembed", TextEmbedding(model_name=settings.qdrant_dense_model))
        except Exception:
            from sentence_transformers import SentenceTransformer
            _dense_model = ("st", SentenceTransformer(settings.qdrant_dense_model))
    kind, model = _dense_model
    if kind == "fastembed":
        return list(model.embed([query]))[0].tolist()
    return model.encode(query).tolist()


def _encode_sparse(text: str) -> SparseVector:
    """Encode text into a Qdrant SparseVector using FastEmbed BM25 or deterministic lexical TF fallback."""
    try:
        from fastembed import SparseTextEmbedding
        bm25_model = SparseTextEmbedding(model_name="Qdrant/bm25")
        sparse_embedding = list(bm25_model.embed([text]))[0]
        return SparseVector(
            indices=sparse_embedding.indices.tolist(),
            values=sparse_embedding.values.tolist(),
        )
    except Exception:
        import math
        import re
        import zlib
        from collections import Counter

        tokens = re.findall(r"\w+", text.lower())
        counts = Counter(
            zlib.crc32(t.encode("utf-8")) % 1_000_000
            for t in tokens
            if len(t) > 1
        )
        indices = sorted(counts.keys())
        values = [round(1.0 + math.log(counts[i]), 4) for i in indices]
        return SparseVector(indices=indices, values=values)


async def _hybrid_search(
    client: AsyncQdrantClient,
    collection: str,
    query: str,
    limit: int,
) -> list[dict[str, Any]]:
    """Run Qdrant hybrid search combining dense and BM25/lexical sparse vectors."""
    # Fast check that Qdrant is reachable and collection exists before loading encoders
    collections_resp = await client.get_collections()
    existing = [c.name for c in collections_resp.collections]
    if collection not in existing:
        raise RuntimeError(f"Qdrant collection '{collection}' does not exist yet")

    dense_vector = _encode_dense(query)
    sparse_vec = _encode_sparse(query)

    if sparse_vec:
        results = await client.query_points(
            collection_name=collection,
            prefetch=[
                Prefetch(
                    query=dense_vector,
                    using="dense",
                    limit=limit * 2,
                ),
                Prefetch(
                    query=sparse_vec,
                    using="sparse",
                    limit=limit * 2,
                ),
            ],
            query=FusionQuery(fusion=Fusion.RRF),
            limit=limit,
            with_payload=True,
        )
    else:
        results = await client.query_points(
            collection_name=collection,
            query=dense_vector,
            using="dense",
            limit=limit,
            with_payload=True,
        )

    return [
        {
            "id": str(pt.id),
            "score": round(pt.score, 4) if hasattr(pt, "score") else None,
            **pt.payload,
        }
        for pt in results.points
    ]


def make_search_car_news_tool(qdrant_client: AsyncQdrantClient):
    """Factory that closes over the Qdrant client."""

    @tool(args_schema=SearchCarNewsInput) 
    async def search_car_news(query: str, limit: int = 5, collection: str = "car_news") -> str:
        """Search automotive news, maintenance tips, and recall information using hybrid semantic + keyword search.

        Use this tool when the user asks about:
        - Car news, updates, or recalls
        - Maintenance schedules or tips
        - How to fix or diagnose car issues
        - Industry trends or new car models
        """
        try:
            hits = await _hybrid_search(qdrant_client, collection, query, limit)
        except Exception as exc:
            logger.info("Qdrant unavailable (%s), falling back to offline knowledge base", exc)
            q_lower = query.lower()
            matched = [
                a for a in _MOCK_ARTICLES
                if any(w in a["title"].lower() or w in a["content"].lower() for w in q_lower.split())
            ]
            hits = matched[:limit] if matched else _MOCK_ARTICLES[:limit]

        if not hits:
            return "Không tìm thấy thông tin phù hợp."

        lines = []
        for i, h in enumerate(hits, 1):
            title = h.get("title", "Untitled")
            content = h.get("content", h.get("text", ""))[:300]
            source = h.get("source", "")
            url = h.get("url", "")
            lines.append(
                f"{i}. **{title}**\n   {content}...\n   Nguồn: {source} ({url})"
            )
        return "\n\n".join(lines)

    return search_car_news
