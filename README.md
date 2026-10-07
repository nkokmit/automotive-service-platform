# automotive-service-platform

Nền tảng dịch vụ sửa chữa ô tô, kiến trúc microservices với Spring Boot, Spring Cloud
Gateway, Eureka và MySQL.

## Thành phần trong phạm vi hiện tại

| Service             | Vai trò                                | Port (host) |
| ------------------- | -------------------------------------- | ----------- |
| `api-gateway`       | Entry point, routing, xác thực JWT      | 8000        |
| `discovery-server`  | Service registry (Eureka)             | 8761        |
| `user-service`      | User / role / permission, đăng nhập    | 8081        |
| `mysql`             | MySQL cho `user-service`               | 3306        |

Các service còn lại trong `backend/automotive-ai-context/ARCHITECTURE.md` chưa được
cài đặt trong Compose.

## Chạy bằng Docker Compose

### 1. Chuẩn bị `.env`

```bash
cp .env.example .env
```

Mở `.env` và điền 3 giá trị bắt buộc:

- `MYSQL_ROOT_PASSWORD`
- `MYSQL_PASSWORD`
- `JWT_SECRET` — chuỗi Base64 hợp lệ, giải mã ra **tối thiểu 32 byte**
  (dùng chung cho `api-gateway` và `user-service`)

Sinh `JWT_SECRET`:

```bash
openssl rand -base64 48
```

`.env` đã nằm trong `.gitignore`. Không commit file này; chỉ commit
`.env.example`.

Nếu bỏ trống các biến bắt buộc, `docker compose up` sẽ báo lỗi ngay thay vì
chạy với secret mặc định yếu.

### 2. Khởi động

```bash
docker compose up --build
```

Thứ tự khởi động được điều khiển bằng healthcheck:

``` text
mysql (healthy)          ─┐
discovery-server (healthy) ─┼─> user-service (healthy) ─> api-gateway
```

### 3. Địa chỉ

| Mục đích              | URL                                              |
| --------------------- | ------------------------------------------------ |
| API Gateway           | http://localhost:8000                            |
| Swagger UI            | http://localhost:8000/swagger-ui.html           |
| OpenAPI user-service  | http://localhost:8000/v3/api-docs/user-service   |
| Eureka dashboard      | http://localhost:8761                            |
| User service (nội bộ) | http://localhost:8081                            |
| MySQL                 | localhost:3306 (db `user_service`)               |

### 4. Đăng nhập thử

Migration `V4__seed_data.sql` tạo sẵn dữ liệu cho môi trường dev:

``` text
username: admin
password: Admin@123
```

```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"Admin@123"}'
```

Lưu ý: mật khẩu seed là hash BCrypt cố định trong file migration, **không** được
điều khiển bởi biến môi trường. Không chạy migration này trên production.

Mọi request cần token:

```bash
curl http://localhost:8000/api/users \
  -H "Authorization: Bearer <accessToken>"
```

### 5. Kiểm tra nhanh

```bash
scripts/run-dev/smoke-test.sh
```

Script kiểm tra health, phạm vi Actuator, đăng nhập qua gateway, RBAC, Swagger
aggregation và Eureka registration.

## Actuator

Chỉ `health` được expose; `readiness` dùng cho healthcheck của Docker:

``` text
/actuator/health/readiness
```

Trong `api-gateway` và `user-service`, chỉ `/actuator/health/**` được permit —
các Actuator endpoint khác vẫn yêu cầu xác thực.

Lưu ý: `readiness` phản ánh trạng thái ứng dụng, **không** tự chứng minh kết nối
DB hay route qua gateway đang hoạt động.

## Chạy service từ IDE

Các service đọc cấu hình qua biến môi trường. Khi chạy ngoài Docker, cần override
tên service về `localhost`:

```text
DB_URL=jdbc:mysql://localhost:3306/user_service
DB_USERNAME=app
DB_PASSWORD=<MYSQL_PASSWORD>
JWT_SECRET=<JWT_SECRET>
EUREKA_SERVER_URL=http://localhost:8761/eureka/
```

Ngoài ra:

- `user-service` **không** được khởi động nếu chưa có `JWT_SECRET`, `DB_USERNAME`,
  `DB_PASSWORD` — ứng dụng sẽ fail fast.
- Test `contextLoads` cần MySQL sẵn sàng; chạy MySQL qua
  `docker compose up mysql` rồi mới chạy test.
- Warm-up: sau khi `user-service` healthy, gateway cần vài giây để registry đồng bộ.

## Cấu trúc thư mục

``` text
backend/
├── Dockerfile              # Multi-stage, dùng chung, chọn module bằng ARG MODULE_PATH
├── discovery-server/
├── api-gateway/
├── services/
│   └── user-service/
└── automotive-ai-context/  # Quy ước kiến trúc (GLOBAL_RULES, ARCHITECTURE)
```

Mỗi module có POM riêng; không có aggregator POM ở `backend/`.

## Lệnh thường dùng

```bash
docker compose up --build              # build và chạy toàn bộ
docker compose up -d                   # chạy nền
docker compose ps                      # trạng thái + health
docker compose logs -f user-service    # log service
docker compose down                    # dừng, giữ dữ liệu

# Xóa volume, database bị reset và Flyway chạy lại từ V1:
docker compose down -v
```

## Lưu ý vận hành

- Đổi `JWT_SECRET` sẽ làm mất hiệu lực các token đang chạy.
- Actuator đã được giới hạn, nhưng `/swagger-ui.html` vẫn được permit ở gateway
  và user-service để phục vụ tài liệu API.
- `user-service` được expose ở host port chỉ để phục vụ dev/debug; gateway là
  entry point theo kiến trúc.