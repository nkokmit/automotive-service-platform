"""Seed car_news collection in Qdrant with Dense (all-MiniLM-L6-v2) and Sparse (BM25) vectors."""
import os
import sys
import uuid
from pathlib import Path
from qdrant_client import QdrantClient
from qdrant_client.models import (
    VectorParams,
    Distance,
    SparseVectorParams,
    SparseVector,
    PointStruct,
    Prefetch,
    FusionQuery,
    Fusion,
)

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

from typing import Optional
from pydantic import Field, HttpUrl, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parent.parent

class QdrantSeedSettings(BaseSettings):
    """Configuration for seeding Qdrant loaded from .env via pydantic-settings."""
    model_config = SettingsConfigDict(
        env_file=[str(ROOT / ".env"), str(ROOT / "ai-services" / "agent-service" / ".env"), ".env"],
        env_file_encoding="utf-8",
        extra="ignore",
    )
    qdrant_url: str = Field(default="http://localhost:6333", description="Qdrant endpoint")
    qdrant_api_key: Optional[SecretStr] = Field(default=None, description="Qdrant API key")
    qdrant_news_collection: str = Field(default="car_news", description="Collection name")

    @field_validator("qdrant_url")
    @classmethod
    def validate_url(cls, v: str) -> str:
        HttpUrl(v.strip())
        return v.strip().rstrip("/")

seed_settings = QdrantSeedSettings()
QDRANT_URL = seed_settings.qdrant_url
COLLECTION_NAME = seed_settings.qdrant_news_collection

