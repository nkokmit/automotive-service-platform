# automotive-service-platform

Nền tảng dịch vụ sửa chữa ô tô, kiến trúc microservices với Spring Boot, Spring Cloud
Gateway, Eureka và MySQL.

## Thành phần trong phạm vi hiện tại

| Service                    | Vai trò                              | Port (host)                  |
|----------------------------|--------------------------------------|------------------------------|
| `api-gateway`              | Entry point, routing, xác thực JWT   | 8000                         |
| `discovery-server`         | Service registry (Eureka)            | 8761                         |
| `user-service`             | User / role / permission, đăng nhập | 8081                         |
| `customer-vehicle-service` | Customer / vehicle / lịch sử bảo dưỡng | 8082                       |
| `staff-service`            | Hồ sơ nhân viên và lịch làm việc     | 8083                         |
| `inventory-service`        | Catalog, kho và reservation          | 8084                         |
| `booking-service`          | Lịch hẹn                              | 8085                         |
| `work-order-service`       | Work Order và tiến độ sửa chữa       | Nội bộ, chỉ qua API Gateway  |
| `mysql`                    | MySQL cho các microservice            | 3306                         |
| `kafka`                    | Kafka                                | 9092                         |

Backend dùng chung multi-stage `backend/Dockerfile`. Work Order Service không
publish port ra host; truy cập API qua API Gateway.

## Chạy bằng Docker Compose

Yêu cầu Docker Engine và Docker Compose plugin đang chạy, đủ RAM và dung lượng
cho các service, kết nối mạng để tải image/dependency lần đầu, và các host
port trong `.env.example` còn trống.
Sau khi clone, cần tạo `.env` một lần trước khi chạy Compose; các giá trị bí mật
không được lưu sẵn trong repository.

### 1. Chuẩn bị `.env`

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
| OpenAPI customer vehicle | http://localhost:8000/v3/api-docs/customer-vehicle-service |
| OpenAPI staff service | http://localhost:8000/v3/api-docs/staff-service |
| MySQL                 | localhost:3306 (các database service được bootstrap ở trên) |
| Kafka broker          | localhost:9092 (PLAINTEXT, không auth)                |

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

Staff Service kiểm tra quyền trên claim JWT `authorities` cho từng API.
Migration V9 của User Service cấp toàn quyền quản lý hồ sơ và lịch cho
`ADMIN`/`MANAGER`; `MECHANIC` chỉ được đọc hồ sơ nhân viên, ca làm và lịch.
`CUSTOMER` không có quyền Staff Service. Cần đăng nhập lại sau khi thay đổi
quyền của role để token có authorities mới.

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

Trong `api-gateway`, `user-service`, `customer-vehicle-service` và
`staff-service`, chỉ `/actuator/health/**` được permit — các Actuator endpoint
khác vẫn yêu cầu xác thực.

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

Cho `customer-vehicle-service`, thay `DB_URL` bằng database của service:

``` text
DB_URL=jdbc:mysql://localhost:3306/customer_vehicle_service
```

Cho `staff-service`, dùng database riêng và thêm múi giờ lịch:

```text
DB_URL=jdbc:mysql://localhost:3306/staff_service
SCHEDULE_ZONE_ID=Asia/Ho_Chi_Minh
```

Service đang dùng Kafka thì thêm:

``` text
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
```

Giá trị mặc định trong `application.yaml` đã là `localhost:9092`, nên khi chạy
từ IDE thường không cần khai báo. Chỉ cần override nếu bạn đổi `KAFKA_PORT`.
Lưu ý chỉ có **hạ tầng Kafka** (broker + producer/consumer config); chưa có
service nào phát hoặc nhận event, nên topic sẽ không tự xuất hiện.

Ngoài ra:

- `user-service`, `customer-vehicle-service` và `staff-service` yêu cầu
  `JWT_SECRET`, `DB_USERNAME`, `DB_PASSWORD`; `staff-service` cũng yêu cầu
  `SCHEDULE_ZONE_ID`. Ứng dụng sẽ fail fast khi thiếu cấu hình bắt buộc.
- Các service dùng Flyway để tạo schema và Hibernate `ddl-auto: validate` để
  xác nhận schema khi khởi động.
- Test `contextLoads` cần MySQL sẵn sàng; chạy MySQL qua
  `docker compose up mysql` rồi mới chạy test.
- Warm-up: sau khi `user-service` healthy, gateway cần vài giây để registry đồng bộ.

## Cấu trúc thư mục

``` text
backend/
├── Dockerfile              # Multi-stage, dùng chung, chọn module bằng ARG MODULE_PATH
├── discovery-server/
├── api-gateway/
├── infra/
│   └── mysql/init/         # Script entrypoint MySQL, chỉ chạy khi volume trống
├── services/
│   ├── user-service/
│   ├── customer-vehicle-service/
│   └── staff-service/
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
- Actuator đã được giới hạn, nhưng Swagger UI và OpenAPI vẫn được permit để phục
  vụ tài liệu API.
- `user-service`, `customer-vehicle-service` và `staff-service` được expose ở
  host port chỉ để phục vụ dev/debug; gateway là entry point theo kiến trúc.
  Không expose port các microservice ra ngoài trong production.