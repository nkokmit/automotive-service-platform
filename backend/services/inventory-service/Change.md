# PLAN.md: Kế Hoạch Triển Khai Định Giá Dịch Vụ & BOM Theo Dòng Xe

Tài liệu này mô tả chi tiết các thay đổi về cơ sở dữ liệu, thuật toán tra cứu và luồng tích hợp API nhằm hỗ trợ tính đơn giá nhân công (`unit_price`), thời gian thực hiện (`duration_minutes`) và định mức vật tư (`service_boms`) khác nhau theo từng hãng xe (`brand`) và dòng xe (`model`).

---

## ⚙️ 1. Tổng Quan Kiến Trúc & Phạm Vi Ảnh Hưởng

* **Nguyên tắc đồng bộ dữ liệu xe:** Tận dụng trực tiếp 2 trường `brand` (hãng xe) và `model` (dòng xe) dạng chuỗi từ `customer-vehicle-service` (không tách bảng danh mục `vehicle_models`), giữ nguyên toàn bộ schema và code của `customer-vehicle-service`.
* **Chuẩn hóa khóa tra cứu:** Mọi giá trị `brand` và `model` khi lưu cấu hình hoặc truy vấn đều được chuẩn hóa theo quy tắc `UPPER(TRIM(value))`. Sử dụng chuỗi `'ALL'` làm giá trị đại diện mặc định thay cho `NULL` để ràng buộc `UNIQUE KEY` trên MySQL 9.7 hoạt động chính xác tuyệt đối.
* **Bảo toàn tính bất biến (Snapshot Immutability):**
  * `inventory-service`: Nắm giữ bảng giá cấu hình và thuật toán tính giá/bung BOM.
  * `work-order-service`: Gọi API lấy báo giá theo xe tại thời điểm lập `Estimate`, sau đó lưu **Snapshot** vào `work_order_services` và `work_order_parts` (không thay đổi schema).
  * `billing-service`: Hoàn toàn không bị ảnh hưởng vì hóa đơn lấy dữ liệu đã chốt từ `work-order-service`.
* **Quy ước API:** Toàn bộ endpoint mới sử dụng tiền tố `/api/...`, **không dùng `/v1`**.

---

## 🔍 2. Thuật Toán Tra Cứu Ưu Tiên 3 Tầng (Fallback Priority)

Khi nhận yêu cầu báo giá cho một dịch vụ `serviceId` với cặp `(brand, model)` của xe (ví dụ: `brand = "TOYOTA"`, `model = "FORTUNER"`):

### 2.1. Tra cứu Đơn giá & Thời gian công thợ (`service_vehicle_pricings`)
Hệ thống tìm kiếm bản ghi đầu tiên thỏa mãn theo thứ tự từ chi tiết đến tổng quát:
1. **Tầng 1 (Khớp chính xác Hãng + Dòng xe):** `(service_id, 'TOYOTA', 'FORTUNER')`
2. **Tầng 2 (Khớp theo Hãng xe):** `(service_id, 'TOYOTA', 'ALL')` — áp dụng khung giá chung cho toàn bộ xe thuộc hãng đó (ví dụ: các dòng xe sang như Mercedes-Benz, BMW).
3. **Tầng 3 (Giá gốc mặc định):** Lấy `base_labor_price` và `duration_minutes` từ bảng `services`.

### 2.2. Tra cứu Định mức phụ tùng (`service_boms`)
Cùng một dịch vụ (ví dụ *Thay dầu động cơ* hoặc *Bảo dưỡng cấp 1 vạn*), các dòng xe khác nhau có thể dùng **mã phụ tùng khác nhau** hoặc **số lượng khác nhau** (4 lít vs 7 lít). Hệ thống lấy toàn bộ danh sách phụ tùng của **tầng đầu tiên có dữ liệu**:
1. **Tầng 1:** Các bản ghi `service_boms` có `(service_id, 'TOYOTA', 'FORTUNER')`.
2. **Tầng 2:** Nếu Tầng 1 rỗng, lấy các bản ghi có `(service_id, 'TOYOTA', 'ALL')`.
3. **Tầng 3:** Nếu Tầng 2 rỗng, lấy bộ BOM mặc định toàn xưởng `(service_id, 'ALL', 'ALL')`.

