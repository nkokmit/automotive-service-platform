# PLAN.md: Kế Hoạch Triển Khai Work-Order Service

Tài liệu này là chỉ dẫn thực thi (**Implementation Plan**) chi tiết để phát triển `work-order-service`, dịch vụ cốt lõi quản lý vòng đời sửa chữa thực tế tại xưởng.

`work-order-service` chịu trách nhiệm quản lý quá trình từ khi xe đã được tiếp nhận tại gara, chẩn đoán, lập báo giá, khách duyệt hạng mục sửa chữa, phân công thợ, thi công, hoàn thành sửa chữa và chờ thanh toán.

---

# ⚙️ 1. Tổng Quan & Yêu Cầu Kỹ Thuật

## 1.1. Service Information

- **Service Name:** `work-order-service`
- **Database Ownership:** `work_order_service`
- **Database:** MySQL 9.7
- **Java Version:** Java 21
- **Framework:** Spring Boot 4.x
- **Build Tool:** Maven
- **ErrorCode:** 6xxx

## 1.2. Tech Stack

- Spring Web
- Spring Data JPA
- Spring Kafka
- Spring Cloud OpenFeign
- Spring Cloud Netflix Eureka Client
- Flyway
- Lombok
- MapStruct
- Spring Validation
- Spring Security Resource Server

## 1.3. API Rules

- Các REST API sử dụng prefix:

```text
/api/...
```

- Tuyệt đối **không sử dụng versioning trên URL**:

```text
/api/v1/work-orders ❌
```

- Sử dụng:

```text
/api/work-orders ✅
```

- External request chỉ đi qua API Gateway.
- Không expose trực tiếp service port ra bên ngoài.
- JWT được validate tại Gateway và downstream service theo kiến trúc chung của hệ thống.

---

# 🎯 2. Phạm Vi & Trách Nhiệm Của Work-Order Service

`work-order-service` chịu trách nhiệm:

1. Quản lý Work Order sau khi xe thực sự được tiếp nhận tại gara.
2. Lưu thông tin tiếp nhận xe:
   - Booking liên quan.
   - Customer.
   - Vehicle.
   - Odometer.
   - Vehicle condition.
3. Quản lý vòng đời sửa chữa.
4. Quản lý Estimate/Báo giá.
5. Bung thông tin Service + BOM phụ tùng từ `catalog-inventory-service`.
6. Snapshot thông tin và giá tại thời điểm lập báo giá.
7. Quản lý việc khách duyệt hoặc từ chối từng hạng mục.
8. Hỗ trợ Partial Approval.
9. Hỗ trợ Extra Quote/Supplementary Estimate khi phát hiện thêm hạng mục sửa chữa.
10. Phân công Mechanic cho Service Line.
11. Theo dõi tiến độ từng Service Line.
12. Phát Kafka events cho:
    - Booking Service.
    - Catalog/Inventory Service.
    - Billing Service.
13. Nhận Payment Event từ Billing Service để đóng Work Order.

---

# 🚫 3. Những Trách Nhiệm Không Thuộc Work-Order Service

## Booking Service

Booking Service chịu trách nhiệm:

- Đặt lịch.
- Reschedule.
- Cancel booking.
- Quản lý availability/capacity.
- Theo dõi booking trước khi xe đến gara.

Work Order chỉ được tạo khi:

```text
Customer đã đến gara
        ↓
Advisor tiếp nhận xe
        ↓
Check-in
        ↓
Create Work Order
```

Do đó:

```text
Confirmed Booking ≠ Work Order
```

---

## Catalog/Inventory Service

Catalog/Inventory Service chịu trách nhiệm:

- Quản lý Service Catalog.
- Quản lý Part Catalog.
- Quản lý BOM.
- Quản lý tồn kho.
- Reserve phụ tùng.
- Release reservation.
- Issue/Consume phụ tùng.
- Inventory transactions.

Work Order Service không tự quản lý stock.

---

## Billing Service

Billing Service chịu trách nhiệm:

- Tạo Invoice.
- Quản lý Invoice.
- Xử lý Payment.
- Phát `PaymentCompletedEvent`.

Work Order Service chỉ phản ứng với Payment Event để đóng Work Order.

---

# 📌 4. Các Pha Triển Khai

---

# 📌 Pha 1: Khởi Tạo Dự Án & Cấu Hình Cơ Bản

## 1.1. Khởi tạo Maven Project

Khai báo các dependencies cần thiết:

- Spring Web
- Spring Data JPA
- Spring Validation
- Spring Kafka
- Spring Cloud OpenFeign
- Eureka Client
- Flyway
- MySQL Driver
- Lombok
- MapStruct
- Spring Security Resource Server
- Test dependencies

---

## 1.2. Cấu hình `application.yml`

