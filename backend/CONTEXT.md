# CONTEXT - Hệ thống quản lý Gara ô tô

> **Mục đích:**  
> File này cung cấp toàn bộ bối cảnh, kiến trúc, quy tắc và các quyết định kỹ thuật của dự án cho AI Coding Agent.
>
> AI **PHẢI đọc và tuân thủ file này** trước khi phân tích, tạo mới, sửa hoặc xóa code.
>
> Khi có sự mâu thuẫn giữa yêu cầu hiện tại và file này, **yêu cầu trực tiếp của developer được ưu tiên**, nhưng AI phải chỉ ra sự khác biệt trước khi thực hiện nếu nó ảnh hưởng đến kiến trúc hoặc dữ liệu.

---

# 1. Tổng quan dự án

## 1.1. Tên dự án

**Tên:** `automotive-service-platform`

## 1.2. Mô tả

Đây là hệ thống quản lý hoạt động của một gara ô tô, được xây dựng theo kiến trúc **Microservices**.

Hệ thống có nhiệm vụ quản lý:

- `[ ]` Khách hàng
- `[ ]` Xe
- `[ ]` Lịch hẹn
- `[ ]` Tiếp nhận xe
- `[ ]` Kiểm tra xe
- `[ ]` Sửa chữa
- `[ ]` Nhân viên / Kỹ thuật viên
- `[ ]` Phụ tùng
- `[ ]` Kho
- `[ ]` Hóa đơn
- `[ ]` Thanh toán
- `[ ]` Thông báo
- `[ ]` Khác: `[ĐIỀN]`

---

# 2. Mục tiêu kiến trúc

Hệ thống được xây dựng theo kiến trúc Microservices với các nguyên tắc chính:

1. Mỗi business domain chính được tách thành một service riêng.
2. Mỗi service sở hữu dữ liệu của chính nó.
3. Một service **không được truy cập trực tiếp database của service khác**.
4. Các service giao tiếp thông qua API hoặc message broker.
5. API Gateway là entry point chính từ phía client.
6. Database schema được quản lý bằng Flyway.
7. Hibernate/JPA không được tự động thay đổi database schema.
8. Các cấu hình môi trường và secret không được hard-code trong source code.
9. Ưu tiên giữ nguyên kiến trúc hiện tại thay vì tự ý refactor lớn.
10. AI không được tự ý thay đổi architecture nếu developer chưa yêu cầu.

---

# 3. Công nghệ sử dụng

## 3.1. Backend

| Công nghệ | Phiên bản   | Mục đích |
|---|-------------|---|
| Java | 21          | Ngôn ngữ lập trình |
| Spring Boot | 4.x         | Framework backend |
| MySQL | 9.7         | Database |

## 3.2. Hạ tầng

| Công nghệ | Sử dụng | Mục đích |
|---|---|---|
| Docker | `[Có]` | Container |
| Docker Compose | `[Có]` | Quản lý môi trường local |
| Eureka | `[Có]` | Service Discovery |
| Kafka | `[Có]` | Event-driven communication |
| Redis | `[Có]` | Cache |
| Keycloak | `[Không]` | Authentication / Authorization |

## 3.3. API Documentation (Swagger/OpenAPI)

- Chuẩn tài liệu hóa API: **springdoc-openapi** (OpenAPI 3), tích hợp Swagger UI.
- Dependency: `org.springdoc:springdoc-openapi-starter-webmvc-ui`, version `3.1.1` (dòng `3.x` của springdoc là dòng tương thích Spring Boot 4 / Spring Framework 7; dòng `2.8.x` chỉ hỗ trợ Spring Boot 3.x — **không dùng**).
- Mỗi service có REST API (dùng `spring-boot-starter-webmvc`) khi cần Swagger phải:
  - Thêm dependency trên vào `pom.xml` (pin version, không dùng range).
  - Tạo bean `OpenAPI` mô tả `title`, `description`, `version` trong package `config` (ví dụ `OpenApiConfig.java`), không hard-code thông tin nhạy cảm.
  - Swagger UI mặc định tại `/swagger-ui.html` (redirect tới `/swagger-ui/index.html`), OpenAPI JSON tại `/v3/api-docs`.
- Vì hệ thống dùng API Gateway (Spring Cloud Gateway) là entry point, các route Swagger của từng service nên được expose qua Gateway nếu cần truy cập tập trung — việc này chỉ triển khai khi có yêu cầu riêng, không tự ý thêm route Gateway nếu task chưa yêu cầu.
- Khi `SecurityConfig` của service được cập nhật để bật xác thực thật (JWT/Keycloak), **phải** đảm bảo whitelist các path `/v3/api-docs/**`, `/swagger-ui/**`, `/swagger-ui.html` nếu muốn giữ Swagger UI khả dụng (hoặc chủ động chặn ở môi trường production nếu không muốn public API docs).

