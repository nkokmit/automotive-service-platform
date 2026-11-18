# PLAN.md: Kế Hoạch Triển Khai Billing Service

Tài liệu này là bản thiết kế kỹ thuật và chỉ dẫn thực thi (Implementation Plan) cho `billing-service`, chịu trách nhiệm lập hóa đơn từ lệnh sửa chữa đã nghiệm thu, xử lý thanh toán trực tiếp tại quầy và đồng bộ trạng thái đóng lệnh sửa chữa qua Kafka.

---

## ⚙️ 1. Tổng Quan & Quy Ước Kiến Trúc

* **Service Name:** `billing-service`
* **Database Ownership:** `billing_service` (MySQL 9.7, InnoDB, `utf8mb4_unicode_ci`)
* **Tech Stack:** Java 21, Spring Boot 4.x, Maven (`mvnw.cmd`), Flyway, Spring Data JPA, Apache Kafka, OpenFeign, MapStruct, Lombok.
* **Quy ước API:** Toàn bộ endpoint dùng tiền tố `/api/...`, **không sử dụng `/v1`**.
* **Phạm vi thanh toán:** Thanh toán trực tiếp tại quầy thu ngân (`CASH`, `BANK_TRANSFER`, `CARD`), hỗ trợ thanh toán nhiều lần (Split Payment) và hoàn tiền (Refund). Không tích hợp cổng thanh toán trực tuyến hay webhook bên thứ ba.

---

## 🔄 2. Thiết Kế Inbox & Transactional Outbox

### 2.1. Inbox Pattern (`processed_events` — Chống xử lý trùng sự kiện)
Kafka đảm bảo giao hàng *At-Least-Once*, nên consumer có thể nhận lặp cùng một sự kiện khi rebalance hoặc retry.
* **Cơ chế hoạt động:**
  1. Mọi sự kiện Kafka đều mang `eventId` (UUID duy nhất, sinh từ `outbox_events.id` của service gửi).
  2. Khi Kafka listener nhận message, mở một `@Transactional` duy nhất và thực hiện chèn `event_id` vào bảng `processed_events` (`INSERT IGNORE INTO processed_events ...`).
  3. Nếu số bản ghi được chèn bằng `0` (sự kiện đã xử lý trước đó), consumer lập tức kết thúc transaction và commit offset mà không chạy lại nghiệp vụ.
  4. Nếu là sự kiện mới, consumer thực thi logic nghiệp vụ (ví dụ: tạo hóa đơn `UNPAID` từ `WorkOrderCompletedEvent`) trong cùng transaction đó. Nếu nghiệp vụ lỗi, toàn bộ transaction rollback kể cả dòng trong `processed_events` để Kafka retry an toàn.
* **Dọn dẹp dữ liệu:** Một `@Scheduled` job chạy hằng ngày xóa các bản ghi trong `processed_events` cũ hơn 30 ngày.

### 2.2. Transactional Outbox Polling (`outbox_events` — Chống lỗi Dual-Write)
Khi hóa đơn được thanh toán đủ (`paid_amount == grand_total`), hệ thống phải cập nhật `invoices.status = PAID` trong MySQL đồng thời thông báo cho `work-order-service` đóng lệnh sửa chữa (`CLOSED`).
* **Ghi Outbox:** Trong cùng `@Transactional` xác nhận thanh toán, service chèn 1 dòng `PENDING` vào `outbox_events` với `aggregate_id = work_order_id` (dùng làm Kafka partition key để giữ đúng thứ tự sự kiện trên từng Work Order).
* **Polling Worker (`@Scheduled`):**
  * Chạy mỗi `1000ms` (`fixedDelay = 1000`), mở transaction và khóa lô bản ghi bằng cú pháp chuẩn MySQL 9.7:
    ```sql
    SELECT * FROM outbox_events
    WHERE status = 'PENDING' AND next_retry_at <= NOW(6)
    ORDER BY created_at ASC
    LIMIT 50
    FOR UPDATE SKIP LOCKED
    ```
  * `SKIP LOCKED` cho phép chạy nhiều instance `billing-service` song song mà không tranh chấp hay gửi trùng message.
  * Gửi đồng bộ lên Kafka (`kafkaTemplate.send(topic, aggregateId, payload).get(5, TimeUnit.SECONDS)`), đính kèm header `X-Event-Id = outbox.id`.
  * Nếu thành công: cập nhật `status = 'SENT'`, `sent_at = NOW(6)`.
  * Nếu thất bại: tăng `retry_count`, cập nhật `next_retry_at` theo hàm mũ (exponential backoff: $2^{\text{retry}} \times 5\text{s}$). Vượt quá 10 lần thử sẽ chuyển sang `FAILED` và ghi log cảnh báo.

