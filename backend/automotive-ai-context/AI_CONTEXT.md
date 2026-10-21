# AI Context --- Automotive Service Platform

## 1. Mục đích

Đây là entry point cho AI Coding Agent.

AI **không được mặc định đọc toàn bộ project context**. Khi nhận task:

1.  Đọc file này.
2.  Xác định service/domain bị ảnh hưởng.
3.  Chỉ đọc `GLOBAL_RULES.md`, `ARCHITECTURE.md` và context của service
    liên quan.
4.  Chỉ inspect code cần thiết.
5.  Không tự mở rộng phạm vi sang service khác nếu task không yêu cầu.

Yêu cầu trực tiếp của developer luôn được ưu tiên. Nếu yêu cầu mâu thuẫn
với architecture hoặc làm thay đổi dữ liệu, phải chỉ ra trước khi thực
hiện.

## 2. Tài liệu context

``` text
AI_CONTEXT.md
├── GLOBAL_RULES.md
├── ARCHITECTURE.md
├── AI_WORKFLOW.md
└── SERVICES/
    ├── user-service.md
    ├── staff-service.md
    ├── customer-vehicle-service.md
    ├── booking-service.md
    ├── work-order-service.md
    ├── inventory-service.md
    ├── billing-service.md
    └── notification-service.md
```

## 3. Công nghệ

-   Java 21
-   Spring Boot 4.x
-   MySQL 9.7
-   Docker / Docker Compose
-   Eureka
-   Kafka
-   Redis
-   Spring Cloud Gateway WebFlux
-   Flyway
-   JPA / Hibernate
-   OpenAPI / Swagger

Authentication/Authorization hiện được thiết kế với JWT và Gateway
validation theo architecture đã chốt.

## 4. Service hiện có

-   `api-gateway`
-   `discovery-server`
-   `user-service`
-   `staff-service`
-   `customer-vehicle-service`
-   `booking-service`
-   `work-order-service`
-   `inventory-service`
-   `billing-service`
-   `notification-service`

## 5. Quy tắc đọc context

  -----------------------------------------------------------------------
  Task                                Context tối thiểu
  ----------------------------------- -----------------------------------
  CRUD trong một service              `AI_CONTEXT.md` +
                                      `GLOBAL_RULES.md` + service context

  Thay đổi schema                     Thêm migration context nếu cần

  Thay đổi Kafka flow                 `ARCHITECTURE.md` + các service
                                      producer/consumer

  Cross-service feature               Global + Architecture + tất cả
                                      service trực tiếp liên quan

  Gateway/security                    Global + Architecture +
                                      gateway/security context trong code

  Không rõ phạm vi                    Inspect tối thiểu trước, không đọc
                                      toàn bộ repository
  -----------------------------------------------------------------------

## 6. Nguyên tắc quan trọng nhất

-   Mỗi service sở hữu DB riêng.
-   Các DB cùng nằm trên một MySQL server nhưng không được truy cập
    chéo.
-   Cross-service chỉ lưu ID, không tạo JPA relationship.
-   Ưu tiên Kafka cho nghiệp vụ event-driven.
-   Chỉ dùng OpenFeign/REST khi thực sự cần response đồng bộ.
-   Client/production chỉ truy cập microservice qua API Gateway.
-   Flyway là source of truth cho schema.
-   Hibernate không tự update schema.
-   Không hard-code secret.
-   Không tự ý thay đổi architecture.