---

## 🎯 3. Các Pha Triển Khai Chi Tiết

### 📌 Pha 1: Cập Nhật Database (`inventory-service`)
* [x] **1.1. Tạo Flyway Migration mới (`V5__add_vehicle_pricing_and_bom.sql`):**
  * **Tạo bảng `service_vehicle_pricings`:**
    ```sql
    CREATE TABLE IF NOT EXISTS `service_vehicle_pricings` (
        `id` VARCHAR(36) NOT NULL,
        `service_id` VARCHAR(36) NOT NULL,
        `brand` VARCHAR(100) NOT NULL,
        `model` VARCHAR(100) NOT NULL DEFAULT 'ALL',
        `unit_price` DECIMAL(12, 2) NOT NULL,
        `duration_minutes` INT NOT NULL,
        `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (`id`),
        UNIQUE KEY `uk_svp_service_brand_model` (`service_id`, `brand`, `model`),
        CONSTRAINT `fk_svp_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE,
        CONSTRAINT `chk_svp_price` CHECK (`unit_price` >= 0 AND `duration_minutes` >= 0),
        CONSTRAINT `chk_svp_brand_not_blank` CHECK (CHAR_LENGTH(TRIM(`brand`)) > 0 AND CHAR_LENGTH(TRIM(`model`)) > 0)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ```
  * **Mở rộng bảng `service_boms`:**
    *(Lưu ý kỹ thuật MySQL 9.7: Phải tạo `UNIQUE KEY` mới bắt đầu bằng `service_id` trước khi `DROP INDEX` cũ để không vi phạm ràng buộc chỉ mục của khóa ngoại `fk_sb_service`)*
    ```sql
    ALTER TABLE `service_boms`
        ADD COLUMN `brand` VARCHAR(100) NOT NULL DEFAULT 'ALL' AFTER `part_id`,
        ADD COLUMN `model` VARCHAR(100) NOT NULL DEFAULT 'ALL' AFTER `brand`,
        ADD UNIQUE KEY `uk_sb_service_part_vehicle` (`service_id`, `part_id`, `brand`, `model`),
        ADD KEY `idx_sb_service_vehicle` (`service_id`, `brand`, `model`),
        DROP INDEX `uk_service_part`;
    ```
* [x] **1.2. Cập nhật Domain & Repositories:**
  * Tạo entity `ServiceVehiclePricing` và repository `ServiceVehiclePricingRepository`.
  * Bổ sung 2 thuộc tính `brand` (default `"ALL"`) và `model` (default `"ALL"`) vào entity `ServiceBom`.

### 📌 Pha 2: Nghiệp Vụ & REST APIs (`inventory-service`)
* [x] **2.1. Tiện ích chuẩn hóa dữ liệu xe (`VehicleKeyNormalizer`):**
  * Hàm `normalize(String input)`: nếu `null` hoặc rỗng thì trả về `"ALL"`, ngược lại trả về `input.trim().toUpperCase(Locale.ROOT)`.
* [x] **2.2. API Tính giá & Bung BOM trọn gói (Dùng cho nội bộ & UI báo giá):**
  * **`GET /api/services/{serviceId}/quote?brand={brand}&model={model}`**
  * Thực thi thuật toán Fallback 3 tầng cho cả `unitPrice`, `durationMinutes` và danh sách `bomParts` (kèm thông tin tồn kho khả dụng hiện tại của từng phụ tùng để Cố vấn dịch vụ nắm được ngay khi lập báo giá).
  * Có endpoint nội bộ tương ứng `/internal/services/{serviceId}/quote` để Work Order dùng service token.