---

## 🎯 3. Các Pha Triển Khai

### 📌 Pha 1: Khởi Tạo Dự Án & Cấu Hình
* [x] **1.1. Khởi tạo Maven module `billing-service`:** Khai báo dependencies (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `flyway-mysql`, `mysql-connector-j`, `spring-kafka`, `spring-cloud-starter-openfeign`, `mapstruct`, `lombok`).
* [x] **1.2. Cấu hình `application.yml`:**
  * `spring.jpa.hibernate.ddl-auto: validate`.
  * Bật `@EnableScheduling` cho Outbox Poller và Inbox Cleanup.
  * Cấu hình OpenFeign client `work-order-client` để lấy chi tiết Work Order khi cần đối soát hoặc khởi tạo hóa đơn thủ công.
* [x] **1.3. Cấu hình security**
* [x] **1.4. Cấu hình Docker**

### 📌 Pha 2: Thiết Kế Database & Domain Layer
* [x] **2.1. Migration `V1__init_billing_schema.sql`:**
  * `invoices`: Thông tin tổng hợp tiền công, tiền phụ tùng, giảm giá, thuế, số tiền đã thanh toán (`paid_amount`) và trạng thái (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `VOID`). Ràng buộc `UNIQUE(work_order_id)` và `paid_amount <= grand_total`.
  * `invoice_items`: Snapshot chi tiết từng hạng mục (`SERVICE` hoặc `PART`), lưu vết `reference_item_id` tới `work_order_services` / `work_order_parts`.
  * `payments`: Lịch sử các lần thu tiền tại quầy (`CASH`, `BANK_TRANSFER`, `CARD`), có `UNIQUE(idempotency_key)` và trạng thái (`SUCCEEDED`, `REFUNDED`).
  * `processed_events`: Bảng Inbox lưu `event_id` đã xử lý.
  * `outbox_events`: Bảng Outbox lưu các sự kiện chờ đẩy lên Kafka.
* [x] **2.2. Xây dựng JPA Entities, Enums & Repositories:**
  * Bổ sung `@Lock(LockModeType.PESSIMISTIC_WRITE)` (`SELECT ... FOR UPDATE`) trên `InvoiceRepository.findByIdForUpdate(String id)`.
  * Viết native query `findBatchForUpdateSkipLocked(int limit)` trên `OutboxEventRepository`.

### 📌 Pha 3: Nghiệp Vụ Hóa Đơn & Thanh Toán Tại Quầy
*(Tất cả API tuân thủ quy tắc không dùng `/v1`)*
*(Bussiness Error Code: 71xx, 72xx, ...)*

#### Module 3.1: Khởi Tạo & Quản Lý Hóa Đơn
* [x] **`POST /api/invoices/from-work-order/{workOrderId}`:**
  * Gọi OpenFeign sang `work-order-service` lấy chi tiết Work Order.
  * Chỉ bóc tách các dịch vụ có trạng thái `COMPLETED` và các phụ tùng có `issued_quantity > 0` (tính tiền theo `issued_quantity`, không tính theo `requested_quantity`).
  * Idempotent: Nếu `workOrderId` đã có hóa đơn, trả về hóa đơn hiện tại.
* [x] **`GET /api/invoices` & `GET /api/invoices/{id}`:** Tra cứu danh sách (phân trang, lọc theo trạng thái, khoảng ngày, `customerId`) và chi tiết hóa đơn kèm danh sách `invoice_items` và `payments`.
* [x] **`GET /api/invoices/me`:** Khách hàng xem lịch sử hóa đơn của chính mình (trích xuất `customerId` từ security context).
* [x] **`PATCH /api/invoices/{id}/discount`:** Cập nhật chiết khấu/giảm giá và tính lại `grand_total` (chỉ cho phép khi `status == UNPAID` và `paid_amount == 0`).
* [x] **`POST /api/invoices/{id}/void`:** Hủy hóa đơn khi `paid_amount == 0`, đồng thời ghi `InvoiceVoidedEvent` vào `outbox_events`.