---

# 4. Kiến trúc tổng thể

```text
                         ┌─────────────────┐
                         │    Frontend     │
                         └────────┬────────┘
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │     API Gateway          │
                    │ Spring Cloud Gateway     │
                    │        WebFlux           │
                    └────────────┬─────────────┘
                                 │
             ┌───────────────────┼───────────────────┐
             │                   │                   │
             ▼                   ▼                   ▼
      ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
      │User Service │     │Vehicle      │     │Repair       │
      │             │     │Service      │     │Service      │
      └──────┬──────┘     └──────┬──────┘     └──────┬──────┘
             │                   │                   │
             ▼                   ▼                   ▼
      ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
      │ user_service│     │vehicle_     │     │repair_      │
      │             │     │service      │     │service      │
      └─────────────┘     └─────────────┘     └─────────────┘


                    ┌──────────────────────┐
                    │   Service Discovery  │
                    │       Eureka         │
                    └──────────────────────┘

                    ┌──────────────────────┐
                    │        Kafka         │
                    │   Event Broker       │
                    └──────────────────────┘

                    ┌──────────────────────┐
                    │        Redis         │
                    │        Cache         │
                    └──────────────────────┘
```

> Sơ đồ trên chỉ là ví dụ. Phải cập nhật lại theo kiến trúc thực tế của project.

---

# 5. Danh sách Microservice

Điền danh sách service thực tế của project.

| Service                    | Port | Chức năng             | Database              |
|----------------------------|---:|-----------------------|-----------------------|
| `api-gateway`              | `[PORT]` | API Gateway           | Không                 |
| `discovery-server`         | `[PORT]` | Service Discovery     | Không                 |
| `kafka`                    | `[PORT]` | Kafka                 | Không                 |
| `redis`                    | `[PORT]` | Redis Cache           | Không                 |
| `user-service`             | `[PORT]` | Xác thực & Phân quyền | `user_service`        |
| `staff-service`            | `[PORT]` | Quản lý Nhân sự       | `staff_service`       |
| `customer-vehicle-service` | `[PORT]` | Hồ sơ Khách & Xe      | `customer-vehicle-service`     |
| `booking-service`          | `[PORT]` | Quản lý lịch hẹn      | `appointment_service` |
| `repair-service`           | `[PORT]` | Quản lý sửa chữa      | `repair_service`      |
| `inventory-service`        | `[PORT]` | Quản lý kho/phụ tùng  | `inventory_service`   |
| `billing-service`          | `[PORT]` | Hóa đơn/thanh toán    | `billing_service`     |
| `notification-service`     | `[PORT]` | Trung tâm Thông báo   | Không                 |

> Xóa các service không tồn tại và bổ sung service thực tế.

---

# 6. Quan hệ giữa các Service

Quan hệ giữa các service phải được mô tả rõ ràng.

Ví dụ:

```text
Customer
   │
   └── Vehicle
          │
          └── Repair Order
                    │
                    ├── Repair Item
                    ├── Used Part
                    └── Invoice
```

Nếu entity thuộc service khác, **không tạo JPA relationship trực tiếp**.

### Không được làm

```java
@ManyToOne
private Vehicle vehicle;
```

nếu `Vehicle` thuộc `vehicle-service` và entity hiện tại thuộc service khác.

### Phải làm

```java
private UUID vehicleId;
```

hoặc ID type thực tế của project.

---

# 7. Chiến lược ID

Project sử dụng:

```text
[UUID / Long / Integer / Khác]
```

Ví dụ:

```java
@Id
@GeneratedValue(strategy = GenerationType.UUID)
private UUID id;
```

AI phải sử dụng cùng chiến lược ID với project hiện tại.

**Không tự ý chuyển từ `Long` sang `UUID` hoặc ngược lại.**

---

# 8. Khởi tạo Database

Mục tiêu:

> Developer mới clone project phải có khả năng dựng môi trường database mà không cần tạo thủ công từng database.

Luồng mong muốn:

```text
docker compose up
        ↓
MySQL container
        ↓
Database được tạo
        ↓
Spring Boot service khởi động
        ↓
Flyway chạy migration
        ↓
Database hoàn chỉnh
```

---

# 9. Flyway

Flyway là **nguồn chính thức quản lý database schema**.