# 15 bài viết cẩm nang & tin tức ô tô tiếng Việt chi tiết
ARTICLES = [
    {
        "title": "Lịch bảo dưỡng định kỳ xe ô tô theo mốc km chuẩn quốc tế",
        "category": "maintenance",
        "content": (
            "Quy trình bảo dưỡng ô tô định kỳ chuẩn chia theo 4 cấp độ: "
            "1. Cấp 1 (5.000 km hoặc 6 tháng): Thay dầu động cơ, kiểm tra mức nước làm mát, nước rửa kính, dầu phanh. "
            "2. Cấp 2 (10.000 km hoặc 12 tháng): Thay dầu, lọc dầu, vệ sinh lọc gió động cơ, đảo lốp để lốp mòn đều. "
            "3. Cấp 3 (20.000 km hoặc 24 tháng): Thay lọc gió động cơ, lọc gió điều hòa cabin, kiểm tra góc đặt bánh xe và phanh. "
            "4. Cấp 4 (40.000 km hoặc 48 tháng - Bảo dưỡng lớn): Thay dầu hộp số, dầu phanh, dầu trợ lực lái, nước làm mát động cơ, "
            "thay lọc xăng/nhiên liệu, thay bugi và kiểm tra toàn bộ hệ thống gầm rô-tuyn."
        ),
        "source": "AutoCare Vietnam",
        "url": "https://autocare.vn/lich-bao-duong-dinh-ky",
    },
    {
        "title": "Cẩm nang chăm sóc lốp xe ô tô: Áp suất lốp, đảo lốp và nhận biết lốp hỏng",
        "category": "tires",
        "content": (
            "Lốp xe là bộ phận duy nhất tiếp xúc với mặt đường và quyết định trực tiếp tới an toàn. "
            "Áp suất lốp chuẩn thông thường từ 2.2 đến 2.5 bar (xem tem dán ở mép cửa lái). "
            "Nên kiểm tra áp suất khi lốp nguội mỗi 2 tuần một lần. "
            "Cần đảo lốp mỗi 8.000 - 10.000 km theo sơ đồ đảo chéo hoặc đảo thẳng tùy hệ dẫn động FWD hay RWD. "
            "Thay lốp ngay khi rãnh gai còn dưới 1.6mm (gờ TWI chạm mặt lốp), hoặc lốp bị phồng/chửa mép, nứt chân chim sâu hoặc rách hông."
        ),
        "source": "TireCare VN",
        "url": "https://tirecare.vn/cam-nang-lop",
    },
    {
        "title": "Hướng dẫn xử lý khi lốp xe bị xẹp hoặc dính đinh trên đường",
        "category": "emergency",
        "content": (
            "Khi xe bị xẹp lốp hoặc cán phải đinh (tire flat): "
            "1. Tuyệt đối không tiếp tục chạy xe vì vành (la-zăng) sẽ nghiến nát lốp và làm cong vành xe. "
            "2. Bật đèn khẩn cấp hazard, tấp xe từ từ vào lề đường bằng phẳng và an toàn, kéo phanh tay và cài số P (số 1 với xe số sàn). "
            "3. Chèn bánh xe đối diện, dùng kích nâng xe và thay lốp dự phòng bằng tuýp mở ốc hình chữ thập. "
            "4. Nếu chỉ có bộ vá khẩn cấp: bơm keo tự vá và dùng bơm mini 12V bơm lốp lên đủ 2.2 bar rồi chạy dưới 60km/h đến tiệm vá xe gần nhất."
        ),
        "source": "Cứu Hộ Giao Thông 24/7",
        "url": "https://cuuho247.vn/xu-ly-xep-lop",
    },
    {
        "title": "Phương pháp phục hồi vết móp vỏ xe ô tô bằng công nghệ PDR (Paintless Dent Repair)",
        "category": "body_damage",
        "content": (
            "Vết móp trên thân xe (dent) do va chạm nhẹ, đá văng hoặc cửa xe khác va quẹt có thể khắc phục bằng kỹ thuật PDR "
            "(nắn móp không sơn lại). Kỹ thuật viên sử dụng bộ thanh gạt chuyên dụng luồn vào mặt sau tấm kim loại kết hợp đèn phản quang "
            "để day nắn tỉ mỉ, hoặc dùng nấm hút keo nhiệt từ bên ngoài. Ưu điểm của PDR là giữ được lớp sơn zin nguyên bản của xe, "
            "thời gian thi công chỉ từ 30 phút đến 2 tiếng và chi phí chỉ bằng 1/3 so với gò sơn truyền thống."
        ),
        "source": "Vietnam Car Care",
        "url": "https://vietnamcarcare.com/cong-nghe-pdr",
    },
    {
        "title": "Phân loại vết xước xe ô tô và cách xử lý tại nhà và tại gara",
        "category": "paint_damage",
        "content": (
            "Vết xước sơn xe (scratch) chia làm 3 mức độ: "
            "1. Xước lớp bóng trong suốt (Clear coat): Khi tưới nước lên vết xước biến mất. Có thể tự đánh bóng bằng paste Cana hoặc dung dịch Scratch Remover. "
            "2. Xước chạm lớp sơn màu (Base coat): Vết xước lộ màu sơn khác, móng tay móc vào bị khựng lại. Cần dùng bút chấm sơn viền và đánh bóng lại. "
            "3. Xước sâu chạm tôn kim loại (Primer/Bare metal): Lộ màu xám kim loại, nếu để lâu sẽ bị rỉ sét (rust). "
            "Bắt buộc phải sơn dặm và sấy hồng ngoại tại gara chuyên nghiệp."
        ),
        "source": "Detailing Vietnam",
        "url": "https://detailing.vn/xu-ly-vet-xuoc-son",
    },
    {
        "title": "Hàn kính chắn gió ô tô bị nứt mắt bò và nứt tia: Khi nào nên hàn, khi nào phải thay kính?",
        "category": "glass_damage",
        "content": (
            "Kính chắn gió ô tô (windshield) là loại kính an toàn nhiều lớp (laminated glass). "
            "Khi bị đá văng tạo vết nứt dạng mắt bò, nứt sao (star break) hoặc nứt tia (crack) dưới 3cm và không nằm trực tiếp trong tầm nhìn lái xe, "
            "hoàn toàn có thể hàn kính bằng cách bơm keo quang học UV chuyên dụng. Keo hàn phục hồi tới 90-95% độ trong suốt và ngăn nứt lan. "
            "Nếu vết nứt dài trên 15cm hoặc nứt từ mép kính chạy vào thì bắt buộc phải thay kính mới để đảm bảo độ cứng vững khung xe."
        ),
        "source": "AutoGlass Repair",
        "url": "https://autoglass.vn/han-kinh-chan-gio",
    },
    {
        "title": "Cách khắc phục và thay thế đèn pha ô tô bị vỡ, rạn nứt hoặc hấp hơi nước",
        "category": "lamp_damage",
        "content": (
            "Đèn pha (headlamp) và đèn hậu (taillight) bị vỡ (lamp broken) làm nước mưa lọt vào làm chập cháy bóng LED/xenon và ố mờ chóa phản xạ. "
            "Nếu chỉ bị nứt nhẹ mặt mica ngoài, gara có thể thay mặt kính chụp đèn pha mới mà không cần thay cả cụm đèn đắt đỏ. "
            "Nếu vỡ cả chân đèn hoặc gãy chóa bên trong, cần thay thế cụm đèn OEM hoặc đèn tháo xe chính hãng để đảm bảo luồng sáng chuẩn không gây chói mắt xe ngược chiều."
        ),
        "source": "Auto Lighting VN",
        "url": "https://autolighting.vn/xu-ly-den-pha-vo",
    },
    {
        "title": "Dấu hiệu cảnh báo hệ thống phanh ô tô gặp trục trặc nguy hiểm",
        "category": "safety",
        "content": (
            "Hệ thống phanh là bộ phận an toàn tối quan trọng trên ô tô. Cần kiểm tra phanh ngay lập tức nếu xuất hiện các dấu hiệu: "
            "1. Có tiếng kêu rít kim loại ken két khi đạp phanh (dấu hiệu má phanh đã mòn trơ cốt thép báo mòn). "
            "2. Đạp phanh thấy hẫng, chân phanh mềm hoặc phải đạp sát sàn (rò rỉ dầu phanh hoặc lọt khí trong đường ống phanh). "
            "3. Xe bị giật lệch lái sang một bên khi phanh gấp (kẹt piston cùm phanh caliper). "
            "4. Đĩa phanh có gờ sâu, xước rãnh hoặc bị cong vênh gây rung vô lăng khi đạp phanh ở tốc độ cao."
        ),
        "source": "BrakeService Pro",
        "url": "https://brakeservice.vn/dau-hieu-hong-phanh",
    },
    {
        "title": "Bảng giá tham khảo các hạng mục bảo dưỡng và phụ tùng ô tô phổ biến 2026",
        "category": "pricing",
        "content": (
            "Giá bảo dưỡng tham khảo tại các garage uy tín: "
            "- Thay dầu nhớt động cơ khoáng/bán tổng hợp: 350.000 - 600.000 VNĐ (4 lít). "
            "- Dầu tổng hợp toàn phần Full Synthetic (10.000 km): 800.000 - 1.400.000 VNĐ. "
            "- Cân bằng động và bấm chì 4 bánh: 200.000 - 300.000 VNĐ. "
            "- Căn chỉnh góc đặt bánh xe độ chụm thước lái: 400.000 - 600.000 VNĐ. "
            "- Vệ sinh buồng đốt hydro và kim phun buồng đốt: 400.000 - 800.000 VNĐ. "
            "- Bảo dưỡng tra mỡ 4 cùm phanh caliper: 250.000 - 400.000 VNĐ."
        ),
        "source": "Bảng Giá Gara Toàn Quốc",
        "url": "https://banggiaoto.vn/chi-phi-bao-duong",
    },
    {
        "title": "Thông tin triệu hồi xe (Recall) tại Việt Nam và quyền lợi của chủ xe",
        "category": "recall",
        "content": (
            "Triệu hồi xe là chương trình do nhà sản xuất ô tô thực hiện dưới sự giám sát của Cục Đăng kiểm Việt Nam "
            "nhằm khắc phục miễn phí các lỗi kỹ thuật tiềm ẩn nguy cơ mất an toàn (ví dụ: lỗi bơm nhiên liệu Denso, lỗi túi khí Takata, lỗi cảm biến ABS). "
            "Chủ xe được miễn phí 100% tiền phụ tùng và công thay thế tại đại lý chính hãng. "
            "Người dùng có thể tra cứu số khung VIN trên cổng thông tin đăng kiểm để biết xe mình có thuộc diện triệu hồi hay không."
        ),
        "source": "Cục Đăng Kiểm & An Toàn Xe",
        "url": "https://vr.org.vn/trieu-hoi-xe",
    },
    {
        "title": "Bảo dưỡng hệ thống điều hòa ô tô: Cách xử lý mùi hôi và lạnh không sâu",
        "category": "ac_service",
        "content": (
            "Điều hòa xe ô tô bị kém lạnh hoặc có mùi ẩm mốc khó chịu thường do: "
            "1. Lọc gió điều hòa cabin quá bẩn tích tụ vi khuẩn nấm mốc (nên thay mới sau mỗi 15.000 - 20.000 km, giá từ 100.000 - 250.000 VNĐ). "
            "2. Dàn lạnh bị đóng cặn bẩn, cần vệ sinh dàn lạnh bằng phương pháp nội soi không cần tháo taplo. "
            "3. Hao hụt gas lạnh hoặc hỏng lốc điều hòa (lốc nén). Cần kiểm tra rò rỉ gioăng phớt, hút chân không và nạp lại ga R134a hoặc R1234yf chuẩn áp suất."
        ),
        "source": "AC Auto Center",
        "url": "https://acautocenter.vn/bao-duong-dieu-hoa",
    },
    {
        "title": "Bảo dưỡng ắc quy ô tô: Dấu hiệu ắc quy yếu và tuổi thọ trung bình",
        "category": "battery",
        "content": (
            "Ắc quy ô tô thông thường (ắc quy nước hoặc khô chì-axit, ắc quy EFB/AGM cho xe start-stop) có tuổi thọ từ 2 đến 3 năm. "
            "Dấu hiệu ắc quy yếu: đề xe khó nổ, tiếng củ đề quay chậm, đèn pha bị tối khi nổ máy, cọc bình đóng muối trắng xanh. "
            "Nên kiểm tra điện áp sạc của máy phát (chuẩn 13.8V - 14.4V khi nổ máy). "
            "Khi thay mới, nên chọn thương hiệu uy tín như GS, Varta, Atlas, Rocket đúng thông số dung lượng Ah và cọc bình (L/R)."
        ),
        "source": "Battery Care VN",
        "url": "https://batterycare.vn/tuoi-tho-ac-quy",
    },
]


