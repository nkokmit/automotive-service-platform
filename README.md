# automotive-service-platform

Nền tảng dịch vụ chăm sóc và sửa chữa ô tô thông minh, kết hợp kiến trúc **Microservices (Spring Boot / Spring Cloud / MySQL / Kafka)** và **AI Services (LangGraph ReAct Agent / YOLOv8 ONNX / Qdrant Hybrid Search)**.

---

## Danh sách Services & Ports

| Service | Công nghệ / Vai trò | Port (Host) |
|---|---|---|
| `api-gateway` | Spring Cloud Gateway, JWT authentication, routing | **8000** |
| `discovery-server` | Netflix Eureka Service Registry | **8761** |
| `user-service` | Quản lý người dùng, phân quyền, xác thực | **8081** |
| `customer-vehicle-service` | Quản lý thông tin khách hàng, xe và lịch sử bảo dưỡng | **8082** |
| `damage-detection-service` | Nhận diện hư hỏng ngoại thất xe (YOLOv8s-seg ONNX) | **8001** |
| `agent-service` | Trợ lý AI hội thoại ReAct (LangGraph + FastAPI + 5 tools) | **8002** |
| `mysql` | Cơ sở dữ liệu quan hệ cho các Spring Boot services | **3306** |
| `kafka` | Message broker chế độ KRaft single-node | **9092** |
| `qdrant` | Vector database cho hybrid search tin tức / bảo dưỡng | **6333** |

---

## Hướng dẫn Khởi chạy với Docker Compose

### 1. Chuẩn bị file `.env`

```bash
cp .env.example .env
```

Mở `.env` và thiết lập các giá trị cấu hình:

*   **Database & Bảo mật Backend**:
    *   `MYSQL_ROOT_PASSWORD` và `MYSQL_PASSWORD`
    *   `JWT_SECRET`: Chuỗi Base64 tối thiểu 32 byte. Tạo nhanh bằng lệnh:
        ```bash
        # Linux / macOS / Git Bash:
        openssl rand -base64 48

        # PowerShell:
        [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
        ```
*   **Trí tuệ nhân tạo (AI Services)**:
    *   `OPENAI_API_KEY`: Key OpenAI để Agent suy luận và gọi tool (mặc định model `gpt-4o-mini`).

### 2. Khởi động toàn bộ nền tảng

```bash
docker compose up --build
```

Hoặc chỉ khởi động riêng các nhóm dịch vụ:
```bash
# Chỉ chạy Core Backend (MySQL, Kafka, Discovery, Gateway, Services):
docker compose up mysql kafka discovery-server user-service customer-vehicle-service api-gateway

# Chỉ chạy AI Services (Qdrant, Damage Detection, Agent Service):
docker compose up qdrant damage-detection-service agent-service
```

Thứ tự khởi động được điều khiển tự động qua Docker Healthcheck:
```text
mysql & kafka (healthy) ────────┐
qdrant (healthy) ───────────────┼──> backend services ──> api-gateway
discovery-server (healthy) ─────┘    damage-detection ────> agent-service
```

---

## Địa chỉ truy cập & Tài liệu API

| Mục đích | URL truy cập |
|---|---|
| **API Gateway** | `http://localhost:8000` |
| **Swagger UI (Backend tổng hợp)** | `http://localhost:8000/swagger-ui.html` |
| **Eureka Registry Dashboard** | `http://localhost:8761` |
| **Damage Detection API Docs** | `http://localhost:8001/docs` |
| **AI Agent Chat API Docs** | `http://localhost:8002/docs` |
| **Qdrant Vector DB REST** | `http://localhost:6333/dashboard` |
| **MySQL Database** | `localhost:3306` (dbs: `user_service`, `customer_vehicle_service`) |
| **Kafka Broker** | `localhost:9092` (PLAINTEXT) |

---

## Kiểm tra nhanh hệ thống (Smoke Test)

### 1. Đăng nhập Backend qua API Gateway
Dữ liệu seed sẵn cho môi trường dev: `username: admin` / `password: Admin@123`
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}'
```

### 2. Thử nghiệm AI Agent (ReAct)
Gửi câu hỏi tư vấn xe hoặc đặt lịch sửa chữa:
```bash
curl -X POST http://localhost:8002/api/v1/chat \
  -H 'Content-Type: application/json' \
  -d '{"message": "Tìm xe Toyota đời 2022 giá dưới 1.2 tỷ"}'
```

### 3. Thử nghiệm nhận diện hư hỏng xe (YOLOv8 ONNX)
Model hỗ trợ 6 lớp tổn thương: `dent`, `scratch`, `crack`, `glass shatter`, `lamp broken`, `tire flat`.
Chạy test trực tiếp từ terminal:
```powershell
& "C:\code\vehicle-damage-detection-assessment\env\Scripts\python.exe" scripts/test-damage-model.py
```

---

## Cấu trúc thư mục dự án

```text
automotive-service-platform/
├── ai-services/
│   ├── agent-service/               # LangGraph ReAct Agent (FastAPI, 5 tools)
│   └── damage-detection-service/    # YOLOv8s-seg ONNX inference service
├── backend/
│   ├── api-gateway/                 # Spring Cloud Gateway
│   ├── discovery-server/            # Netflix Eureka Server
│   ├── infra/mysql/init/            # Script khởi tạo nhiều database
│   └── services/
│       ├── user-service/            # Auth, User, Role
│       └── customer-vehicle-service/# Quản lý khách hàng, xe, lịch sử bảo dưỡng
├── contracts/                       # OpenAPI 3.1 specifications
├── scripts/
│   ├── run-local.ps1                # Chạy AI services local không cần Docker
│   ├── test-damage-model.py         # Script test trực tiếp ONNX model
│   └── test-agent-chat.py           # Script test hội thoại Agent
├── docker-compose.yml               # File compose hợp nhất toàn bộ hệ thống
└── .env.example                     # File biến môi trường mẫu
```

---

## Lệnh thường dùng

```bash
docker compose up -d                   # Khởi động ngầm toàn bộ service
docker compose ps                      # Xem trạng thái container và healthcheck
docker compose logs -f agent-service   # Theo dõi log service
docker compose down                    # Dừng hệ thống (giữ nguyên volumes)
docker compose down -v                 # Dừng và xóa toàn bộ dữ liệu database/volume
```