Migration nằm tại:

```text
src/main/resources/db/migration/
```

## Quy tắc Flyway

### Bắt buộc

- Mỗi thay đổi schema phải tạo migration mới.
- Version migration phải duy nhất.
- Tên migration phải mô tả rõ mục đích.
- Viết Idempotent Scripts
- Không được sửa migration đã chạy trên môi trường dùng chung.
- Không được xóa migration cũ để giải quyết lỗi.
- Không được dùng Hibernate để tự động update schema.

### Khuyến nghị

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

---

# 10. JPA / Hibernate

JPA/Hibernate chỉ chịu trách nhiệm mapping:

```text
Java Entity
      ↕
Database Table
```

Hibernate không được tự ý quản lý schema.

---

# 11. Authentication

Cơ chế authentication:

```text
[Keycloak / JWT / Auth Service / Khác]
```

Luồng:

```text
Client
   │
   ▼
Login
   │
   ▼
Authentication Server
   │
   ▼
JWT Access Token
   │
   ▼
API Gateway
   │
   ▼
Microservice
```

Thông tin JWT:

```text
sub: `[... ]`
username: `[... ]`
roles: `[... ]`
permissions: `[... ]`
```

> Điền chính xác các claim mà hệ thống thực tế sử dụng.

---

# 12. Authorization

Mô hình phân quyền:

```text
[RBAC / Permission / RBAC + Permission]
```

Roles:
> Quy ước: Thêm tiền tố ROLE_ để tạo thành kiểu như ví dụ bên dưới
```text
[ROLE_ADMIN]
[ROLE_MANAGER]
[ROLE_RECEPTIONIST]
[ROLE_MECHANIC]
[ROLE_CUSTOMER]
[ROLE_GUEST]
```

Permissions:
> Quy ước: Dạng NHÓM_ACTION như ví dụ bên dưới
```text
[VEHICLE_READ]
[VEHICLE_CREATE]
[VEHICLE_UPDATE]

[REPAIR_READ]
[REPAIR_CREATE]
[REPAIR_UPDATE]

[INVOICE_READ]
[INVOICE_CREATE]
...
```

AI không được tự ý tạo role/permission mới nếu chưa được yêu cầu.

---

# 13. Service-to-Service Communication

Các service giao tiếp bằng:

```text
[ ] OpenFeign
[ ] WebClient
[ ] REST
[ ] Kafka
[ ] Khác
```

# 14. Kafka

Nếu sử dụng Kafka:

Kafka được sử dụng cho các **domain event** hoặc xử lý bất đồng bộ.

Ví dụ:

```text
RepairCompletedEvent
VehicleCreatedEvent
InvoiceCreatedEvent
PaymentCompletedEvent
```

Không sử dụng Kafka chỉ vì "microservice phải dùng Kafka".

Chỉ sử dụng Kafka khi bài toán thực sự phù hợp với asynchronous/event-driven communication.

---

# 15. DTO

Không trả JPA Entity trực tiếp ra API.

Sử dụng:

```text
Request DTO
Response DTO
```

Flow:

```text
HTTP Request
      ↓
Request DTO
      ↓
Controller
      ↓
Service
      ↓
Entity
      ↓
Repository
      ↓
Database
```

Response:

```text
Database
      ↓
Entity
      ↓
Service
      ↓
Response DTO
      ↓
Controller
      ↓
HTTP Response
```

---

# 16. Controller

Controller phải **mỏng**.

Controller chỉ nên chịu trách nhiệm:

- Nhận HTTP request.
- Validate request.
- Gọi service.
- Trả response.

# 17. Service

Service chịu trách nhiệm xử lý business logic.

# 18. Repository

Repository chịu trách nhiệm truy cập database.

Không đặt business logic vào Repository.

---

# 19. Transaction

Sử dụng `@Transactional` cho các operation cần tính atomic.

# 20. Exception Handling

Project sử dụng centralized exception handling.

Ví dụ:

```java
@RestControllerAdvice
public class GlobalExceptionHandler {
}
```

Business exception nên có tên rõ ràng:

```text
VehicleNotFoundException
CustomerNotFoundException
RepairNotFoundException
InvalidRepairStatusException
InsufficientStockException
InvoiceNotFoundException
```

Không sử dụng chung chung:

```
throw new RuntimeException("Something went wrong");
```

nếu có thể xác định được loại lỗi.

---

# 21. API Response

Format API response thống nhất:

```json
{
  "code": 1000,
  "message": "Success",
  "result": {}
}
```

