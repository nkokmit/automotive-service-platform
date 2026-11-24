# PLAN.md: Kế Hoạch Triển Khai Notification Service

Tài liệu này là bản thiết kế kỹ thuật và chỉ dẫn thực thi (Implementation Plan) chi tiết cho `notification-service`, chịu trách nhiệm điều phối thông báo đa kênh (`IN_APP`, `EMAIL`, sẵn sàng mở rộng `SMS`/`ZNS`) cho toàn bộ hệ thống quản lý gara ô tô.

## ⚙️ 1. Tổng Quan & Quy Ước Kiến Trúc

* **Service Name:** `notification-service`
* **Database Ownership:** `notification_service` (MySQL 9.7, InnoDB, `utf8mb4_unicode_ci`)
* **Tech Stack:** Java 21, Spring Boot 4.x, Maven (`mvnw.cmd`), Flyway, Spring Data JPA, Apache Kafka, OpenFeign, Brevo Transactional Email API, MapStruct, Lombok.
* **Quy ước API:** Toàn bộ endpoint RESTful sử dụng tiền tố `/api/...`, tuyệt đối **không dùng `/v1`**.
* **Nguyên tắc thiết kế cốt lõi:**
  * **Idempotent Consumer (Inbox Pattern):** Chống gửi trùng thông báo/email khi Kafka rebalance hoặc retry message.
  * **Tách biệt Kafka Consumer khỏi I/O mạng ngoài:** Consumer chỉ lưu dữ liệu vào MySQL (`notifications` và `notification_deliveries`); việc gửi Email qua Brevo API được thực hiện bất đồng bộ bởi background worker.
  * **Strategy Pattern cho kênh gửi:** Đóng gói từng kênh gửi (`InAppChannelSender`, `EmailChannelSender`) sau interface `NotificationChannelSender` để dễ dàng cắm thêm Zalo ZNS hoặc SMS Brandname về sau.
  * **Tối giản hạ tầng (Zero Cache / Zero Redis):** Không phụ thuộc Redis hay bất kỳ tầng cache nào; gọi trực tiếp OpenFeign khi cần phân giải thông tin người nhận và quản lý phiên kết nối SSE trong bộ nhớ cục bộ.
  * **Mã lỗi sử dụng:** 80xx, 81xx, 82xx,...

## 🔄 2. Luồng Xử Lý Sự Kiện & Cơ Chế Tin Cậy

### 2.1. Inbox Pattern (`processed_events` — Chống gửi trùng thông báo)

1. Mọi sự kiện Kafka tiêu thụ đều kèm theo `eventId` duy nhất (lấy từ header `X-Event-Id` hoặc trường `eventId` trong payload).
2. Khi `@KafkaListener` nhận sự kiện, mở một `@Transactional` duy nhất và thực thi:
   ```sql
   INSERT IGNORE INTO processed_events (event_id, topic, event_type, aggregate_id, processed_at)
   VALUES (:eventId, :topic, :eventType, :aggregateId, NOW())
   ```
3. Nếu số bản ghi được chèn bằng `0` (sự kiện đã xử lý trước đó), consumer kết thúc ngay và commit offset Kafka.
4. Nếu là sự kiện mới, service phân giải thông tin người nhận, render nội dung từ `notification_templates`, lưu bản ghi vào `notifications` (nếu bật kênh `IN_APP`) và/hoặc `notification_deliveries` (`status = PENDING` nếu bật kênh `EMAIL`) trong cùng transaction đó.
5. Một `@Scheduled` job chạy hằng ngày lúc 02:00 sáng để dọn dẹp các bản ghi `processed_events` cũ hơn 30 ngày.

### 2.2. Recipient Resolution (Phân Giải Thông Tin Người Nhận)

* Các sự kiện nghiệp vụ thường chỉ mang định danh (`customerId`, `advisorId`, `vehicleId`...) hoặc một phần thông tin cơ bản.
* Khi thiếu thông tin liên hệ chi tiết, `notification-service` gọi trực tiếp qua **OpenFeign** sang `customer-vehicle-service`, `user-service` hoặc `staff-service` để lấy dữ liệu mới nhất (`userId`, `fullName`, `email`, `phone`, `licensePlate`) mà không qua tầng cache trung gian, đảm bảo thông tin liên hệ luôn chính xác tại thời điểm gửi.

### 2.3. Delivery Worker (`FOR UPDATE SKIP LOCKED`) & Real-Time In-App

* **Email Delivery Worker (`@Scheduled` mỗi 2 giây):**
  * Khóa lô bản ghi chờ gửi bằng truy vấn chuẩn MySQL 9.7:
    ```sql
    SELECT * FROM notification_deliveries
    WHERE status = 'PENDING' AND next_retry_at <= NOW()
    ORDER BY created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
    ```
  * Gửi email HTML qua Brevo Transactional Email API (`POST /v3/smtp/email`) bằng header `api-key`. Thành công thì cập nhật `status = 'SENT'`, `sent_at = NOW()`. Thất bại thì tăng `retry_count` và tính lại `next_retry_at` theo exponential backoff ($2^{\text{retry}} \times 10\text{s}$); đạt 5 lần thử sẽ chuyển sang `FAILED`.