Yêu cầu:

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: validate
```

Flyway là source of truth cho database schema.

Không sử dụng Hibernate để tự động tạo hoặc thay đổi schema.

Cấu hình:

- MySQL connection.
- Kafka bootstrap servers.
- Eureka.
- OpenFeign.
- JWT resource server.
- Application timezone nếu cần.

Thông tin database và environment không hard-code để commit secret vào repository.

Ví dụ:

```yaml
spring:
  datasource:
    url: ${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
```

---

## 1.3. Cấu trúc Package

Cấu trúc cơ bản:

```text
com.example.work_order_service
│
├── controller
├── service
├── repository
├── entity
├── dto
│
├── integration
│   ├── client
│   ├── contract
│   └── dto
│
├── messaging
│   ├── producer
│   ├── consumer
│   ├── event
│   └── config
│
├── mapper
├── exception
├── config
└── security
```

Các integration contract nên được tách rõ với domain logic.

---

# 📌 Pha 2: Thiết Kế Database & Domain Model

---

## 2. Flyway Migration

Tạo:

```text
V1__init_work_order_schema.sql
```

Bao gồm các bảng chính:

1. `work_orders`
2. `estimates`
3. `work_order_services`
4. `work_order_parts`
5. `work_order_status_history`

Có thể bổ sung bảng liên kết khác trong các migration sau nếu domain phát triển thêm.

---

## 3. Enums & State Machine

---

## 3.1. WorkOrderStatus

```java
CREATED,
DIAGNOSING,
PENDING_APPROVAL,
IN_PROGRESS,
COMPLETED,
PENDING_PAYMENT,
CLOSED,
CANCELED
```

---

## 3.2. WorkOrder State Machine

Luồng chính:

```text
CREATED
    ↓
DIAGNOSING
    ↓
PENDING_APPROVAL
    ↓
IN_PROGRESS
    ↓
COMPLETED
    ↓
PENDING_PAYMENT
    ↓
CLOSED
```

Có thể Cancel ở các trạng thái phù hợp:

```text
CREATED
DIAGNOSING
PENDING_APPROVAL
IN_PROGRESS (theo business rule)
```

---

## 3.3. ItemStatus


Transition cơ bản:

```text
PENDING
   ├── APPROVED
   └── REJECTED
```

Service Line được duyệt:

```text
APPROVED
    ↓
IN_PROGRESS
    ↓
COMPLETED
```

---

# 📌 Pha 3: Check-in & Khởi Tạo Work Order

---

## 3.1. Create Work Order

### API

```http
POST /api/work-orders
```


### Business Flow

```text
Booking CONFIRMED
        ↓
Booking Service check-in xe
        ↓
Booking chuyển sang CHECKED_IN
        ↓
Booking Service phát VehicleCheckedInEvent sau commit
        ↓
Work Order Service kiểm tra booking_id đã có Work Order?
        │
        ├── Có → bỏ qua event trùng
        │
        └── Không
                ↓
           Tạo Work Order
                ↓
           Status = CREATED
                ↓
           Lưu Status History
```

---

## 3.2. VehicleCheckedInEvent

Event:

```text
VehicleCheckedInEvent
```

Producer:

```text
booking-service
```

Consumer:

```text
work-order-service
```

Payload:

```text
eventId
bookingId
customerId
vehicleId
advisorId
odometerIn
vehicleCondition
customerNote
occurredAt
```

Work Order Service tạo Work Order và trạng thái ban đầu `CREATED`. Việc xử lý idempotent theo `bookingId` để tránh tạo nhiều Work Order từ event trùng.

Độ bền của event:

- Booking Service gửi event **trong transaction check-in (trước commit)** và chờ Kafka ack (`app.kafka.publish-timeout-ms`). Gửi lỗi/timeout thì check-in rollback (HTTP 503) để Advisor thử lại, nên không có trạng thái `CHECKED_IN` mà thiếu event.
- Hệ quả: event có thể tới sớm hơn commit hoặc là event "ma" nếu commit lỗi. Work Order Service gọi lại Booking Service để xác nhận booking `CHECKED_IN` (khớp customer/vehicle) trước khi tạo; chưa thỏa thì listener retry có backoff (`app.kafka.consumer.retry-interval-ms`, `max-retries`) rồi bỏ qua.

---

## 3.3. Get Work Order

### API

```http
GET /api/work-orders/{id}
```

Response nên bao gồm:

```text
Work Order
    ├── Booking
    ├── Customer
    ├── Vehicle
    ├── Current Status
    ├── Estimates
    │     ├── Service Lines
    │     └── Part Lines
    └── Status History
```

Không gọi synchronous sang Catalog để lấy lại giá hiện tại.

Sử dụng snapshot đã lưu.

---

## 3.4. List Work Orders

### API

```http
GET /api/work-orders
```

Hỗ trợ filter:

```text
status
customerId
vehicleId
bookingId
assignedTechId
from
to
```

Ví dụ:

```http
GET /api/work-orders?status=IN_PROGRESS
```

---

# 📌 Pha 4: Chẩn Đoán Xe

---

## 4.1. Start Diagnosis

### API

```http
POST /api/work-orders/{id}/start-diagnosis
```

### Transition

```text
CREATED
    ↓
DIAGNOSING
```

Không sử dụng API generic:

```http
PATCH /status
```

cho các business transition quan trọng.

Endpoint phải thể hiện business action.

Chỉ cho phép bắt đầu chẩn đoán khi Work Order đang ở trạng thái `CREATED`.
Khi thành công, chuyển sang `DIAGNOSING` và ghi lịch sử với người thực hiện.
Work Order không tồn tại trả về 404; trạng thái không hợp lệ trả về 409.

---

# 📌 Pha 5: Quản Lý Estimate & Lập Báo Giá

---

## 5.1. Create Estimate

### API

```http
POST /api/work-orders/{id}/estimates
```

### Request

```json
{
  "type": "INITIAL"
}
```

hoặc:

```json
{
  "type": "SUPPLEMENTARY"
}
```

Estimate mới:

```text
status = DRAFT
```

---

## 5.2. Get Estimates

### API

```http
GET /api/work-orders/{id}/estimates
```

---

## 5.3. Get Estimate Detail

### API

```http
GET /api/estimates/{estimateId}
```

Response bao gồm:

```text
Estimate
    ├── Status
    ├── Service Lines
    └── Part Lines
```

---

# 📌 Pha 6: Thêm Service & Bung BOM

---

## 6.1. Add Service vào Estimate

### API

```http
POST /api/estimates/{estimateId}/services
```

### Request

```json
{
  "serviceId": "uuid"
}
```

Mỗi request thêm một Service Line. Số lượng Part Line bung từ BOM lấy theo
`default_quantity` của từng dòng BOM; nếu cần cùng một dịch vụ nhiều lần,
thêm nhiều Service Line riêng.

### Flow

```text
Advisor chọn Service
        ↓
Work Order Service
        ↓ Feign
Catalog/Inventory Service
        ↓
Get Service Information
        ↓
Get BOM
        ↓
Snapshot Service Information
        ↓
Create WorkOrderService
        ↓
Snapshot Part Information
        ↓
Create WorkOrderParts
```

Service và Part mới có:

```text
status = PENDING
```

---

## 6.2. Remove Service khỏi Estimate

### API

```http
DELETE /api/estimates/{estimateId}/services/{serviceLineId}
```

Chỉ cho phép khi Estimate chưa được submit hoặc chưa có final decision.

Xử lý các Part Lines sinh ra từ BOM tương ứng theo quan hệ nghiệp vụ.

---

# 📌 Pha 7: Quản Lý Phụ Tùng Trong Estimate

---

## 7.1. Add Part Thủ Công

Không phải phụ tùng nào cũng xuất phát từ BOM.

### API

```http
POST /api/estimates/{estimateId}/parts
```

### Request

```json
{
  "partId": "uuid",
  "quantity": 1
}
```

Work Order Service gọi Catalog/Inventory Service để lấy:

```text
part information
price
```

Sau đó snapshot vào Work Order database.

---

## 7.2. Remove Part

### API

```http
DELETE /api/estimates/{estimateId}/parts/{partLineId}
```

Chỉ cho phép chỉnh sửa trước khi Estimate được quyết định.

---

# 📌 Pha 8: Submit Estimate Chờ Khách Duyệt

---

## 8.1. Submit Estimate

### API

```http
POST /api/estimates/{estimateId}/submit
```

### Transition

```text
DRAFT
    ↓
PENDING_APPROVAL
```

Work Order:

```text
DIAGNOSING
    ↓
PENDING_APPROVAL
```

Nếu Work Order đang:

```text
IN_PROGRESS
```

và tạo Supplementary Estimate, Work Order vẫn có thể tiếp tục trạng thái:

```text
IN_PROGRESS
```

Estimate mới độc lập chờ khách duyệt.

---

# 📌 Pha 9: Customer Decision & Partial Approval

---

## 9.1. Quyết định từng Item

### API

```http
PATCH /api/estimates/{estimateId}/decision
```

### Request

```json
{
  "items": [
    {
      "itemType": "SERVICE",
      "itemId": "uuid",
      "decision": "APPROVED"
    },
    {
      "itemType": "PART",
      "itemId": "uuid",
      "decision": "REJECTED"
    }
  ]
}
```

Không sử dụng request chỉ chứa:

```text
approvedItems
```

vì không thể phân biệt:

```text
REJECTED
```

và:

```text
chưa được quyết định
```

---

## 9.2. Partial Approval

Ví dụ:

```text
Service A → APPROVED
Service B → APPROVED
Part A    → APPROVED
Part B    → REJECTED
```

Work Order sẽ thực hiện các hạng mục:

```text
APPROVED
```

Các item:

```text
REJECTED
```

không được thực hiện.

---

## 9.3. Estimate Status Sau Khi Quyết Định

Ví dụ:

```text
Tất cả item APPROVED
    ↓
APPROVED
```

```text
APPROVED + REJECTED
    ↓
PARTIALLY_APPROVED
```

```text
Tất cả REJECTED
    ↓
REJECTED
```

---

# 📌 Pha 10: Reserve Phụ Tùng

Sau khi có các Part Lines được:

```text
APPROVED
```

Work Order Service phát Kafka Event:

```text
PartsReservationRequestedEvent
```

hoặc tên tương đương theo convention chung.

Event chứa:

```text
eventId
workOrderId
estimateId

parts:
    - workOrderPartId
      catalogPartId
      quantity
```

---

## 10.1. Inventory Service

Inventory Consumer:

```text
Receive Reservation Request
        ↓
Validate stock
        ↓
Reserve parts
```

---

## 10.2. Reservation Success

Inventory phát:

```text
PartsReservedEvent
```

Work Order Consumer:

```text
Update reservation status
```

Các Part Line:

```text
RESERVED
```

Nếu Initial Estimate đã được xử lý và đủ điều kiện:

```text
PENDING_APPROVAL
        ↓
IN_PROGRESS
```

---

## 10.3. Reservation Failure

Nếu thiếu stock:

```text
PartsReservationFailedEvent
```

Work Order không được giả định rằng reservation luôn thành công.

Cần lưu trạng thái reservation phù hợp, ví dụ:

```text
PENDING
RESERVED
FAILED
RELEASED
ISSUED
```

Advisor xử lý theo business flow:

- Thông báo thiếu hàng.
- Điều chỉnh Estimate.
- Chờ nhập hàng.
- Thay thế phụ tùng.
- Tạo Supplementary/Revision Quote nếu cần.

---

# 📌 Pha 11: Extra Quote / Supplementary Estimate

Trong quá trình sửa chữa:

```text
Mechanic phát hiện vấn đề mới
        ↓
Advisor lập báo giá bổ sung
        ↓
Customer quyết định
```

Không sửa trực tiếp Estimate đã được duyệt.

Tạo Estimate mới:

```text
POST /api/work-orders/{id}/estimates
```

Request:

```json
{
  "type": "SUPPLEMENTARY"
}
```

Flow:

```text
Work Order = IN_PROGRESS

Estimate #1
    APPROVED

        +

Estimate #2
    DRAFT
        ↓
    PENDING_APPROVAL
        ↓
    APPROVED / PARTIALLY_APPROVED / REJECTED
```

Điều này giúp:

- Giữ lịch sử báo giá.
- Audit rõ ràng.
- Không thay đổi quote đã được khách đồng ý.

---

# 📌 Pha 12: Phân Công Mechanic

---

## 12.1. Assign Mechanic

### API

```http
PATCH /api/work-order-service-lines/{serviceLineId}/assign
```

### Request

```json
{
  "mechanicId": "uuid"
}
```

MVP:

```text
Một Service Line
        ↓
Một Primary Mechanic
```

Advisor có quyền phân công.

---

## 12.2. Mechanic xem công việc của mình

### API

```http
GET /api/me/work-order-service-lines
```

Ví dụ:

```http
GET /api/me/work-order-service-lines?status=APPROVED
```

Mechanic không cần truyền `mechanicId` của chính mình.

Backend lấy identity từ JWT.

---

# 📌 Pha 13: Thi Công Service Line

---

## 13.1. Start Service

### API

```http
POST /api/work-order-service-lines/{serviceLineId}/start
```

Transition:

```text
APPROVED
    ↓
IN_PROGRESS
```

Chỉ Mechanic được phân công hoặc actor có quyền phù hợp mới được thực hiện.

---

## 13.2. Complete Service

### API

```http
POST /api/work-order-service-lines/{serviceLineId}/complete
```

Transition:

```text
IN_PROGRESS
    ↓
COMPLETED
```

Lưu:

```text
completed_at
```

---

# 📌 Pha 14: Issue / Consume Phụ Tùng

Reserve phụ tùng không đồng nghĩa với phụ tùng đã thực sự được sử dụng.

Lifecycle:

```text
AVAILABLE
    ↓
RESERVED
    ↓
ISSUED
```

Trong đó:

- **Reserve:** Giữ chỗ phụ tùng sau khi khách đã duyệt báo giá. Phụ tùng chưa được xuất kho và chưa được coi là đã sử dụng.
- **Issue:** Xuất phụ tùng thực tế để sử dụng cho Work Order.
- **Release:** Giải phóng phần phụ tùng đã reserve nhưng không sử dụng.

Một Part Line có thể được issue nhiều lần hoặc chỉ issue một phần số lượng đã reserve.

Vì vậy, trạng thái đơn giản:

```text
RESERVED → ISSUED
```

không đủ để biểu diễn nghiệp vụ.

---

## 14.1. Theo dõi số lượng phụ tùng

`work_order_parts` nên theo dõi các số lượng:

```text
requested_quantity
reserved_quantity
issued_quantity
released_quantity
```

Trong đó:

- `requested_quantity`: số lượng phụ tùng trong báo giá được khách duyệt.
- `reserved_quantity`: số lượng Inventory đã reserve thành công.
- `issued_quantity`: số lượng đã thực sự xuất kho và sử dụng.
- `released_quantity`: số lượng reservation đã được giải phóng.

Ví dụ:

```text
Customer approved: 4
Reserved:          4
Issued:            0
Released:          0
```

Sau khi xuất 2 phụ tùng:

```text
Customer approved: 4
Reserved:          4
Issued:            2
Released:          0
```

Số lượng còn đang được giữ:

```text
remaining_reserved =
reserved_quantity
- issued_quantity
- released_quantity
```

Trong ví dụ trên:

```text
4 - 2 - 0 = 2
```

Hai phụ tùng còn lại vẫn đang được reserve.

---

## 14.2. Issue Part API

Khi phụ tùng thực sự được xuất để sử dụng cho Work Order, Advisor hoặc Manager thực hiện:

```http
POST /api/work-orders/{workOrderId}/parts/{partLineId}/issue
```

### Request

```json
{
  "quantity": 2
}
```

MVP không bắt buộc Mechanic trực tiếp thực hiện thao tác xuất kho.

Actor được phép thực hiện:

```text
ADVISOR
MANAGER
```

Việc phân quyền cuối cùng vẫn dựa trên Permission của hệ thống.

---

## 14.3. Validation trước khi Issue

Work Order Service kiểm tra:

```text
1. Work Order tồn tại.

2. Work Order đang ở trạng thái IN_PROGRESS.

3. Part Line thuộc Work Order.

4. Part Line đã được APPROVED.

5. Reservation đã tồn tại và còn số lượng available để issue.

6. quantity > 0.

7. quantity <= remaining_reserved.
```

Trong đó:

```text
remaining_reserved =
reserved_quantity
- issued_quantity
- released_quantity
```

---

## 14.4. Issue sử dụng Synchronous Internal Command

Khác với Reserve, thao tác Issue cần biết kết quả ngay tại thời điểm nhân viên thực hiện.

Ví dụ:

```text
Advisor bấm "Xuất phụ tùng"
        ↓
Cần biết ngay
        ↓
Xuất thành công hay thất bại?
```

Do đó, `work-order-service` sử dụng **OpenFeign synchronous call** đến `catalog-inventory-service`.

Flow:

```text
ADVISOR / MANAGER
        ↓
POST /api/work-orders/{workOrderId}/parts/{partLineId}/issue
        ↓
WORK-ORDER SERVICE
        ↓
Validate business rules
        ↓
OpenFeign
        ↓
CATALOG-INVENTORY SERVICE
        ↓
Issue Reserved Part
        ↓
Success / Failure Response
        ↓
WORK-ORDER SERVICE
        ↓
Update issued_quantity
```

Không phát Kafka event chỉ để yêu cầu Issue trong luồng synchronous này.

Nguyên tắc:

```text
Reserve
    = asynchronous workflow
    = Kafka

Issue
    = immediate command
    = OpenFeign
```

Điều này phù hợp với kiến trúc chung:

```text
Kafka
    → xử lý bất đồng bộ

OpenFeign
    → command cần kết quả ngay
```

---

## 14.5. Internal Inventory Contract

`catalog-inventory-service` cung cấp internal endpoint hoặc Feign contract dành cho Work Order Service.

Ví dụ:

```http
POST /internal/parts/reservations/{reservationId}/issue
```

Request:

```json
{
  "workOrderId": "uuid",
  "partId": "uuid",
  "quantity": 2,
  "idempotencyKey": "unique-key"
}
```

Inventory Service thực hiện:

```text
Validate Reservation
        ↓
Validate Work Order ownership
        ↓
Validate remaining reserved quantity
        ↓
Issue quantity
        ↓
Update inventory
        ↓
Create inventory transaction
        ↓
Return Success
```

Inventory Transaction:

```text
type = ISSUE
```

hoặc sử dụng convention transaction type hiện có của `catalog-inventory-service`.

---

## 14.6. Idempotency

Issue là thao tác ảnh hưởng đến tồn kho, vì vậy request phải idempotent.

Ví dụ:

```text
Request issue quantity = 2
        ↓
Inventory xử lý thành công
        ↓
Response bị timeout
        ↓
Work Order retry request
```

Nếu không có idempotency:

```text
Issue 2 lần
        ↓
Stock bị trừ 4 ❌
```

Do đó Internal Issue Command cần:

```text
idempotencyKey
```

Inventory Service phải đảm bảo:

```text
Cùng idempotencyKey
        ↓
Không issue lần thứ hai
```

---

## 14.7. Update Work Order sau khi Issue thành công

Sau khi Inventory Service trả về thành công:

```text
issued_quantity += quantity
```

Ví dụ:

Trước:

```text
reserved_quantity = 4
issued_quantity   = 0
released_quantity = 0
```

Issue:

```text
quantity = 2
```

Sau:

```text
reserved_quantity = 4
issued_quantity   = 2
released_quantity = 0
```

Nếu issue toàn bộ:

```text
reserved_quantity = 4
issued_quantity   = 4
released_quantity = 0
```

Part Line không còn số lượng reserve chưa sử dụng.

---

## 14.8. Release phần phụ tùng không sử dụng

Nếu phụ tùng đã được reserve nhưng không còn cần thiết, phần reservation còn lại phải được release.

Ví dụ:

```text
Reserved = 4
Issued   = 2
```

Còn:

```text
remaining_reserved = 2
```

Có thể release bằng API:

```http
POST /api/work-orders/{workOrderId}/parts/{partLineId}/release
```

### Request

```json
{
  "quantity": 2
}
```

Work Order Service gửi yêu cầu đến Inventory Service để release reservation.

Sau khi thành công:

```text
released_quantity += quantity
```

Kết quả:

```text
reserved_quantity = 4
issued_quantity   = 2
released_quantity = 2
```

---

## 14.9. Auto Release

Khi Work Order:

```text
COMPLETED
```

hoặc:

```text
CANCELED
```

không nên để lại reservation treo.

Hệ thống cần kiểm tra:

```text
remaining_reserved =
reserved_quantity
- issued_quantity
- released_quantity
```

Nếu:

```text
remaining_reserved > 0
```

thì phần còn lại phải được release về Inventory.

Ví dụ:

```text
Reserved = 4
Issued   = 2
Released = 0
```

Khi Work Order hoàn thành:

```text
Auto Release = 2
```

Sau đó:

```text
Reserved = 4
Issued   = 2
Released = 2
```

---

# 📌 Pha 15: Hoàn Thành Work Order

---

## 15.1. Complete Work Order

### API

```http
POST /api/work-orders/{id}/complete
```

### Preconditions

Kiểm tra:

```text
Không còn Service Line APPROVED hoặc IN_PROGRESS
```

Tất cả Service Line cần thực hiện phải:

```text
COMPLETED
```

Các Part được sử dụng phải được xử lý inventory theo business rule.

---

## Transition

```text
IN_PROGRESS
    ↓
COMPLETED
```

Tạo Status History.

Sau đó:

```text
COMPLETED
    ↓
PENDING_PAYMENT
```

và phát:

```text
WorkOrderCompletedEvent
```

---

# 📌 Pha 16: Tích Hợp Billing & Payment

---

## 16.1. WorkOrderCompletedEvent

Producer:

```text
work-order-service
```

Consumer:

```text
billing-service
```

Event chứa thông tin cần thiết để Billing tạo Invoice.

Ví dụ:

```text
eventId
workOrderId
customerId
vehicleId

approved services
approved parts

pricing snapshots
total amount
occurredAt
```

Billing Service không nên phải gọi lại Catalog để lấy giá hiện tại.

Sử dụng snapshot của Work Order.

---

## 16.2. PaymentCompletedEvent

Producer:

```text
billing-service
```

Consumer:

```text
work-order-service
```

Transition:

```text
PENDING_PAYMENT
    ↓
CLOSED
```

Khi:

```text
PaymentCompletedEvent
```

được nhận thành công:

```text
status = CLOSED
closed_at = now
```

Vehicle được phép hoàn tất quy trình xuất xưởng theo nghiệp vụ hệ thống.

---

# 📌 Pha 17: Cancel Work Order

---

## 17.1. Cancel API

### API

```http
POST /api/work-orders/{id}/cancel
```

### Request

```json
{
  "reason": "Customer canceled repair"
}
```

---

## 17.2. Cancel Rules

Chỉ cho phép Cancel tại các trạng thái phù hợp:

```text
CREATED
DIAGNOSING
PENDING_APPROVAL
```

Việc cancel khi:

```text
IN_PROGRESS
```

phải được quyết định rõ bằng business rule.

Nếu đã reserve phụ tùng:

```text
Cancel Work Order
        ↓
Publish PartsReleaseRequestedEvent
        ↓
Inventory Release Reservation
```

---

# 📌 Pha 18: Kafka Messaging

---

# 18.1. Producers

## VehicleCheckedInEvent

```text
Producer:
booking-service

Consumer:
work-order-service
```

Mục đích:

```text
Booking CONFIRMED
        ↓
Booking CHECKED_IN
        ↓
Work Order CREATED
```

---

## PartsReservationRequestedEvent

```text
Producer:
work-order-service

Consumer:
inventory-service
```

Mục đích:

```text
Reserve APPROVED parts
```

---

## PartsReleaseRequestedEvent

```text
Producer:
work-order-service

Consumer:
inventory-service
```

Mục đích:

```text
Release reservation khi Work Order bị cancel
hoặc khi phần phụ tùng reserve không còn cần thiết.
```
---

## WorkOrderCompletedEvent

```text
Producer:
work-order-service

Consumer:
billing-service
```

Mục đích:

```text
Create Invoice
```

---

# 18.2. Consumers

## PartsReservedEvent

```text
Producer:
inventory-service

Consumer:
work-order-service
```
Cập nhật:

```text
reserved_quantity
```

và trạng thái reservation phù hợp.

---

## PartsReservationFailedEvent

```text
Producer:
catalog-inventory-service

Consumer:
work-order-service
```

Xử lý:

```text
FAILED
```

Không được coi reservation là luôn thành công.

---

## PaymentCompletedEvent

```text
Producer:
billing-service

Consumer:
work-order-service
```

Transition:

```text
PENDING_PAYMENT
        ↓
CLOSED
```

---

# 📌 Pha 19: Authorization

Các actor chính:

```text
ADMIN
MANAGER
ADVISOR
MECHANIC
```

---

## Advisor

Có thể:

```text
Check-in
Create Work Order
Start Diagnosis
Create Estimate
Edit Estimate
Submit Estimate
Record Customer Decision
Assign Mechanic
```

---

## Mechanic

Có thể:

```text
View assigned work
Start Service Line
Complete Service Line
```

---

## Manager

Có quyền quản lý phù hợp và có thể kế thừa các nghiệp vụ của Advisor theo mô hình phân quyền hệ thống.

---

## Admin

Quyền quản trị theo permission model.

Authorization nên dựa trên Permission thay vì hard-code role trong business logic.

---

# 📌 Pha 20: Testing

---

## 20.1. Unit Tests

Test:

### Work Order

- Idempotency với `booking_id`.
- Không tạo Work Order trùng.
- State transition hợp lệ.
- State transition không hợp lệ.

Ví dụ:

```text
CREATED → COMPLETED ❌
```

---

### Estimate

Test:

- Create Estimate.
- Add Service.
- BOM expansion.
- Add Part manually.
- Remove Service.
- Remove Part.
- Submit Estimate.
- Partial Approval.
- Full Approval.
- Full Rejection.
- Supplementary Estimate.

---

### Service Line

Test:

```text
APPROVED → IN_PROGRESS
IN_PROGRESS → COMPLETED
```

Không cho:

```text
PENDING → COMPLETED
```

---

## 20.2. Integration Tests

Test:

- OpenFeign với Catalog/Inventory Service.
- BOM expansion.
- Kafka Producer.
- Kafka Consumer.
- Reservation success.
- Reservation failure.
- Payment Completed Event.

---

## 20.3. Idempotency Tests

Đặc biệt test:

```text
Create Work Order retry
```

Request cùng:

```text
bookingId
```

nhiều lần:

```text
→ Chỉ có một Work Order
```

---

## 20.4. Event Idempotency

Kafka Consumer phải xử lý duplicate event an toàn.

Ví dụ:

```text
PaymentCompletedEvent x2
```

không được gây lỗi hoặc tạo state transition sai.

---

# 📌 Pha 21: OpenAPI / Swagger

Document rõ:

- Request.
- Response.
- Error codes.
- Authorization requirements.
- State transition rules.

Không sử dụng:

```text
/v1
```

---

# 📌 Pha 22: Dockerization

Tạo Dockerfile cho:

```text
work-order-service
```

Service container:

```text
Không expose trực tiếp ra Internet
```

External access:

```text
Client
    ↓
API Gateway
    ↓
Work Order Service
```

---

# 📋 5. Danh Sách API Tổng Hợp

## Work Orders

```http
POST /api/work-orders

GET  /api/work-orders
GET  /api/work-orders/{id}

POST /api/work-orders/{id}/start-diagnosis

POST /api/work-orders/{id}/complete

POST /api/work-orders/{id}/cancel

```

---

## Estimates

```http
POST /api/work-orders/{id}/estimates

GET  /api/work-orders/{id}/estimates

GET  /api/estimates/{estimateId}

POST /api/estimates/{estimateId}/submit

PATCH /api/estimates/{estimateId}/decision
```

---

## Estimate Services

```http
POST   /api/estimates/{estimateId}/services

DELETE /api/estimates/{estimateId}/services/{serviceLineId}
```

---

## Estimate Parts

```http
POST   /api/estimates/{estimateId}/parts

DELETE /api/estimates/{estimateId}/parts/{partLineId}

POST /api/work-orders/{workOrderId}/parts/{partLineId}/issue

POST /api/work-orders/{workOrderId}/parts/{partLineId}/release
```

---

## Service Lines

```http
PATCH /api/work-order-service-lines/{serviceLineId}/assign

POST /api/work-order-service-lines/{serviceLineId}/start

POST /api/work-order-service-lines/{serviceLineId}/complete
```

---

## Mechanic

```http
GET /api/me/work-order-service-lines
```

---

# 📋 6. State Machine Tổng Hợp

## Work Order

```text
CREATED
    ↓
DIAGNOSING
    ↓
PENDING_APPROVAL
    ↓
IN_PROGRESS
    ↓
COMPLETED
    ↓
PENDING_PAYMENT
    ↓
CLOSED
```

Cancel theo business rule:

```text
CREATED
DIAGNOSING
PENDING_APPROVAL
IN_PROGRESS (nếu được cho phép)
        ↓
CANCELED
```

---

## Estimate

```text
DRAFT
    ↓
PENDING_APPROVAL
    ├── APPROVED
    ├── PARTIALLY_APPROVED
    └── REJECTED
```

---

## Service Line

```text
PENDING
    ↓
APPROVED
    ↓
IN_PROGRESS
    ↓
COMPLETED
```

Hoặc:

```text
PENDING
    ↓
REJECTED
```

---

## Part Reservation

```text
PENDING
    ↓
RESERVED
    ↓
ISSUED
```

Hoặc:

```text
PENDING
    ↓
FAILED
```

Hoặc:

```text
RESERVED
    ↓
RELEASED
```

---

# 📋 7. Tiêu Chí Nghiệm Thu (Acceptance Criteria)

## 1. Idempotency

```text
UNIQUE(booking_id)
```

Retry tạo Work Order không tạo duplicate.

---

## 2. State Machine Integrity

Không cho phép transition bất hợp lệ.

Ví dụ:

```text
CREATED → COMPLETED ❌
```

Mọi thay đổi Work Order status đều tạo:

```text
work_order_status_history
```

---

## 3. Estimate Lifecycle

Hỗ trợ:

- Draft.
- Edit.
- Submit.
- Approval.
- Partial Approval.
- Rejection.
- Supplementary Estimate.

Không sửa trực tiếp Estimate đã được khách duyệt.

---

## 4. Pricing Snapshot

Service và Part phải snapshot:

```text
Name
Code
Price
```

Work Order cũ không bị ảnh hưởng khi Catalog thay đổi.

---

## 5. Inventory Integration

```text
Feign
```

được sử dụng để:

```text
Get Service
Get BOM
Get Part Information
```

Kafka được sử dụng cho:

```text
Reserve
Release
Issue
```

Reservation failure phải được xử lý.

---

## 6. Booking Integration

Work Order chỉ được tạo sau khi xe thực sự:

```text
Check-in
```

Booking Service phát:

```text
VehicleCheckedInEvent
```

Work Order Service tiêu thụ event và tạo Work Order. Booking giữ trạng thái `CHECKED_IN` trong suốt quá trình sửa chữa; trạng thái `FULFILLED` chỉ áp dụng ở bước hoàn tất phù hợp của quy trình Booking.

---

## 7. Billing Integration

Khi Work Order hoàn thành:

```text
WorkOrderCompletedEvent
        ↓
Billing tạo Invoice
```

Sau:

```text
PaymentCompletedEvent
```

Work Order:

```text
PENDING_PAYMENT
        ↓
CLOSED
```

---

## 8. URL Rules

Tất cả API:

```text
/api/...
```

Tuyệt đối không:

```text
/api/v1/...
```

---

# 🎯 8. Luồng Nghiệp Vụ Tổng Thể

```text
Booking CONFIRMED
        ↓
Customer đến gara
        ↓
Advisor Check-in
        ↓
VehicleCheckedInEvent
        ↓
Work Order CREATED
        ↓
Start Diagnosis
        ↓
Create Estimate
        ↓
Add Service
        ↓
Expand BOM
        ↓
Add additional parts if needed
        ↓
Submit Estimate
        ↓
Customer Decision
        ↓
Approved Parts
        ↓
Kafka Reservation Request
        ↓
Inventory Reserve Success
        ↓
IN_PROGRESS
        ↓
Assign Mechanic
        ↓
Mechanic Start Service
        ↓
Issue/Consume Parts
        ↓
Complete Service Lines
        ↓
All required work completed
        ↓
Complete Work Order
        ↓
COMPLETED
        ↓
PENDING_PAYMENT
        ↓
WorkOrderCompletedEvent
        ↓
Billing Create Invoice
        ↓
PaymentCompletedEvent
        ↓
CLOSED
```

---

# 🚀 9. Thứ Tự Khuyến Nghị Khi Code

Để tránh phát triển tất cả cùng lúc, triển khai theo thứ tự:

### Giai đoạn 1 — Foundation

```text
Project
Database
Entities
Enums
Repositories
Flyway
```

### Giai đoạn 2 — Core Work Order

```text
Create Work Order
Idempotency
Get Detail
List
State History
```

### Giai đoạn 3 — Estimate

```text
Create Estimate
Add Service
Add Part
BOM Expansion
Remove/Edit
Submit
```

### Giai đoạn 4 — Approval

```text
Partial Approval
Estimate Status
Supplementary Estimate
```

### Giai đoạn 5 — Execution

```text
Assign Mechanic
My Work
Start Service
Complete Service
Complete Work Order
```

### Giai đoạn 6 — Kafka

```text
VehicleCheckedIn
Reservation
Reservation Result
Release
Issue
WorkOrderCompleted
PaymentCompleted
```

### Giai đoạn 7 — Testing & Integration

```text
Unit Tests
Integration Tests
Kafka Tests
Idempotency Tests
OpenAPI
Docker
```

---

# Kết Luận

`work-order-service` là trung tâm của quy trình sửa chữa thực tế tại gara.

Nguyên tắc kiến trúc chính:

```text
Booking
    = quản lý lịch hẹn trước khi xe đến

Work Order
    = quản lý quá trình sửa chữa thực tế

Catalog/Inventory
    = dịch vụ, BOM và tồn kho

Billing
    = hóa đơn và thanh toán
```

Luồng chính:

```text
Check-in
    ↓
Work Order
    ↓
Diagnosis
    ↓
Estimate
    ↓
Customer Approval
    ↓
Reserve Parts
    ↓
Repair
    ↓
Complete
    ↓
Payment
    ↓
Close
```

Thiết kế này hỗ trợ đầy đủ:

- Partial Approval.
- Extra Quote.
- Inventory Reservation.
- Reservation Failure.
- Part Release.
- Part Issue.
- Mechanic Assignment.
- Payment Integration.
- Idempotency.
- Pricing Snapshot.
- Event-Driven Integration.
- Audit lịch sử trạng thái.
