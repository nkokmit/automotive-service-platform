# PLAN.md: Kế Hoạch Triển Khai Catalog Inventory Service

Tài liệu này là chỉ dẫn thực thi (Implementation Plan) chi tiết dành cho AI Coding Agent / Lập trình viên để xây dựng microservice `inventory-service` tuân thủ nghiêm ngặt các quy tắc trong `AI_CONTEXT.md` và `ARCHITECTURE.md`.

---

## ⚙️ 1. Thông Tin Dịch Vụ & Tech Stack

* **Service Name:** `catalog-inventory-service`
* **Database Ownership:** `catalog_inventory_service` (MySQL 9.7)
* **Tech Stack:**
  * **Language & Framework:** Java 21, Spring Boot 4.x
  * **Build Tool:** Apache Maven (với Maven Wrapper)
  * **Database & Migration:** MySQL 9.7, Flyway (`db/migration/`)
  * **Event Broker:** Apache Kafka
  * **Data Access & Mapping:** Spring Data JPA / Hibernate, MapStruct, Lombok
  * **Documentation:** OpenAPI 3 / Swagger
  * **Inter-service Communication:** OpenFeign (REST đồng bộ), Kafka (Event bất đồng bộ)

---

## 📂 2. Cấu Trúc Thư Mục Chuẩn (Package Structure)

Cấu trúc dự án tuân theo quy định trong `ARCHITECTURE.md`:

```text
inventory-service/
├── src/
│   ├── main/
│   │   ├── java/com/example/inventory/
│   │   │   ├── common/          # Utilities, Constants dùng chung
│   │   │   ├── config/          # Cấu hình Spring, Kafka, OpenFeign, Swagger
│   │   │   ├── controller/      # REST API Controllers (Spring MVC)
│   │   │   ├── dto/             # Request / Response DTOs
│   │   │   ├── entity/          # JPA Entities (Mapping 1-1 với MySQL)
│   │   │   ├── enums/           # Business Enums (POStatus, TransactionType...)
│   │   │   ├── exception/       # Exception custom và GlobalExceptionHandler
│   │   │   ├── mapper/          # MapStruct mappers (Entity <-> DTO)
│   │   │   ├── messaging/       # Kafka Producers & Consumers
│   │   │   ├── repository/      # Spring Data JPA Repositories
│   │   │   ├── security/        # JWT Authentication & Interceptor
│   │   │   └── service/         # Business logic services
│   │   └── resources/
│   │       ├── application.yml
│   │       └── db/migration/    # Flyway Migration scripts (V1, V2...)
│   └── test/
├── pom.xml
└── Dockerfile
```

---

## 🎯 3. Các Pha Triển Khai (Phases & Tasks)

```text
[Pha 1: Setup & Infrastructure] ──> [Pha 2: Flyway & Entities]
                                                │
                                                ▼
[Pha 5: Testing & Docker]     <── [Pha 4: Integration & Kafka] <── [Pha 3: Core Business Logic]
```

### 📌 Pha 1: Khởi Tạo Dự Án & Cấu Hình Cơ Bản
- [ ] **1.1. Khởi tạo Maven Project & `pom.xml`**
  * Khai báo Java 21, Spring Boot 4.x starter (Web, Data JPA, Validation, Kafka, Actuator).
  * Khai báo MySQL Connector, Flyway MySQL extension, Lombok, MapStruct, Springdoc OpenAPI.
- [ ] **1.2. Thiết lập `application.yml`**
  * Cấu hình kết nối MySQL database `inventory_service`.
  * Đặt `spring.jpa.hibernate.ddl-auto: validate` (Tuyệt đối không dùng `update` hay `create-drop`).
  * Cấu hình Flyway enabled, Kafka bootstrap servers, và Server Port.
- [ ] **1.3. Cấu hình Common Package & Exception Handling**
  * Xây dựng `GlobalExceptionHandler` bắt các lỗi validate, `EntityNotFoundException`, `InsufficientStockException`.

---

### 📌 Pha 2: Thiết Kế Database & JPA Entities (Flyway Migration)
- [ ] **2.1. Tạo Migration Script `V1__init_inventory_schema.sql`**
  * Tạo các bảng trên MySQL 9.7:
    * `part_categories`: Nhóm phụ tùng (Dầu nhớt, Phanh, Lọc, Gầm...).
    * `parts`: Danh mục phụ tùng (`sku`, `oem_code`, `name`, `unit`, `cost_price`, `selling_price`, `on_hand_stock`, `reserved_stock`, `min_stock_level`).
    * `service_boms`: Định mức phụ tùng đi kèm dịch vụ (`service_id`, `part_id`, `quantity`).
    * `part_vehicle_compatibilities`: Độ tương thích dòng xe.
    * `suppliers`: Danh mục Nhà cung cấp.
    * `purchase_orders` & `purchase_order_items`: Đơn nhập kho.
    * `inventory_transactions`: Sổ nhật ký kho (`part_id`, `type`, `quantity`, `stock_before`, `stock_after`, `reference_type`, `reference_id`).
  * Tạo các Index B-Tree tối ưu tìm kiếm: `idx_parts_sku_oem`, `idx_trx_part_created`, `idx_po_supplier`.