* **In-App Real-time Push (In-Memory SSE):**
  * Danh sách kết nối **Server-Sent Events (SSE)** đang mở của người dùng được lưu trữ cục bộ trong `ConcurrentHashMap<String, CopyOnWriteArrayList<SseEmitter>>` theo `recipientId`.
  * Sau khi transaction lưu `notifications` commit thành công (sử dụng `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)`), service đẩy trực tiếp payload thông báo xuống các `SseEmitter` đang hoạt động của `recipientId` tương ứng.
  * Dữ liệu thông báo luôn được lưu bền vững trong MySQL, đảm bảo người dùng vẫn xem lại đầy đủ lịch sử và số đếm chưa đọc qua API `GET /api/notifications/me` ngay cả khi kết nối SSE bị ngắt tạm thời.

## 🎯 3. Các Pha Triển Khai

### 📌 Pha 1: Khởi Tạo Dự Án & Cấu Hình Cơ Bản

* [x] **1.1. Khởi tạo Maven module `notification-service`:** Khai báo dependencies (`spring-boot-starter-webmvc`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `flyway-mysql`, `mysql-connector-j`, `spring-kafka`, `spring-cloud-starter-openfeign`, `mapstruct`, `lombok`).
* [x] **1.2. Cấu hình `application.yml`:**
  * `spring.jpa.hibernate.ddl-auto: validate`.
  * Cấu hình Brevo API URL, API Key và địa chỉ sender qua environment variables.
  * Cấu hình Kafka consumer group `notification-service-group` với `ack-mode: record` để commit offset sau khi xử lý từng record. Dead Letter Topic (`*.DLT`) cần được cấu hình bằng error handler riêng; hiện service chưa publish lỗi sang DLT.
  * Cấu hình OpenFeign clients (`customer-vehicle-client`, `user-client`, `staff-client`).

### 📌 Pha 2: Thiết Kế Database & Domain Layer

* [x] **2.1. Migration `V1__init_notification_schema.sql`:**
  * `notification_templates`: `id`, `code`, `channel` (`IN_APP`, `EMAIL`, `SMS`, `ZNS`), `subject_template`, `body_template`, `is_active`, `created_at`, `updated_at`. Ràng buộc `UNIQUE(code, channel)`.
  * `notifications`: `id`, `recipient_id`, `recipient_type` (`CUSTOMER`, `STAFF`), `category` (`BOOKING`, `WORK_ORDER`, `BILLING`, `INVENTORY`, `SYSTEM`), `title`, `content`, `reference_type`, `reference_id`, `is_read`, `read_at`, `created_at`. Index `(recipient_id, is_read, created_at)`.
  * `notification_deliveries`: `id`, `notification_id`, `event_id`, `channel`, `recipient_address`, `subject`, `body`, `status` (`PENDING`, `SENT`, `FAILED`), `retry_count`, `next_retry_at`, `last_error`, `created_at`, `sent_at`. Index `(status, next_retry_at, created_at)`.
  * `processed_events`: `event_id` (PK), `topic`, `event_type`, `aggregate_id`, `processed_at`.
* [x] **2.2. Migration `V2__seed_notification_templates.sql`:**
  * Khởi tạo sẵn các mẫu thông báo tiếng Việt chuẩn cho toàn bộ sự kiện nghiệp vụ (xem Mục 4).
* [x] **2.3. Xây dựng JPA Entities, Enums & Repositories:**
  * Viết native query `findBatchForUpdateSkipLocked(int limit)` trên `NotificationDeliveryRepository`.
  * Viết native query `insertIgnore(...)` trên `ProcessedEventRepository`.

### 📌 Pha 3: Template Engine, Recipient Resolver & Delivery Workers

* [x] **3.1. Template Renderer:** Hỗ trợ thay thế biến động dạng `{{variableName}}` (ví dụ: `{{customerName}}`, `{{licensePlate}}`, `{{bookingCode}}`, `{{workOrderCode}}`, `{{invoiceCode}}`, `{{amount}}`, `{{appointmentTime}}`) kèm kiểm tra an toàn khi thiếu biến; giá trị trong HTML được escape.
* [x] **3.2. Recipient Resolver Service:** Tổng hợp thông tin người nhận trực tiếp qua Feign clients (`customer-vehicle-client`, `user-client`, `staff-client`) với service JWT và authority tối thiểu cho từng client.
* [x] **3.3. Channel Senders & Scheduled Workers:**
  * [x] Triển khai `EmailChannelSender` dùng Brevo API Key (hỗ trợ HTML email).
  * [x] Triển khai `DeliveryPollingWorker` quét bảng `notification_deliveries` mỗi 2 giây.
  * [x] Triển khai `InAppChannelSender` và `SseEmitterRegistry` dùng `ConcurrentHashMap` kết hợp `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` để đẩy thông báo In-App real-time.

### 📌 Pha 4: REST APIs & Kafka Consumers

*(Tất cả API không sử dụng `/v1`)*

#### Module 4.1: REST Endpoints

