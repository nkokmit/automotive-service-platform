# PLAN.md: Kế Hoạch Triển Khai Catalog Inventory Service

Tài liệu này là chỉ dẫn thực thi (Implementation Plan) chi tiết dành cho AI Coding Agent / Lập trình viên để xây dựng microservice `inventory-service` tuân thủ nghiêm ngặt các quy tắc trong `AI_CONTEXT.md` và `ARCHITECTURE.md`.

---

## ⚙️ 1. Thông Tin Dịch Vụ & Tech Stack

* **Service Name:** `inventory-service`
* **Database Ownership:** `inventory_service` (MySQL 9.7)
* **Tech Stack:**
  * **Language & Framework:** Java 21, Spring Boot 4.x
  * **Build Tool:** Apache Maven (với Maven Wrapper)
  * **Database & Migration:** MySQL 9.7, Flyway (`db/migration/`)
  * **Event Broker:** Apache Kafka
  * **Data Access & Mapping:** Spring Data JPA / Hibernate, MapStruct, Lombok
  * **Documentation:** OpenAPI 3 / Swagger
  * **Inter-service Communication:** Kafka (event bất đồng bộ), REST/OpenFeign (đồng bộ khi cần response ngay)

> **Lưu ý về tên:** project **không** có service tên `catalog-inventory-service`.
> `inventory-service` là nguồn dữ liệu chuẩn cho cả **catalog dịch vụ** và
> **catalog phụ tùng**. Tên database `inventory_service` và tên service trong
> `docker-compose.yml` / `api-gateway` là chuẩn — xem `ARCHITECTURE.md` §2 và
> `SERVICES/inventory-service.md`.

---

## 📂 2. Cấu Trúc Thư Mục Chuẩn (Package Structure)

Cấu trúc dự án tuân theo quy định trong `ARCHITECTURE.md`:

```text
inventory-service/
├── src/
│   ├── main/
│   │   ├── java/com/example/inventory_service/
│   │   │   ├── common/          # Utilities, Constants dùng chung
│   │   │   ├── config/          # Cấu hình Spring, Kafka, OpenFeign, Swagger
│   │   │   ├── controller/      # REST API Controllers (Spring MVC)
│   │   │   ├── dto/             # Request / Response DTOs
│   │   │   ├── entity/          # JPA Entities (Mapping 1-1 với MySQL)
│   │   │   ├── enums/           # Business Enums (PurchaseOrderStatus, TransactionType...)
│   │   │   ├── exception/       # Exception custom và GlobalExceptionHandler
│   │   │   ├── mapper/          # MapStruct mappers (Entity <-> DTO)
│   │   │   ├── messaging/       # Kafka Producers & Consumers
│   │   │   ├── repository/      # Spring Data JPA Repositories
│   │   │   ├── security/        # JWT Authentication & Interceptor
│   │   │   └── service/         # Business logic services
│   │   └── resources/
│   │       ├── application.yaml
│   │       └── db/migration/    # Flyway Migration scripts (V1, V2...)
│   └── test/
├── pom.xml
└── Dockerfile
```

> Package gốc là `com.example.inventory_service` (không dùng dấu gạch dưới
> cho service khác trong project cũng vậy). Tên file cấu hình là
> `application.yaml` — khớp với các service đang có trong repo.

---

## 🔌 3. Quy ước API (API Conventions)

Các endpoint của `inventory-service` **tuân thủ đúng convention URL đang có
của project** (tham chiếu `backend/services/staff-service/PLAN.md` §5 và
`backend/automotive-ai-context/SERVICES/*.md`):

- **Tiền tố `/api`, KHÔNG có segment version.** Các service đang có dùng
  `/api/<resource>` và **không** dùng `/api/v1/...`:
  `/api/users`, `/api/roles`, `/api/permissions`, `/api/auth`, `/api/staff`,
  `/api/work-shifts`, `/api/schedules`, `/api/vehicles`, `/api/customers`,
  `/api/service-history`. Vì vậy endpoint của service này **không** dùng
  `/api/v1/...`.
- **Tên resource dạng số nhiều, `kebab-case`:** `/api/parts`,
  `/api/part-categories`, `/api/services`, `/api/suppliers`,
  `/api/purchase-orders`, `/api/inventory-transactions`.
- **Resource con đặt sau resource cha:**
  `/api/services/{serviceId}/bom`, `/api/purchase-orders/{purchaseOrderId}/items`.