def get_dense_embeddings(texts: list[str]) -> list[list[float]]:
    """Generate 384-dimensional dense vectors using FastEmbed or SentenceTransformer."""
    try:
        from fastembed import TextEmbedding
        print("[+] Đang nạp mô hình Dense TextEmbedding (sentence-transformers/all-MiniLM-L6-v2)...")
        dense_model = TextEmbedding(model_name="sentence-transformers/all-MiniLM-L6-v2")
        return [vec.tolist() for vec in dense_model.embed(texts)]
    except Exception as exc:
        print(f"[!] FastEmbed dense không khả dụng ({exc}), chuyển sang sentence_transformers...")
        from sentence_transformers import SentenceTransformer
        dense_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        return [vec.tolist() for vec in dense_model.encode(texts)]


def get_sparse_embeddings(texts: list[str]) -> list[SparseVector]:
    """Generate BM25 sparse vectors using FastEmbed or deterministic lexical TF fallback."""
    try:
        from fastembed import SparseTextEmbedding
        print("[+] Đang nạp mô hình Sparse BM25 (Qdrant/bm25)...")
        bm25_model = SparseTextEmbedding(model_name="Qdrant/bm25")
        return [
            SparseVector(indices=sp.indices.tolist(), values=sp.values.tolist())
            for sp in bm25_model.embed(texts)
        ]
    except Exception:
        import math
        import re
        import zlib
        from collections import Counter

        print("[+] Tạo Sparse Vector (Lexical TF-Hash) cho tìm kiếm từ khóa kết hợp (Hybrid Search)...")
        results = []
        for text in texts:
            tokens = re.findall(r"\w+", text.lower())
            counts = Counter(
                zlib.crc32(t.encode("utf-8")) % 1_000_000
                for t in tokens
                if len(t) > 1
            )
            indices = sorted(counts.keys())
            values = [round(1.0 + math.log(counts[i]), 4) for i in indices]
            results.append(SparseVector(indices=indices, values=values))
        return results


