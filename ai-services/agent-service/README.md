# Agent Service — Automotive Service Platform

AI trợ lý (LangGraph ReAct) cho nền tảng dịch vụ ô tô.

## Chức năng

- **Trợ lý AI chat** (`/api/v1/chat`): hỏi đáp về bảo dưỡng, sửa chữa, tra cứu
  lịch sử dịch vụ, gợi ý linh kiện thay thế.
- **Hybrid retrieval** trên Qdrant (dense + BM25) để tìm tài liệu liên quan.
- **Tool calling**: đọc catalog dịch vụ / phụ tùng từ API Gateway, đọc hồ sơ
  khách hàng & lịch sử bảo dưỡng từ MySQL, ước tính chi phí sửa chữa.
- **Chẩn đoán hư hỏng**: gọi `damage-detection-service` để phân tích ảnh và
  sinh `recommended_items` cho người dùng.

## Chạy

```bash
# Docker (khuyến nghị — xem docker-compose.yml ở thư mục gốc)
docker compose up agent-service

# Local
uvicorn app.main:app --app-dir ai-services/agent-service --port 8002 --reload
```

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `GEMINI_API_KEY` | — | API key Gemini (tuỳ chọn) |
| `GEMINI_MODEL` | `gemini-3-flash-preview` | Model Gemini |
| `OPENAI_API_KEY` | — | API key OpenAI (tuỳ chọn) |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model OpenAI |
| `QDRANT_URL` | `http://qdrant:6333` | Qdrant vector DB |
| `API_GATEWAY_URL` | `http://api-gateway:8000` | Cổng API Gateway |
| `DAMAGE_SERVICE_URL` | `http://damage-detection-service:8001` | Damage detection service |

## API docs

- Swagger UI: <http://localhost:8002/docs>
- Health check: <http://localhost:8002/api/v1/health>