- **Hành động nghiệp vụ dùng sub-resource dạng verb:**
  `POST /api/purchase-orders/{purchaseOrderId}/complete`,
  `POST /api/parts/reserve`, `POST /api/parts/issue`, `POST /api/parts/release`.
- **Trả về đúng contract chung (`GLOBAL_RULES` §15):** mọi response bọc trong
  `ApiResponse<T>` (`code`, `message`, `result`). Danh sách có phân trang dùng
  `PageResponse<T>` với tham số `page`, `size`, `sortBy`, `sortDirection`.
- **Phân quyền bằng `@PreAuthorize("hasAuthority('...')")`** với tên permission
  dạng `<RESOURCE>_<ACTION>` (ví dụ `PART_READ`, `PART_WRITE`,
  `PURCHASE_ORDER_READ`). Permission phải được seed ở `user-service` bằng
  migration mới (`GLOBAL_RULES` §7) — không sửa migration đã dùng.
- **Mọi endpoint mới phải khai báo route tương ứng trong `api-gateway`**
  (`backend/api-gateway/src/main/resources/application.yaml`, mục
  `spring.cloud.gateway.server.webflux.routes`), ví dụ `Path=/api/parts/**`.
  Gateway **không** dùng `StripPrefix`, nên URL client gọi qua gateway giống
  hệt URL service khai báo.

### 3.0. Contract với service khác

Hai điểm tích hợp quan trọng, cả hai đều **cross-service** nên không được tạo
foreign key hay JPA relationship (`GLOBAL_RULES` §2):

1. **Với `booking-service` — đọc catalog dịch vụ (đồng bộ).**
   `booking-service` cần `id`, `name`, `is_active`, `duration_minutes`,
   `required_techs` để tính thời lượng và nhu cầu nhân sự rồi lưu snapshot
   (`booking-service/PLAN.md` §3.1). Endpoint đọc này phải là **synchronous**
   vì caller cần dữ liệu ngay để tạo booking.
2. **Với `work-order-service` — trừ tồn kho (event-driven).**
   Work Order Service **không** được ghi thẳng vào bảng của service này
   (`ARCHITECTURE.md` §10). Chỉ **phụ tùng thuộc item được duyệt** mới bị
   trừ, vì khách hàng có thể duyệt từng phần của báo giá.

Tên cột trong API phải khớp đúng tên cột trong schema (`duration_minutes`,
`required_techs`, `default_quantity`) để hai bên không lệch contract.

### 3.1. Danh sách endpoint dự kiến