> Nếu project đang sử dụng format khác, phải thay thế phần này bằng format thực tế.

Các API mới phải tuân thủ format hiện tại.

---

# 22. Validation

Sử dụng Jakarta Bean Validation.

Ví dụ:

```java
@NotBlank
private String name;
```

```java
@NotNull
private UUID vehicleId;
```

```java
@Size(max = 20)
private String phone;
```

Controller sử dụng:

```
@Valid
@RequestBody
```

---

# 23. Configuration

Không hard-code thông tin môi trường.

Không commit:

```text
Database password
JWT secret
Keycloak secret
Kafka credentials
Redis password
API key
Private key
```

Sử dụng:

```text
Environment variables
.env
Docker secrets
Secret manager
```

Ví dụ:

```yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```

---

# 24. Docker

Các infrastructure component chạy bằng Docker:

```text
[MySQL]
[Kafka]
[Redis]
[Keycloak]
[Eureka]
[Khác]
```

Docker Compose:

```text
docker-compose.yml
```

AI không được tự ý thay đổi:

- Port
- Container name
- Network
- Volume
- Environment variable

nếu task không yêu cầu.

---

# 25. Logging

Sử dụng SLF4J.

Không sử dụng:

```
System.out.println(...)
```
---

# 26. Cấu trúc thư mục

Cấu trúc hiện tại của project:

```text
project-root/
│
├── api-gateway/
├── discovery-server/
│
├── services/
│   ├── user-service/
│   ├── vehicle-service/
│   ├── appointment-service/
│   ├── repair-service/
│   └── inventory-service/
│
├── docker-compose.yml
├── docs/
└── README.md
```

---

# 27. Cấu trúc bên trong Service

Cấu trúc đề xuất:

```text
src/
└── main/
    ├── java/
    │   └── com.example.service/
    │       ├── controller/
    │       ├── service/
    │       ├── repository/
    │       ├── entity/
    │       ├── dto/
    │       │   ├── request/
    │       │   └── response/
    │       ├── mapper/
    │       ├── exception/
    │       ├── config/
    │       ├── client/
    │       └── event/
    │
    └── resources/
        ├── application.yml
        └── db/
            └── migration/
```

---

# 28. Các API quan trọng

## 28.1. `user-service`

> Response format chuẩn: `ApiResponse<T> { code, message, result }` (xem `common/ApiResponse.java`).
> Toàn bộ endpoint hiện **permitAll** (chưa có Authentication Server — xem mục 3.2, Keycloak = Không). Khi tích hợp JWT/Keycloak, phải cập nhật `SecurityConfig` để yêu cầu xác thực/phân quyền trước khi deploy production.

### User (`/api/users`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/users` | Phân trang user (`page`, `size`, `sortBy`, `sortDirection`) |
| GET | `/api/users/{id}` | Lấy user theo ID |
| POST | `/api/users` | Tạo user mới |
| PUT | `/api/users/{id}` | Cập nhật user |
| DELETE | `/api/users/{id}` | Soft delete user (idempotent) |
| POST | `/api/users/{id}/roles` | Gán danh sách role cho user (thay thế toàn bộ) |
| DELETE | `/api/users/{id}/roles/{roleId}` | Gỡ một role khỏi user |

### Role (`/api/roles`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/roles` | Phân trang role |
| GET | `/api/roles/{id}` | Lấy role theo ID |
| POST | `/api/roles` | Tạo role mới |
| PUT | `/api/roles/{id}` | Cập nhật role |
| DELETE | `/api/roles/{id}` | Soft delete role (idempotent) |
| POST | `/api/roles/{id}/permissions` | Gán danh sách permission cho role (thay thế toàn bộ) |
| DELETE | `/api/roles/{id}/permissions/{permissionId}` | Gỡ một permission khỏi role |

### Permission (`/api/permissions`)

| Method | Endpoint | Mô tả |
|---|---|---|
| GET | `/api/permissions` | Phân trang permission |
| GET | `/api/permissions/{id}` | Lấy permission theo ID |
| POST | `/api/permissions` | Tạo permission mới |
| PUT | `/api/permissions/{id}` | Cập nhật permission |
| DELETE | `/api/permissions/{id}` | Soft delete permission (idempotent) |

### Lưu ý về Soft Delete