- [ ] **2.2. Xây dựng JPA Entities & Enums**
  * Map 1-1 các Entity JPA với bảng MySQL.
  * Thiết lập `@ManyToOne(fetch = FetchType.LAZY)` để tránh N+1 Query.
  * Định nghĩa Enums: `POStatus` (`DRAFT`, `APPROVED`, `RECEIVED`, `CANCELED`), `InventoryTrxType` (`IMPORT`, `EXPORT`, `RESERVE`, `RELEASE`, `RETURN`, `ADJUSTMENT`), `ReferenceType` (`PURCHASE_ORDER`, `WORK_ORDER`, `STOCK_TAKE`, `MANUAL`).

---

### 📌 Pha 3: Logic Nghiệp Vụ Cốt Lõi (Core Business Logic)

#### Module 3.1: Catalog Service & Phụ Tùng
- [ ] Implement CRUD API cho `PartCategory` và `Part`.
- [ ] Implement API tìm kiếm phụ tùng nâng cao (Filter theo SKU, OEM, Tên, Hãng xe tương thích).
- [ ] Implement API lấy định mức phụ tùng (BOM) theo `serviceId`: `GET /api/v1/services/{serviceId}/bom`.

#### Module 3.2: Quản Lý Kho & Giữ Chỗ Tồn Kho (Inventory Rules)
- [ ] **Xử lý Giữ chỗ (`reserveParts`) khi Khách duyệt Báo giá:**
  * Tính `availableStock = onHandStock - reservedStock`.
  * Nếu đủ hàng: Tăng `reservedStock`, tạo bản ghi `inventory_transactions` (`type = RESERVE`).
  * Nếu thiếu hàng: Bắn lỗi `InsufficientStockException`.
- [ ] **Xử lý Xuất kho (`issueParts`) khi Kỹ thuật viên nhận phụ tùng:**
  * Giảm `onHandStock` và `reservedStock`.
  * Ghi nhật ký vào `inventory_transactions` (`type = EXPORT`).
- [ ] **Xử lý Giải phóng Giữ chỗ (`releaseParts`) khi Hủy báo giá:**
  * Giảm `reservedStock`, ghi log `inventory_transactions` (`type = RELEASE`).

#### Module 3.3: Quản Lý Nhập Hàng & Giá Vốn (Purchase Orders)
- [ ] Implement CRUD API Đơn nhập hàng (`PurchaseOrder`).
- [ ] **Implement Logic Hoàn Tất Nhập Kho (`completePurchaseOrder`):**
  * Chuyển `status = RECEIVED`.
  * Tăng `on_hand_stock` cho từng mặt hàng.
  * **Tính lại Giá vốn Bình quân Tức thời (Moving Average Cost):**
    $$\text{cost\_price\_new} = \frac{(\text{on\_hand\_old} \times \text{cost\_price\_old}) + (\text{import\_qty} \times \text{import\_price})}{\text{on\_hand\_old} + \text{import\_qty}}$$
  * Ghi log `inventory_transactions` (`type = IMPORT`).
  * Toàn bộ thao tác phải đóng gói trong 1 Database Transaction (`@Transactional`).

---

### 📌 Pha 4: Tích Hợp Event-Driven (Kafka) & REST Validation

- [ ] **4.1. Kafka Consumers (Lắng nghe sự kiện từ Work Order Service)**
  * **`EstimateApprovedEvent` Consumer:** Khi khách duyệt các item trong báo giá, lọc ra danh sách phụ tùng thuộc item được duyệt -> Gọi `reserveParts()` hoặc `issueParts()`.
  * **`WorkOrderCanceledEvent` Consumer:** Tự động gọi `releaseParts()` nếu lệnh sửa chữa bị hủy.
- [ ] **4.2. Kafka Producers (Phát sự kiện của Inventory Service)**
  * **`StockDeducted` Producer:** Phát event khi xuất kho phụ tùng thành công.
  * **`InsufficientStock` Producer:** Phát event báo thiếu hàng khi không đủ tồn kho phục vụ lệnh.
- [ ] **4.3. REST API Sync Endpoints (Cho các Service khác gọi qua OpenFeign)**
  * Endpoint kiểm tra tồn kho tức thời: `POST /api/v1/parts/check-availability`
  * Endpoint lấy đơn giá phụ tùng phục vụ lập Báo giá.

---

### 📌 Pha 5: Kiểm Thử, Swagger Docs & Docker
- [ ] **5.1. Unit Testing & Integration Testing**
  * Write Unit Test cho thuật toán tính Giá vốn bình quân.
  * Write Integration Test với `Testcontainers` (MySQL & Kafka).
- [ ] **5.2. OpenAPI / Swagger Documentation**
  * Thêm Swagger annotations (`@Operation`, `@ApiResponse`) cho tất cả API Endpoints.
- [ ] **5.3. Dockerization**
  * Tạo `Dockerfile` Multi-stage build cho `inventory-service`.

---

## 📋 Tiêu Chí Chấp Nhận (Acceptance Criteria)

1. **Độc lập dữ liệu:** Không truy cập trực tiếp DB của service khác; chỉ lưu `referenceId` (ví dụ `workOrderId`, `staffId`).
2. **Tính đúng đắn của Kho:** Không xảy ra tình trạng âm `on_hand_stock` hoặc `reserved_stock`.
3. **Audit Trail:** mọi biến động tăng/giảm/giữ chỗ kho đều có record trong `inventory_transactions`.
4. **Schema Control:** Mọi thay đổi cấu trúc bảng đều phải thông qua Flyway Migration scripts.