| Method | Endpoint | Mục đích |
|---|---|---|
| `POST` | `/api/part-categories` | Tạo nhóm phụ tùng |
| `GET` | `/api/part-categories` | Danh sách nhóm phụ tùng (phân trang + lọc) |
| `GET` | `/api/part-categories/{categoryId}` | Chi tiết nhóm phụ tùng |
| `PUT` | `/api/part-categories/{categoryId}` | Cập nhật nhóm phụ tùng |
| `DELETE` | `/api/part-categories/{categoryId}` | Xóa nhóm phụ tùng |
| `POST` | `/api/service-categories` | Tạo nhóm dịch vụ |
| `GET` | `/api/service-categories` | Danh sách nhóm dịch vụ (phân trang + lọc) |
| `GET` | `/api/service-categories/{categoryId}` | Chi tiết nhóm dịch vụ |
| `PUT` | `/api/service-categories/{categoryId}` | Cập nhật nhóm dịch vụ |
| `DELETE` | `/api/service-categories/{categoryId}` | Xóa nhóm dịch vụ |
| `POST` | `/api/services` | Tạo dịch vụ trong catalog |
| `GET` | `/api/services` | Danh sách dịch vụ (phân trang + lọc) |
| `GET` | `/api/services/{serviceId}` | Chi tiết dịch vụ |
| `PUT` | `/api/services/{serviceId}` | Cập nhật dịch vụ |
| `DELETE` | `/api/services/{serviceId}` | Xóa dịch vụ |
| `POST` | `/api/parts` | Tạo phụ tùng |
| `GET` | `/api/parts` | Tìm kiếm phụ tùng (lọc SKU, OEM, tên, hãng xe tương thích) |
| `GET` | `/api/parts/{partId}` | Chi tiết phụ tùng |
| `PUT` | `/api/parts/{partId}` | Cập nhật thông tin phụ tùng |
| `DELETE` | `/api/parts/{partId}` | Xóa phụ tùng |
| `GET` | `/api/services/{serviceId}/bom` | Định mức phụ tùng đi kèm dịch vụ |
| `POST` | `/api/suppliers` | Tạo nhà cung cấp |
| `GET` | `/api/suppliers` | Danh sách nhà cung cấp |
| `GET` | `/api/suppliers/{supplierId}` | Chi tiết nhà cung cấp |
| `PUT` | `/api/suppliers/{supplierId}` | Cập nhật nhà cung cấp |
| `DELETE` | `/api/suppliers/{supplierId}` | Xóa nhà cung cấp |
| `POST` | `/api/purchase-orders` | Tạo đơn nhập hàng |
| `GET` | `/api/purchase-orders` | Danh sách đơn nhập hàng (lọc nhà cung cấp, trạng thái) |
| `GET` | `/api/purchase-orders/{purchaseOrderId}` | Chi tiết đơn nhập hàng |
| `PUT` | `/api/purchase-orders/{purchaseOrderId}` | Cập nhật đơn nhập hàng (chỉ khi `DRAFT`) |
| `POST` | `/api/purchase-orders/{purchaseOrderId}/approve` | Duyệt đơn nhập hàng (`DRAFT` → `APPROVED`) |
| `POST` | `/api/purchase-orders/{purchaseOrderId}/complete` | Hoàn tất nhập kho (`APPROVED` → `RECEIVED`) |
| `POST` | `/api/purchase-orders/{purchaseOrderId}/cancel` | Hủy đơn nhập hàng (`DRAFT`/`APPROVED` → `CANCELED`) |
| `POST` | `/api/parts/reserve` | Giữ chỗ tồn kho cho Work Order |
| `POST` | `/api/parts/issue` | Xuất kho phụ tùng |
| `POST` | `/api/parts/release` | Giải phóng giữ chỗ tồn kho |
| `POST` | `/api/parts/check-availability` | Kiểm tra tồn kho tức thời (sync cho service khác) |
| `POST` | `/api/parts/pricing` | Lấy đơn giá phụ tùng phục vụ lập Báo giá (sync cho service khác) |
| `GET` | `/api/inventory-transactions` | Tra cứu sổ nhật ký kho (lọc phụ tùng, loại, khoảng thời gian) |

---

## 🎯 4. Các Pha Triển Khai (Phases & Tasks)

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
- [ ] **1.2. Thiết lập `application.yaml`**
  * Cấu hình kết nối MySQL database `inventory_service`.
  * Đặt `spring.jpa.hibernate.ddl-auto: validate` (Tuyệt đối không dùng `update` hay `create-drop`).
  * Cấu hình Flyway enabled, Kafka bootstrap servers, và Server Port.
  * Khai báo `spring.kafka.consumer.properties."[spring.json.trusted.packages]"`
    gồm `com.example.inventory_service.messaging.*` và
    `com.example.workorder.messaging.*` để nhận event từ Work Order Service.
- [ ] **1.3. Cấu hình Common Package & Exception Handling**
  * Xây dựng `GlobalExceptionHandler` bắt các lỗi validate, `EntityNotFoundException`, `InsufficientStockException`.

---

### 📌 Pha 2: Thiết Kế Database & JPA Entities (Flyway Migration)
- [x] **2.1. Tạo Migration Script `V1__init_inventory_schema.sql`**
  * Tạo các bảng trên MySQL 9.7 (10 bảng, 3 nhóm):
    * **Nhóm danh mục:** `service_categories` (nhóm dịch vụ), `services`
      (catalog dịch vụ: `code`, `name`, `duration_minutes`, `required_techs`,
      `base_labor_price`, `is_active`), `part_categories` (nhóm phụ tùng),
      `parts` (catalog phụ tùng: `sku`, `oem_code`, `name`, `brand`, `unit`,
      `cost_price`, `selling_price`, `on_hand_stock`, `reserved_stock`,
      `min_stock_level`, `is_active`).
    * **Nhóm định mức & tương thích:** `service_boms` (`service_id`,
      `part_id`, `default_quantity`), `part_vehicle_compatibilities`
      (`vehicle_brand`, `vehicle_model`, `year_from`, `year_to`).
    * **Nhóm mua hàng & sổ kho:** `suppliers`, `purchase_orders`,
      `purchase_order_items`, `inventory_transactions` (`part_id`, `type`,
      `quantity`, `stock_before`, `stock_after`, `reference_type`,
      `reference_id`).
  * Quy ước schema (khớp `customer-vehicle-service` / `staff-service`):
    * ID kiểu `VARCHAR(36)`, timestamp `DATETIME(6)` do JPA quản lý.
    * Enum nghiệp vụ lưu `VARCHAR` + `@Enumerated(EnumType.STRING)` — **không**
      dùng native `ENUM` của MySQL để không khoá cứng giá trị trong schema.
    * `is_active` kiểu `BOOLEAN` (khác `TINYINT(1)`).
    * Foreign key **chỉ** cho quan hệ nội bộ của service này; ID thuộc
      service khác (`created_by`, `reference_id`) chỉ lưu UUID, không FK
      (`GLOBAL_RULES` §2).
    * Cột `SMALLINT` phải map bằng `Short` (không phải `Integer`), nếu không
      Hibernate `validate` sẽ kỳ vọng `INT` và fail.
  * Tạo các Index B-Tree tối ưu tìm kiếm: `idx_parts_sku_oem`,
    `idx_trx_part_created`, `idx_po_supplier`, `idx_po_status`,
    `idx_compat_brand_model`.
  * Thêm ràng buộc `CHECK` cho giá trị không âm, số lượng > 0, khoảng năm
    hợp lệ và các ràng buộc `UNIQUE` nghiệp vụ.