def main():
    print(f"[*] Kết nối tới Qdrant tại: {QDRANT_URL}")
    client = QdrantClient(url=QDRANT_URL, timeout=10, check_compatibility=False)

    # 1. Tạo lại collection car_news với cấu hình Hybrid Vector (Dense + Sparse)
    print(f"[*] Đang khởi tạo Collection '{COLLECTION_NAME}' trong Qdrant...")
    if client.collection_exists(COLLECTION_NAME):
        client.delete_collection(COLLECTION_NAME)
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config={
            "dense": VectorParams(size=384, distance=Distance.COSINE),
        },
        sparse_vectors_config={
            "sparse": SparseVectorParams(),
        },
    )
    print(f"[+] Đã tạo thành công collection '{COLLECTION_NAME}' với cấu hình Hybrid Search (Dense 384d + Sparse)!")

    # 2. Tạo embeddings cho các bài viết
    texts_to_embed = [f"{a['title']}. {a['content']}" for a in ARTICLES]
    dense_vectors = get_dense_embeddings(texts_to_embed)
    sparse_vectors = get_sparse_embeddings(texts_to_embed)

    # 3. Tạo PointStruct và đẩy lên Qdrant
    points = []
    for i, article in enumerate(ARTICLES):
        vector_data = {
            "dense": dense_vectors[i],
            "sparse": sparse_vectors[i],
        }

        point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"article-{i}-{article['title']}"))
        points.append(
            PointStruct(
                id=point_id,
                vector=vector_data,
                payload=article,
            )
        )

    print(f"[*] Đang nạp {len(points)} bài viết vào Qdrant...")
    client.upsert(collection_name=COLLECTION_NAME, points=points)
    print(f"[+] NẠP THÀNH CÔNG {len(points)} BÀI VIẾT VÀO QDRANT!")

    # 4. Xác minh tìm kiếm Hybrid Search (Dense + Sparse RRF Fusion) trên Qdrant
    print("\n--- XÁC MINH HYBRID SEARCH (DENSE + SPARSE RRF) TRÊN QDRANT ---")
    test_query = "Lốp xe bị mòn và xẹp thì xử lý thế nào?"
    print(f"Query test: '{test_query}'")
    query_dense = get_dense_embeddings([test_query])[0]
    query_sparse = get_sparse_embeddings([test_query])[0]

    results = client.query_points(
        collection_name=COLLECTION_NAME,
        prefetch=[
            Prefetch(query=query_dense, using="dense", limit=6),
            Prefetch(query=query_sparse, using="sparse", limit=6),
        ],
        query=FusionQuery(fusion=Fusion.RRF),
        limit=3,
        with_payload=True,
    )

    for idx, hit in enumerate(results.points, 1):
        print(f"  {idx}. [RRF Score: {hit.score:.4f}] {hit.payload.get('title')}")
        print(f"     Nội dung: {hit.payload.get('content')[:120]}...\n")

    print("[SUCCESS] Hoàn tất nạp dữ liệu Qdrant! Bạn có thể xem dashboard tại http://localhost:6333/dashboard")


if __name__ == "__main__":
    main()