- `User`, `Role`, `Permission` dùng **soft delete** qua cột `deleted_at` (migration `V2__add_user_profile_fields.sql`), **không hard delete**.
- Entity áp dụng Hibernate `@SQLRestriction("deleted_at IS NULL")` → mọi truy vấn JPA (`findAll`, `findById`, `@Query` JPQL...) tự động bỏ qua record đã xoá.
- Endpoint `DELETE` chỉ set `deleted_at = now()`, idempotent: gọi nhiều lần không lỗi (lần sau không tìm thấy do restriction, hoặc dùng `findByIdRaw` để kiểm tra `deletedAt != null` và bỏ qua).
- Repository có thêm `findByIdRaw` (native SQL `SELECT ... WHERE id = ?`, không qua JPQL) để **bypass** `@SQLRestriction` khi cần truy cập record đã xoá (phục vụ chính logic xoá idempotent).
- Khi thêm entity mới cần soft delete tương tự, **phải** thêm cả: cột `deleted_at` trong migration, `@SQLRestriction` trên entity, và method `findByIdRaw` trong repository nếu cần idempotent delete.
- Không tạo hard delete (`deleteById`/`delete()` thật) cho 3 entity này trừ khi có yêu cầu rõ ràng mới.
- Tùy theo nghiệp vụ, không phải entity nào cũng cần soft delete.

> AI phải kiểm tra API hiện tại trước khi tạo API mới để tránh duplicate.

---

# 29. Những điều AI KHÔNG ĐƯỢC làm

Nếu không có yêu cầu rõ ràng, AI **KHÔNG ĐƯỢC**:

1. Viết lại toàn bộ project.
2. Thay đổi kiến trúc Microservices.
3. Gộp database của các service.
4. Cho service truy cập database của service khác.
5. Tự ý tạo service mới.
6. Tự ý xóa service.
7. Tự ý thay đổi API contract.
8. Tự ý đổi ID strategy.
9. Tự ý đổi framework.
10. Tự ý thêm dependency không cần thiết.
11. Sửa migration Flyway đã tồn tại.
12. Dùng `ddl-auto=update` để giải quyết vấn đề Flyway.
13. Hard-code password/secret.
14. Đưa blocking code vào Reactive Gateway.
15. Tạo JPA relationship xuyên service.
16. Trả JPA Entity trực tiếp ra API nếu project sử dụng DTO.
17. Xóa test để build pass.
18. Sửa các service không liên quan đến task.
19. Refactor lớn ngoài phạm vi task.
20. Thay đổi Docker infrastructure nếu không cần thiết.

---

# 30. Quy trình AI phải thực hiện trước khi code

Khi nhận một task, AI phải thực hiện theo thứ tự:

```text
1. Đọc CONTEXT.md
        ↓
2. Hiểu yêu cầu
        ↓
3. Xác định service bị ảnh hưởng
        ↓
4. Kiểm tra code hiện tại
        ↓
5. Tìm implementation tương tự
        ↓
6. Kiểm tra database/entity/migration
        ↓
7. Kiểm tra API contract
        ↓
8. Kiểm tra service-to-service communication
        ↓
9. Đề xuất cách triển khai
        ↓
10. Implement
        ↓
11. Test
        ↓
12. Kiểm tra regression
```

---

# 31. Quy tắc khi thêm Feature

Ví dụ task:

```text
"Thêm chức năng tạo Repair Order"
```

AI phải kiểm tra:

```text
Repair Service
    ↓
Entity
    ↓
Migration
    ↓
Repository
    ↓
Service
    ↓
DTO
    ↓
Controller
    ↓
Exception
    ↓
Validation
    ↓
Test
```

Nếu cần dữ liệu từ service khác:

```text
Repair Service
      ↓
OpenFeign / WebClient
      ↓
Vehicle Service
```

Không được:

```text
Repair Service
      ↓
Vehicle Database
```

---

# 32. Quy tắc khi thay đổi Database

Nếu task yêu cầu thay đổi database:

```text
1. Xác định service sở hữu database
2. Kiểm tra entity hiện tại
3. Kiểm tra migration hiện tại
4. Tạo migration mới
5. Cập nhật entity
6. Cập nhật DTO
7. Cập nhật service
8. Cập nhật repository nếu cần
9. Cập nhật test
10. Kiểm tra migration
```

Không sửa migration cũ nếu migration đó đã được sử dụng/chia sẻ.

---

# 33. Quy tắc khi thay đổi API

Trước khi thay đổi API:

```text
1. Kiểm tra Controller
2. Kiểm tra Request DTO
3. Kiểm tra Response DTO
4. Kiểm tra Frontend
5. Kiểm tra Feign Client
6. Kiểm tra Gateway route
7. Kiểm tra test
```

Không thay đổi API contract một cách âm thầm.

---

# END OF CONTEXT