- [x] **2.2. Xây dựng JPA Entities & Enums**
  * Map 1-1 các Entity JPA với bảng MySQL (10 entity: `ServiceCategory`,
    `Service`, `PartCategory`, `Part`, `ServiceBom`, `PartVehicleCompatibility`,
    `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`, `InventoryTransaction`).
  * Thiết lập `@ManyToOne(fetch = FetchType.LAZY)` cho các quan hệ nội bộ để
    tránh N+1 Query.
  * ID dùng `UUID` + `@GeneratedValue(strategy = GenerationType.UUID)` +
    `@JdbcTypeCode(SqlTypes.VARCHAR)`.
  * Định nghĩa Enums: `PurchaseOrderStatus` (`DRAFT`, `APPROVED`, `RECEIVED`, `CANCELED`), `TransactionType` (`IMPORT`, `EXPORT`, `RESERVE`, `RELEASE`, `RETURN`, `ADJUSTMENT`), `ReferenceType` (`PURCHASE_ORDER`, `WORK_ORDER`, `STOCK_TAKE`, `MANUAL`).

---

### 📌 Pha 3: Logic Nghiệp Vụ Cốt Lõi (Core Business Logic)

#### Module 3.1: Catalog Dịch Vụ & Phụ Tùng
- [ ] Implement CRUD API cho `ServiceCategory`, `Service`, `PartCategory` và `Part`.
- [ ] Implement API tìm kiếm phụ tùng nâng cao (Filter theo SKU, OEM, Tên, Hãng xe tương thích).
- [ ] Implement API lấy định mức phụ tùng (BOM) theo `serviceId`: `GET /api/services/{serviceId}/bom`.
- [ ] **Cung cấp catalog dịch vụ cho `booking-service`:** Booking Service
  đọc `id`, `name`, `is_active`, `duration_minutes` và `required_techs` từ
  đây rồi lưu snapshot (`booking-service/PLAN.md` §3.1). Tên cột phải giữ
  đúng `duration_minutes` / `required_techs` để hai bên khớp.

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
- [ ] **Mọi biến động tồn kho phải ghi đủ `stock_before` / `stock_after`** trong
  `inventory_transactions` để phục vụ audit (Tiêu chí chấp nhận §3).

#### Module 3.3: Quản Lý Nhập Hàng & Giá Vốn (Purchase Orders)
- [ ] Implement CRUD API Đơn nhập hàng (`PurchaseOrder`).
- [ ] **Implement Logic Hoàn Tất Nhập Kho (`completePurchaseOrder`):**
  * Chuyển `status = RECEIVED`.
  * Tăng `on_hand_stock` cho từng mặt hàng.
  * **Tính lại Giá vốn Bình quân Tức thời (Moving Average Cost):**
    $$\text{cost\_price\_new} = \frac{(\text{on\_hand\_stock} \times \text{cost\_price}) + (\text{quantity} \times \text{import\_price})}{\text{on\_hand\_stock} + \text{quantity}}$$
  * Ghi log `inventory_transactions` (`type = IMPORT`).
  * Toàn bộ thao tác phải đóng gói trong 1 Database Transaction (`@Transactional`).

---

### 📌 Pha 4: Tích Hợp Event-Driven (Kafka) & REST Validation