* [x] **2.3. API Quản trị Bảng giá Dịch vụ theo Dòng xe:**
  * **`GET /api/services/{serviceId}/pricings`:** Lấy danh sách cấu hình giá theo hãng/dòng xe của một dịch vụ.
  * **`PUT /api/services/{serviceId}/pricings`:** Tạo mới hoặc cập nhật (Upsert) đơn giá và thời gian thực hiện cho cặp `(brand, model)`.
  * **`DELETE /api/services/{serviceId}/pricings/{pricingId}`:** Xóa cấu hình giá riêng (dịch vụ tự động quay về mức giá tầng trên).
* [x] **2.4. Cập nhật API Quản trị BOM (`service_boms`):**
  * Cập nhật request/response DTO của `POST /api/services/{serviceId}/boms` (và API cập nhật BOM) để nhận thêm `brand` và `model` (mặc định `'ALL'` nếu client không truyền).
  * Hỗ trợ lọc danh sách BOM theo `brand` và `model` trên `GET /api/services/{serviceId}/boms`.

### 📌 Pha 3: Tích Hợp Luồng Lập Báo Giá (`work-order-service`)
* [x] **3.1. Cập nhật OpenFeign Client (`InventoryServiceClient`):**
  * Thêm method `ServiceQuoteResponse getServiceQuote(@PathVariable("serviceId") String serviceId, @RequestParam(required = false) String brand, @RequestParam(required = false) String model)`.
* [x] **3.2. Cập nhật nghiệp vụ thêm Dịch vụ vào Báo giá (`EstimateService`):**
  * Khi Cố vấn dịch vụ thêm dịch vụ vào `Estimate` của một `WorkOrder`:
    1. Lấy `vehicleId` từ `WorkOrder`, gọi `CustomerVehicleClient.getVehicle(vehicleId)` để lấy `make` (khóa hãng tra cứu) và `model` của xe.
    2. Gọi `InventoryServiceClient.getServiceQuote(serviceId, brand, model)` qua endpoint nội bộ.
    3. Lưu bản ghi `work_order_services` với `unit_price` và `duration_minutes` nhận được từ API quote (vẫn cho phép Cố vấn dịch vụ ghi đè đơn giá nếu nhập tay `customUnitPrice`).
    4. `autoExpandBom` mặc định bật để giữ hành vi cũ; nếu bật, sinh các dòng `work_order_parts` tương ứng với `requested_quantity = bomPart.quantity` và lưu `source_service_line_id` (soft link có sẵn) để UI nhóm theo dịch vụ.

### 📌 Pha 4: Kiểm Chứng & Nghiệm Thu (Acceptance Criteria)
* [x] **1. Kiểm thử Fallback 3 tầng (Pricing & BOM):**
  * Cấu hình dịch vụ *Bảo dưỡng 10.000 km*: giá gốc `500.000đ` (4L nhớt), giá hãng `TOYOTA` = `600.000đ` (5L nhớt), giá dòng `TOYOTA FORTUNER` = `750.000đ` (7L nhớt).
  * Gọi `/quote` cho `TOYOTA FORTUNER` $\rightarrow$ trả về `750.000đ` + 7L nhớt.
  * Gọi `/quote` cho `TOYOTA VIOS` $\rightarrow$ fallback về tầng 2 trả về `600.000đ` + 5L nhớt.
  * Gọi `/quote` cho `HONDA CIVIC` $\rightarrow$ fallback về tầng 3 trả về `500.000đ` + 4L nhớt.
* [x] **2. Kiểm thử chống trùng cấu hình:** Kiểm tra request `(service_id, "toyota ", " camry")` được chuẩn hóa thành cùng khóa với `(service_id, "TOYOTA", "CAMRY")` và cập nhật bản ghi hiện có.
* [x] **3. Kiểm thử Snapshot:** Giá/duration nhận từ quote được ghi vào dòng dịch vụ Work Order; giá tùy chỉnh vẫn ghi đè được và snapshot hiện tại không tạo quan hệ động với bảng giá.
* [x] **4. Biên dịch:** Test mục tiêu biên dịch thành công cả `inventory-service` và `work-order-service`.