* [x] **`GET /api/notifications/me`:** Lấy danh sách thông báo của user đang đăng nhập (trích xuất `userId` từ security context, hỗ trợ phân trang và lọc `isRead`, `category`).
* [x] **`GET /api/notifications/me/unread-count`:** Trả về tổng số thông báo chưa đọc (`unreadCount`).
* [x] **`GET /api/notifications/stream`:** Mở kết nối SSE (`text/event-stream`) nhận thông báo In-App theo thời gian thực.
* [x] **`PATCH /api/notifications/{id}/read`:** Đánh dấu 1 thông báo là đã đọc (kiểm tra đúng `recipient_id == currentUserId`).
* [x] **`PATCH /api/notifications/me/read-all`:** Đánh dấu toàn bộ thông báo của user hiện tại là đã đọc.
* [x] **`POST /api/notifications/send`:** API nội bộ / Admin gửi thông báo thủ công hoặc nhắc bảo dưỡng định kỳ.
* [x] **`GET /api/notification-templates` & `PUT /api/notification-templates/{id}`:** Quản lý danh sách và cập nhật nội dung mẫu thông báo.

#### Module 4.2: Kafka Event Listeners (Sử dụng Inbox Pattern)

* [x] Lắng nghe các topic nghiệp vụ từ `booking-service`, `work-order-service`, `billing-service` và `inventory-service` (chi tiết ở bảng bên dưới).

### 📌 Pha 5: Cấu Hình Gateway, Phân Quyền & Kiểm Thử

* [x] **5.1. Cập nhật `api-gateway`:** Thêm 2 route mới `/api/notifications/**` và `/api/notification-templates/**` (không dùng `StripPrefix`).
* [x] **5.2. Cập nhật phân quyền (`user-service`):** Tạo Flyway migration tiếp theo để seed các quyền `NOTIFICATION_SEND`, `NOTIFICATION_TEMPLATE_READ`, `NOTIFICATION_TEMPLATE_WRITE` và gán cho `ADMIN`, `MANAGER`.
* [x] **5.3. Kiểm thử:**
  * [x] Test Inbox Idempotency: Gọi listener 3 lần cùng một `PaymentCompletedEvent` — xác nhận chỉ tạo 1 thông báo In-App và 1 bản ghi gửi Email.
  * [x] Test Retry Email: Mock Brevo API trả lỗi, xác nhận bản ghi tăng `retry_count` và được gửi thành công lại khi API hoạt động.
  * [x] Chạy `mvnw.cmd compile` trên `notification-service`, `api-gateway`, `user-service`.

## 📋 4. Bảng Ánh Xạ Sự Kiện Kafka & Mẫu Thông Báo

| Topic / Sự kiện nguồn | Service phát | Mã Template (`code`) | Đối tượng nhận | Kênh mặc định |
| :--- | :--- | :--- | :--- | :--- |
| `booking.created` | `booking-service` | `BOOKING_CREATED` | Khách hàng (`CUSTOMER`) | `IN_APP`, `EMAIL` |
| `booking.confirmed` | Chưa có producer: booking được tạo trực tiếp ở `CONFIRMED`, chưa có transition xác nhận riêng | `BOOKING_CONFIRMED` | Khách hàng (`CUSTOMER`) | `IN_APP`, `EMAIL` |
| `booking.canceled` | `booking-service` | `BOOKING_CANCELED` | Khách hàng (`CUSTOMER`) | `IN_APP`, `EMAIL` |
| `work-order.estimate-pending-approval` | `work-order-service` | `ESTIMATE_READY` | Khách hàng (`CUSTOMER`) | `IN_APP`, `EMAIL` |
| `work-order.estimate-approved` | `work-order-service` | `ESTIMATE_APPROVED` | Cố vấn dịch vụ (`STAFF`) | `IN_APP` |
| `work-order-completed` | `work-order-service` | `WORK_ORDER_COMPLETED` | Khách hàng (`CUSTOMER`) | `IN_APP`, `EMAIL` |
| `billing.payment-completed` | `billing-service` | `PAYMENT_RECEIPT` | Khách hàng (`CUSTOMER`) | `IN_APP`, `EMAIL` |
| `parts-reservation-failed` | `inventory-service` | `PART_SHORTAGE_ALERT` | Cố vấn dịch vụ (`STAFF`) | `IN_APP` |
| `inventory.low-stock-alert` | Chưa có producer; ngoài phạm vi triển khai hiện tại | `LOW_STOCK_ALERT` | Thủ kho & Quản lý (`STAFF`) | `IN_APP` |

## ✅ 5. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

1. **Không gửi trùng thông báo:** Gửi lặp lại cùng một `eventId` lên Kafka không tạo thêm dòng mới trong `notifications` hay `notification_deliveries`.
2. **Không nghẽn Kafka Consumer:** Việc Brevo API phản hồi chậm hoặc lỗi không làm chậm quá trình tiêu thụ sự kiện Kafka.
3. **Bảo mật truy cập thông báo cá nhân:** Người dùng chỉ xem và đánh dấu đã đọc được các thông báo thuộc về chính `userId` của mình.
4. **URL Rules:** Mọi endpoint đều tuân thủ quy tắc không dùng `/v1`.