> **Về tên event:** `ARCHITECTURE.md` §14 chỉ liệt kê `StockDeducted` và
> `InsufficientStock` dưới dạng *architectural guidance*. Trước khi implement,
> phải inspect code/contract hiện có của `work-order-service` và giữ nguyên
> tên đã thiết lập — không tự đặt tên mới nếu đã có contract.

- [ ] **4.1. Kafka Consumers (Lắng nghe sự kiện từ Work Order Service)**
  * **Consumer sự kiện báo giá được duyệt:** Khi khách duyệt các item trong báo giá, lọc ra danh sách phụ tùng thuộc item **được duyệt** -> Gọi `reserveParts()` hoặc `issueParts()`.
  * **Consumer sự kiện hủy lệnh sửa chữa:** Tự động gọi `releaseParts()` nếu lệnh sửa chữa bị hủy.
  * **Idempotency:** mỗi lần xử lý event phải ghi đủ `inventory_transactions`
    với `reference_type` + `reference_id` để không trừ tồn kho hai lần khi
    Kafka redeliver.
- [ ] **4.2. Kafka Producers (Phát sự kiện của Inventory Service)**
  * **`StockDeducted` Producer:** Phát event khi xuất kho phụ tùng thành công.
  * **`InsufficientStock` Producer:** Phát event báo thiếu hàng khi không đủ tồn kho phục vụ lệnh.
- [ ] **4.3. REST API Sync Endpoints (Cho các Service khác gọi đồng bộ)**
  * Endpoint kiểm tra tồn kho tức thời: `POST /api/parts/check-availability`
  * Endpoint lấy đơn giá phụ tùng phục vụ lập Báo giá: `POST /api/parts/pricing`
  * Các endpoint này được service khác gọi đồng bộ, nên trả về
    `ApiResponse<T>` chuẩn và không phụ thuộc state của client.

---

### 📌 Pha 5: Kiểm Thử, Swagger Docs & Docker
- [ ] **5.1. Unit Testing & Integration Testing**
  * Write Unit Test cho thuật toán tính Giá vốn bình quân.
  * Write Integration Test với `Testcontainers` (MySQL & Kafka). Test này cũng
    là nơi kiểm chứng `ddl-auto=validate` khớp với migration — Hibernate sẽ
    fail sớm nếu cột/kiểu trong entity lệch schema.
- [ ] **5.2. OpenAPI / Swagger Documentation**
  * Thêm Swagger annotations (`@Operation`, `@ApiResponse`) cho tất cả API Endpoints.
- [ ] **5.3. Dockerization**
  * Tạo `Dockerfile` Multi-stage build cho `inventory-service`.
  * Service đã có sẵn entry trong `docker-compose.yml` (port 8084, biến môi
    trường `DB_URL` / `INVENTORY_MYSQL_DATABASE`) — không sửa lại hạ tầng
    Docker (`GLOBAL_RULES` §17).

---

## 📋 5. Tiêu Chí Chấp Nhận (Acceptance Criteria)

1. **Độc lập dữ liệu:** Không truy cập trực tiếp DB của service khác; chỉ lưu `referenceId` (ví dụ `workOrderId`, `staffId`).
2. **Tính đúng đắn của Kho:** Không xảy ra tình trạng âm `on_hand_stock` hoặc `reserved_stock`.
3. **Audit Trail:** mọi biến động tăng/giảm/giữ chỗ kho đều có record trong `inventory_transactions`.
4. **Schema Control:** Mọi thay đổi cấu trúc bảng đều phải thông qua Flyway Migration scripts.
5. **Entity ↔ Schema khớp tuyệt đối:** Hibernate chạy với `ddl-auto=validate`,
   nên mọi cột trong entity phải tồn tại trong migration **và đúng kiểu dữ liệu**
   (`VARCHAR(36)` ↔ `UUID` + `@JdbcTypeCode(SqlTypes.VARCHAR)`, `DATETIME(6)` ↔
   `Instant`, `SMALLINT` ↔ `Short`, `BOOLEAN` ↔ `Boolean`, `DECIMAL(p,s)` ↔
   `BigDecimal`). Migration là source of truth; entity sửa theo, không ngược lại.
6. **Không dùng native `ENUM` của MySQL:** enum nghiệp vụ lưu `VARCHAR` +
   `@Enumerated(EnumType.STRING)` để thêm giá trị mới không cần đổi schema.
7. **Contract với service khác giữ đúng tên cột:** `duration_minutes` và
   `required_techs` (catalog dịch vụ, dùng bởi `booking-service`),
   `default_quantity` (định mức BOM).
