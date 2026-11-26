# automotive-service-platform

Nền tảng dịch vụ chăm sóc và sửa chữa ô tô thông minh, kết hợp kiến trúc **Microservices (Spring Boot / Spring Cloud / MySQL / Kafka)** và **AI Services (LangGraph ReAct Agent / YOLOv8 ONNX / Qdrant Hybrid Search)**.

---

## Danh sách Services & Ports

| Service | Công nghệ / Vai trò | Port (Host) |
|---|---|---|
| `api-gateway` | Spring Cloud Gateway, JWT authentication, routing | 8000 |
| `discovery-server` | Netflix Eureka Service Registry | 8761 |
| `user-service` | Quản lý người dùng, phân quyền, xác thực | 8081 |
| `customer-vehicle-service` | Quản lý thông tin khách hàng, xe và lịch sử bảo dưỡng | 8082 |
| `staff-service` | Hồ sơ nhân viên và lịch làm việc | 8083 |
| `inventory-service` | Catalog, kho và reservation | 8084 |
| `booking-service` | Lịch hẹn | 8085 |
| `work-order-service` | Work Order và tiến độ sửa chữa | 8086 (dev/debug) |
| `damage-detection-service` | Nhận diện hư hỏng ngoại thất xe (YOLOv8s-seg ONNX) | 8001 |
| `agent-service` | Trợ lý AI hội thoại ReAct (LangGraph + FastAPI) | 8002 |
| `mysql` | Cơ sở dữ liệu quan hệ cho các services | 3306 |
| `kafka` | Message broker chế độ KRaft single-node | 9092 |
| `qdrant` | Vector database cho hybrid search tin tức / bảo dưỡng | 6333 |

Backend dùng chung multi-stage `backend/Dockerfile`. Trong dev/debug, các business service publish host port; khi deploy production, bỏ toàn bộ port mapping trực tiếp của các business service và truy cập API qua API Gateway.

---

## Hướng dẫn Khởi chạy với Docker Compose

Yêu cầu Docker Engine và Docker Compose plugin đang chạy, đủ RAM và dung lượng
cho các service, kết nối mạng để tải image/dependency lần đầu, và các host
port trong `.env.example` còn trống.
Sau khi clone, cần tạo `.env` một lần trước khi chạy Compose; các giá trị bí mật
không được lưu sẵn trong repository.

### 1. Chuẩn bị file `.env`

```bash
cp .env.example .env
```

Mở `.env` và điền 3 giá trị bí mật bắt buộc:

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `JWT_SECRET` — chuỗi Base64 hợp lệ, giải mã ra **tối thiểu 32 byte**

`SCHEDULE_ZONE_ID` đã có giá trị mẫu `Asia/Ho_Chi_Minh`; thay đổi nếu cần
dùng múi giờ IANA khác.

`JWT_SECRET` được dùng chung cho API Gateway và các microservice xác thực JWT.

Tạo `JWT_SECRET` bằng `openssl rand -base64 48`. AI Agent có thể dùng
`OPENAI_API_KEY` hoặc `GEMINI_API_KEY`; cả hai đều tùy chọn.
`.env` đã nằm trong `.gitignore`; không commit file này. Nếu bỏ trống các biến
bắt buộc, `docker compose up` sẽ báo lỗi thay vì chạy với secret mặc định yếu.

### 2. Khởi động toàn bộ nền tảng

```bash
docker compose up --build
```

MySQL tự tạo database `user_service` (qua `MYSQL_DATABASE`). Compose chạy
`mysql-bootstrap` sau khi MySQL sẵn sàng để tạo các database
`customer_vehicle_service`, `staff_service`, `inventory_service`,
`booking_service`, `work_order_service` kèm quyền cho `MYSQL_USER` qua script
init; các service chờ bootstrap thành công trước khi khởi động. Script có thể
chạy lại an toàn và bổ sung database khi volume đã tồn tại, không cần thao tác
thủ công hay xóa dữ liệu. Có thể đổi tên bằng các biến `*_MYSQL_DATABASE` tương
ứng trong `.env`. Không dùng `docker compose down -v` nếu cần giữ dữ liệu.

Thứ tự khởi động được điều khiển bằng healthcheck. Work Order Service chờ
MySQL, Kafka, Eureka và các service tích hợp (Booking, Customer Vehicle,
Inventory, Staff); API Gateway chờ các service đã healthy.
Lần build và khởi động đầu tiên có thể mất vài phút.
Hoặc chỉ khởi động riêng các nhóm dịch vụ:
```bash
# Chỉ chạy Core Backend (MySQL, Kafka, Discovery, Gateway, Services):
docker compose up mysql mysql-bootstrap kafka discovery-server user-service customer-vehicle-service staff-service inventory-service booking-service work-order-service api-gateway

# Chỉ chạy AI Services (Qdrant, Damage Detection, Agent Service):
docker compose up qdrant damage-detection-service agent-service
```

---

### 3. Địa chỉ

| Mục đích              | URL                                              |
| --------------------- | ------------------------------------------------ |
| API Gateway           | http://localhost:8000                            |
| Swagger UI            | http://localhost:8000/swagger-ui.html           |
| OpenAPI user-service  | http://localhost:8000/v3/api-docs/user-service   |
| OpenAPI work-order-service | http://localhost:8000/v3/api-docs/work-order-service |
| Eureka dashboard      | http://localhost:8761                            |
| User service (nội bộ) | http://localhost:8081                            |
| Customer vehicle svc   | http://localhost:8082                            |
| Staff service (nội bộ) | http://localhost:8083                            |
| Work Order Service (dev/debug) | http://localhost:8086                     |
| OpenAPI customer vehicle | http://localhost:8000/v3/api-docs/customer-vehicle-service |
| OpenAPI staff service | http://localhost:8000/v3/api-docs/staff-service |
| MySQL                 | localhost:3306 (các database service được bootstrap ở trên) |
| Kafka broker          | localhost:9092 (PLAINTEXT, không auth)                |
| Damage Detection API Docs | http://localhost:8001/docs |
| AI Agent API Docs | http://localhost:8002/docs |
| Qdrant Vector DB REST | http://localhost:6333/dashboard |

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
## Lưu ý vận hành

- Đổi `JWT_SECRET` sẽ làm mất hiệu lực các token đang chạy.
- Actuator đã được giới hạn, nhưng Swagger UI và OpenAPI vẫn được permit để phục
  vụ tài liệu API.
- `user-service`, `customer-vehicle-service`, `staff-service`, `inventory-service`,
  `booking-service` và `work-order-service` được expose ở host port để phục vụ
  dev/debug; gateway vẫn là entry point theo kiến trúc. Khi deploy production,
  bỏ toàn bộ port mapping trực tiếp của các business service.