#### Module 3.2: Thu Tiền & Hoàn Tiền Tại Quầy
* [x] **`POST /api/payments` (Ghi nhận thanh toán):**
  * Yêu cầu header hoặc trường `idempotencyKey` (UUID). Nếu `idempotencyKey` đã tồn tại, trả về bản ghi `PaymentResponse` cũ (`200 OK`).
  * Trong `@Transactional`:
    1. Khóa dòng hóa đơn bằng `findByIdForUpdate(invoiceId)`.
    2. Kiểm tra trạng thái hóa đơn phải là `UNPAID` hoặc `PARTIALLY_PAID`.
    3. Kiểm tra `amount > 0` và `amount <= (grand_total - paid_amount)`. Nếu vượt số dư còn lại, ném lỗi nghiệp vụ (`PAYMENT_EXCEEDS_BALANCE`).
    4. Tạo bản ghi `payments` với trạng thái `SUCCEEDED`.
    5. Cộng dồn `paid_amount += amount`.
    6. Nếu `paid_amount < grand_total`: cập nhật `invoices.status = PARTIALLY_PAID`.
    7. Nếu `paid_amount == grand_total`: cập nhật `invoices.status = PAID`, `paid_at = NOW(6)` và chèn `PaymentCompletedEvent` vào `outbox_events`.
* [x] **`POST /api/payments/{id}/refund` (Hoàn tiền giao dịch):**
  * Khóa dòng `invoices` bằng `findByIdForUpdate(invoiceId)`, đánh dấu `payments.status = REFUNDED`, trừ `paid_amount`, cập nhật lại trạng thái hóa đơn về `PARTIALLY_PAID` hoặc `UNPAID` và ghi `PaymentRefundedEvent` vào `outbox_events`.

### 📌 Pha 4: Tích Hợp Kafka, Gateway & Phân Quyền
* [x] **4.1. Kafka Consumers (dùng Inbox `processed_events`):**
  * Lắng nghe `work-order-completed` (`WorkOrderCompletedEvent`): Tự động khởi tạo hóa đơn `UNPAID` từ snapshot event.
  * Lắng nghe `work-order-canceled` (`WorkOrderCanceledEvent`): Nếu hóa đơn tương ứng ở trạng thái `UNPAID` (`paid_amount == 0`), tự động chuyển sang `VOID`.
  * Inbox ghi nhận event trong cùng transaction với nghiệp vụ; dọn các event cũ hơn 30 ngày hằng ngày.
* [x] **4.2. Kafka Producers (qua Outbox Polling):**
  * Topic `billing.payment-completed` (`PaymentCompletedEvent`): Chứa `eventId`, `invoiceId`, `workOrderId`, `paidAmount`, `paidAt` để `work-order-service` chuyển trạng thái sang `CLOSED`.
  * Topic `billing.invoice-voided` (`InvoiceVoidedEvent`): Thông báo hủy hóa đơn.
  * Outbox poll mỗi 1000ms, gửi lô tối đa 50 message có header `X-Event-Id`, retry exponential backoff tối đa 10 lần.
* [x] **4.3. Cập nhật `api-gateway`:**
  * Thêm 2 route mới (không dùng `StripPrefix`): `/api/invoices/**` và `/api/payments/**`.
* [x] **4.4. Cập nhật phân quyền (`user-service`):**
  * Tạo Flyway migration tiếp theo trong `user-service` để seed các quyền: `INVOICE_READ`, `INVOICE_WRITE`, `PAYMENT_READ`, `PAYMENT_WRITE`, `PAYMENT_REFUND`.
  * Gán toàn bộ quyền cho `ADMIN` và `MANAGER`; tạo role thu ngân `CASHIER` với quyền đọc hóa đơn/thanh toán và ghi nhận thanh toán.

### 📌 Pha 5: Kiểm Chứng & Kiểm Thử
* [ ] Kiểm thử đồng thời (Concurrency): Gửi 2 request `POST /api/payments` song song cho cùng 1 hóa đơn với số tiền bằng toàn bộ dư nợ — đảm bảo chỉ 1 request thành công, request còn lại bị chặn bởi `SELECT FOR UPDATE` + check constraint.
* [ ] Kiểm thử Inbox Idempotency: Gửi trùng message `WorkOrderCompletedEvent` nhiều lần lên Kafka — đảm bảo chỉ sinh 1 hóa đơn duy nhất.
* [ ] Kiểm thử Outbox Polling: Giả lập Kafka broker tạm ngắt kết nối khi thu tiền đủ hóa đơn, sau đó bật lại Kafka — đảm bảo `outbox_events` tự động retry và đẩy `PaymentCompletedEvent` thành công.
* [ ] Chạy `mvnw.cmd compile` trên `billing-service`, `api-gateway`, `user-service` và rà soát toàn bộ schema.