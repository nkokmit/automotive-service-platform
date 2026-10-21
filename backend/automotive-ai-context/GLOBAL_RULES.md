# Global Rules

## 1. Database

Mỗi microservice sở hữu một database riêng trên cùng MySQL server.

Ví dụ:

``` text
MySQL Server
├── user_service
├── staff_service
├── customer_vehicle_service
├── booking_service
├── work_order_service
├── inventory_service
└── billing_service
```

Service A **không được** truy cập trực tiếp DB của Service B.

## 2. Cross-service data

Nếu entity thuộc service khác, chỉ lưu ID:

``` java
private UUID customerId;
private UUID vehicleId;
private UUID bookingId;
```

Không dùng:

``` java
@ManyToOne
private Customer customer;
```

cho entity thuộc service khác.

Không tạo foreign key cross-service.

## 3. ID

Dùng đúng ID strategy hiện tại của service/project.

Không tự ý đổi UUID ↔ Long ↔ Integer.

## 4. Communication

### Ưu tiên Kafka

Dùng Kafka cho:

-   Domain event
-   Asynchronous workflow
-   Notification
-   Những nghiệp vụ không cần response ngay

### Dùng OpenFeign/REST khi

-   Caller cần response ngay.
-   Cần query dữ liệu đồng bộ.
-   Không phù hợp với event-driven flow.

Không dùng Kafka chỉ để "cho có microservice".

## 5. Gateway

Production/client chỉ truy cập microservice thông qua API Gateway.

``` text
Client
  ↓
API Gateway
  ↓
Internal microservices
```

Port của microservice không được expose ra ngoài trong production.

## 6. Authentication

Luồng tổng quát:

``` text
Client
  ↓ JWT
API Gateway
  ↓ validate JWT
Microservice
```

Gateway là entry point và validate JWT.

Service vẫn phải áp dụng authorization phù hợp với endpoint/business
operation.

## 7. Flyway

Flyway là source of truth cho database schema.

``` text
Entity
  ↕
JPA mapping

Migration
  ↓
Database schema
```

Mỗi thay đổi schema tạo migration mới.

Không sửa migration đã được dùng/chia sẻ.

Không dùng:

``` yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
```

Ưu tiên:

``` yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

## 8. Database bootstrap

Mục tiêu là clone project và chạy Docker Compose có thể dựng database mà
không cần tạo thủ công từng DB.

``` text
docker compose up
        ↓
MySQL
        ↓
databases
        ↓
Spring Boot
        ↓
Flyway migrations
```

## 9. Soft delete

Không phải mọi entity đều soft delete.

Chỉ dùng soft delete cho entity cần:

-   Khôi phục dữ liệu.
-   Audit/history.
-   Hoặc có yêu cầu nghiệp vụ rõ ràng.

Các entity khác có thể hard delete nếu nghiệp vụ cho phép.

## 10. DTO

Không trả JPA Entity trực tiếp ra API.

``` text
Request DTO → Controller → Service → Entity
Entity → Service → Response DTO → Controller
```

## 11. Controller / Service / Repository

### Controller

Chỉ:

-   Nhận request.
-   Validate.
-   Gọi service.
-   Trả response.

### Service

Chứa business logic.

### Repository

Chỉ chịu trách nhiệm persistence/query.

Không đặt business logic vào Repository.

## 12. Transaction

Dùng `@Transactional` cho operation cần atomicity.

## 13. Validation

Dùng Jakarta Bean Validation.

Ví dụ:

``` java
@NotNull
private UUID vehicleId;
```

``` java
@Valid
@RequestBody
```

## 14. Exception

Dùng exception có nghĩa vụ rõ ràng:

``` text
VehicleNotFoundException
BookingNotFoundException
InvalidWorkOrderStatusException
InsufficientStockException
InvoiceNotFoundException
```

Dùng `@RestControllerAdvice` cho global exception handling.

Không dùng `RuntimeException` chung chung nếu có thể xác định loại lỗi.

## 15. API Response

Tất cả service dùng response contract thống nhất:

``` json
{
  "code": 1000,
  "message": "Success",
  "result": {}
}
```

API mới phải tuân thủ contract hiện tại.

## 16. Configuration / Secret

Không hard-code:

-   Password
-   JWT secret
-   API key
-   Kafka credentials
-   Redis password
-   Private key

Dùng environment variables / `.env` / secret manager.

Ví dụ:

``` yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```

## 17. Docker

Không tự ý thay đổi:

-   Port
-   Container name
-   Network
-   Volume
-   Environment variables

nếu task không yêu cầu.

## 18. Logging

Dùng SLF4J.

Không dùng:

``` java
System.out.println(...)
```

## 19. API Documentation

Dùng OpenAPI 3 / springdoc.

Swagger UI:

``` text
/swagger-ui.html
/swagger-ui/index.html
```

OpenAPI:

``` text
/v3/api-docs
```

Không tự ý thêm route Swagger vào Gateway nếu task không yêu cầu.

Khi security được bật, whitelist Swagger endpoints nếu chúng cần khả
dụng.

## 20. Không tự ý làm

AI không được nếu task không yêu cầu:

1.  Thay đổi architecture.
2.  Gộp database.
3.  Truy cập DB service khác.
4.  Tạo/xóa service.
5.  Đổi API contract.
6.  Đổi ID strategy.
7.  Đổi framework.
8.  Thêm dependency không cần thiết.
9.  Sửa migration cũ.
10. Dùng `ddl-auto=update`.
11. Hard-code secret.
12. Đưa blocking code vào Reactive Gateway.
13. Tạo JPA relationship xuyên service.
14. Trả Entity trực tiếp nếu project dùng DTO.
15. Xóa test để build pass.
16. Sửa service không liên quan.
17. Refactor lớn ngoài phạm vi.
18. Thay đổi Docker infrastructure không cần thiết.
