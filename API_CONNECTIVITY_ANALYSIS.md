# API Connectivity Analysis - Backend vs Frontend

## Tổng Hợp

| Chỉ Số | Giá Trị |
|--------|--------|
| Tổng API Backend | 150+ endpoints |
| Tổng API Frontend kết nối | ~145 endpoints |
| API chưa kết nối | **~5 endpoints** |

> **Trạng thái theo section:**
> - Section 1 (Permissions & Roles) — ✅ Đã xong
> - Section 2 (Work Order) — ✅ Đã xong
> - Section 3 (Inventory) — ✅ Đã xong *(xem mục 3 bên dưới)*
> - Section 4+ (Staff, Billing, Notifications, Reports…) — chưa làm

---

## API Backend vs Frontend — trạng thái kết nối

### 1. **PERMISSIONS & ROLES MANAGEMENT** — ✅ **Đã kết nối ở Phase 1**
- ✅ `GET /api/permissions` - Liệt kê quyền *(đã kết nối)*
- ✅ `GET /api/permissions/{id}` - Chi tiết quyền *(đã kết nối)*
- ✅ `POST /api/permissions` - Tạo quyền *(đã kết nối)*
- ✅ `PUT /api/permissions/{id}` - Cập nhật quyền *(đã kết nối)*
- ✅ `DELETE /api/permissions/{id}` - Xóa quyền *(đã kết nối)*
- ✅ `GET /api/roles` - Liệt kê role *(đã kết nối)*
- ✅ `GET /api/roles/{id}` - Chi tiết role *(đã kết nối)*
- ✅ `POST /api/roles` - Tạo role *(đã kết nối)*
- ✅ `PUT /api/roles/{id}` - Cập nhật role *(đã kết nối)*
- ✅ `DELETE /api/roles/{id}` - Xóa role *(đã kết nối)*
- ✅ `POST /api/roles/{id}/permissions` - Gán quyền cho role *(đã kết nối)*
- ✅ `DELETE /api/roles/{id}/permissions/{permissionId}` - Gỡ quyền *(đã kết nối)*
- ✅ `DELETE /api/users/{id}/roles/{roleId}` - Gỡ role khỏi user *(đã kết nối)*

**Location:** `user-service/PermissionController`, `user-service/RoleController`
**Frontend:** `frontend/src/api/endpoints/rbac.ts` + `modules/admin/AdminPermissions.tsx` + `modules/admin/AdminRoles.tsx` (route `/admin/permissions`, `/admin/roles`)
**Độ ưu tiên:** ⭐ ADMIN/MANAGER - Quản trị quyền hạn hệ thống

---

### 2. **WORK ORDER - Chi Tiết & Quản Lý** — ✅ **Đã kết nối ở Phase 1**
- ✅ `POST /api/work-orders` - Tạo work order mới
- ✅ `POST /api/work-orders/{id}/estimates` - Tạo estimate
- ✅ `GET /api/work-orders/{id}/estimates` - Lấy danh sách estimate
- ✅ `POST /api/work-orders/{id}/start-diagnosis` - Bắt đầu chẩn đoán
- ✅ `POST /api/work-orders/{id}/complete` - Hoàn thành work order
- ✅ `POST /api/work-orders/{id}/cancel` - Hủy work order
- ✅ `GET /api/estimates/{id}` - Chi tiết estimate
- ✅ `POST /api/estimates/{id}/services` - Thêm service vào estimate
- ✅ `DELETE /api/estimates/{id}/services/{serviceLineId}` - Gỡ service
- ✅ `POST /api/estimates/{id}/parts` - Thêm part vào estimate
- ✅ `DELETE /api/estimates/{id}/parts/{partLineId}` - Gỡ part
- ✅ `POST /api/estimates/{id}/submit` - Gửi estimate
- ✅ `PATCH /api/estimates/{id}/decision` - Quyết định estimate (Approve/Reject)
- ✅ `PATCH /api/work-order-service-lines/{id}/assign` - Phân công mechanic *(backend dùng **PATCH**, tài liệu cũ ghi POST)*
- ✅ `GET /api/work-order-service-lines/me` - Service line của mechanic
- ✅ `POST /api/work-order-service-lines/{id}/start` - Bắt đầu service
- ✅ `POST /api/work-order-service-lines/{id}/complete` - Hoàn thành service
- ✅ `POST /api/work-orders/{id}/parts/{partLineId}/issue` - Lấy phụ tùng từ kho
- ✅ `POST /api/work-orders/{id}/parts/{partLineId}/release` - Trả phụ tùng lại kho

**Location:** `work-order-service/WorkOrderController`, `work-order-service/EstimateController`, `work-order-service/WorkOrderServiceLineController`, `work-order-service/WorkOrderPartController`
**Frontend:**
- `frontend/src/api/endpoints/workOrder.ts` — 19 endpoint (workOrderApi / estimateApi / workOrderServiceLineApi / workOrderPartApi)
- `frontend/src/modules/admin/AdminWorkOrders.tsx` — danh sách phiếu + modal tạo phiếu (route `/admin/work-orders`)
- `frontend/src/modules/admin/AdminWorkOrderDetail.tsx` — modal chi tiết: vòng đời phiếu, estimate, duyệt báo giá, phân công TV, xuất/trả kho
- `frontend/src/modules/admin/TechnicianWorkOrders.tsx` — không gian làm việc của kỹ thuật viên (route `/admin/work-orders/mine`)
- `frontend/src/api/session.ts` — `getTokenAuthority()` đọc claim `authorities` từ JWT (vì `/api/users/me` trả `roles[].permissions = null`)
- `frontend/src/api/types.ts` — toàn bộ type của work-order-service

**Độ ưu tiên:** ⭐⭐⭐ CỰC KỲ QUAN TRỌNG - Core business logic — **✅ ĐÃ XONG**

> **Lưu ý hợp đồng đã đối chiếu với source backend (2026-11-25):**
> 1. Phân công mechanic là **PATCH** `/assign`, không phải POST.
> 2. `mechanicId` là **id hồ sơ nhân viên** (`staff.id`), không phải `user.id`.
> 3. `PATCH /api/estimates/{id}/decision` nhận `items[]` với `itemId` là id **service line / part line**, không phải id catalog.
> 4. `DELETE` service/part line trả HTTP 204 (body rỗng).
> 5. `POST /api/work-orders` idempotent theo `bookingId` (đã có phiếu → HTTP 200 trả phiếu cũ).
> 6. Estimate `INITIAL` chỉ tạo được khi Work Order `DIAGNOSING`; `SUPPLEMENTARY` chỉ khi `IN_PROGRESS`.
> 7. Khi duyệt estimate có phụ tùng, Work Order **không** chuyển thẳng sang `IN_PROGRESS` — phải chờ Kafka
>    `PartsReservedEvent` từ Inventory Service. Nếu reserve thất bại → part line `FAILED`.
> 8. Tiếp nhận xe phải dùng `POST /api/staff/bookings/{id}/check-in` (có `vehicleId` + `odometerIn`),
>    **không** dùng `PATCH /api/staff/bookings/{id}/status` với `CHECKED_IN` (backend trả lỗi 5003).
> 9. Check-in chỉ chạy được **trong ngày hẹn** (lỗi 5305) và biển số xe phải khớp `licensePlateSnapshot` (lỗi 5303).
>
> **Ghi chú UI (2026-11-25):**
> - Giữ kho qua Kafka là **bất đồng bộ**: ngay sau khi bấm "Lưu quyết định", phần tử vẫn hiện `APPROVED`.
>   `AdminWorkOrderDetail` đã thêm **polling 2s/lần (tối đa 30s)** kèm nhãn "Đang chờ giữ kho..." để tự
>   cập nhật sang `RESERVED` và phiếu sang `IN_PROGRESS` — polling dừng sớm khi mọi part line đã
>   `RESERVED`/`PARTIALLY_RESERVED`/`FAILED`/`ISSUED` và phiếu đã rời `PENDING_APPROVAL`.
> - Nhãn vai trò ở header admin lấy từ `roles[].name` thật (`roleLabel()` trong `api/types.ts`) thay vì
>   chuỗi "Quản trị viên" hardcode — kỹ thuật viên hiện đúng "Kỹ thuật viên".
> - Phần còn lại để **xuất/trả** phải khớp công thức của backend:
>   `remaining = reservedQuantity - issuedQuantity - releasedQuantity`
>   (xem `WorkOrderPartTransaction.remainingReserved`). Frontend dùng `clampQty()` để clamp số lượng
>   trước khi gọi, tránh lỗi 400 "không vượt quá phần đang giữ chỗ còn lại".

---

### 3. **INVENTORY - QUẢN LÝ KHO & NGUYÊN VẬT LIỆU** — ✅ **Đã kết nối ở Phase 1**

#### 3.1 Phụ Tùng (Parts)
- ✅ `GET /api/parts` - Tìm kiếm / lọc / phân trang phụ tùng *(đã kết nối)*
- ✅ `GET /api/parts/{id}` - Chi tiết phụ tùng *(đã kết nối)*
- ✅ `POST /api/parts` - Tạo phụ tùng *(đã kết nối)*
- ✅ `PUT /api/parts/{id}` - Cập nhật phụ tùng *(đã kết nối)*
- ✅ `DELETE /api/parts/{id}` - Vô hiệu hoá phụ tùng (soft delete) *(đã kết nối)*
- ✅ `GET /api/parts/low-stock` - Cảnh báo sắp hết hàng *(dùng `?lowStockOnly=true` trên `GET /api/parts`)*
- ✅ `GET /api/parts/categories` - Danh mục phụ tùng *(thực tế là `GET /api/part-categories`)*
- ✅ `GET /api/parts/{id}/compatibilities` - Dòng xe tương thích *(đã kết nối)*
- ✅ `POST /api/parts/{id}/compatibilities` - Thêm dòng xe tương thích *(đã kết nối)*
- ✅ `DELETE /api/parts/{id}/compatibilities/{compatibilityId}` - Xoá dòng xe tương thích *(đã kết nối)*
- ✅ `POST /api/parts/issue` - Lấy phụ tùng từ kho *(đã kết nối)*
- ✅ `POST /api/parts/check-availability` - Kiểm tra tồn kho *(đã kết nối)*
- ✅ `POST /api/parts/pricing` - Tính giá phụ tùng *(đã kết nối)*

#### 3.2 Dịch Vụ (Services) - BOM Management
- ✅ `GET /api/services/{id}/bom` - Lấy định mức phụ tùng *(đã kết nối)*
- ✅ `POST /api/services/{id}/bom` - Tạo BOM (Bill of Materials) *(đã kết nối)*
- ✅ `PUT /api/services/{id}/bom/{bomId}` - Cập nhật BOM *(đã kết nối)*
- ✅ `DELETE /api/services/{id}/bom/{bomId}` - Xóa BOM *(đã kết nối)*

#### 3.3 Danh Mục (Categories)
- ✅ `GET /api/service-categories` - Liệt kê nhóm dịch vụ *(đã kết nối)*
- ✅ `GET /api/part-categories` - Liệt kê nhóm phụ tùng *(đã kết nối)*
- ✅ `POST /api/service-categories` - Tạo nhóm dịch vụ *(đã kết nối)*
- ✅ `PUT /api/service-categories/{id}` - Cập nhật nhóm dịch vụ *(đã kết nối)*
- ✅ `DELETE /api/service-categories/{id}` - Xóa nhóm dịch vụ *(đã kết nối)*
- ✅ `POST /api/part-categories` - Tạo nhóm phụ tùng *(đã kết nối)*
- ✅ `PUT /api/part-categories/{id}` - Cập nhật nhóm phụ tùng *(đã kết nối)*
- ✅ `DELETE /api/part-categories/{id}` - Xóa nhóm phụ tùng *(đã kết nối)*

#### 3.4 Nhà Cung Cấp (Suppliers)
- ✅ `GET /api/suppliers` - Liệt kê nhà cung cấp *(đã kết nối)*
- ✅ `GET /api/suppliers/{id}` - Chi tiết nhà cung cấp *(đã kết nối)*
- ✅ `POST /api/suppliers` - Tạo nhà cung cấp *(đã kết nối)*
- ✅ `PUT /api/suppliers/{id}` - Cập nhật nhà cung cấp *(đã kết nối)*
- ✅ `DELETE /api/suppliers/{id}` - Xóa nhà cung cấp *(đã kết nối)*

#### 3.5 Đơn Hàng (Purchase Orders)
- ✅ `GET /api/purchase-orders` - Liệt kê đơn hàng *(đã kết nối)*
- ✅ `GET /api/purchase-orders/{id}` - Chi tiết đơn hàng *(đã kết nối)*
- ✅ `POST /api/purchase-orders` - Tạo đơn hàng *(đã kết nối)*
- ✅ `PUT /api/purchase-orders/{id}` - Cập nhật đơn hàng *(đã kết nối)*
- ✅ `POST /api/purchase-orders/{id}/approve` - Phê duyệt đơn hàng *(đã kết nối)*
- ✅ `POST /api/purchase-orders/{id}/complete` - Hoàn thành đơn hàng / nhập kho *(đã kết nối)*
- ✅ `POST /api/purchase-orders/{id}/cancel` - Hủy đơn hàng *(đã kết nối)*

#### 3.6 Giao Dịch Kho (Inventory Transactions)
- ✅ `GET /api/inventory-transactions` - Lịch sử giao dịch kho *(đã kết nối)*

**Location:** `inventory-service/PartController`, `inventory-service/ServiceController`, `inventory-service/SupplierController`, `inventory-service/PurchaseOrderController`, `inventory-service/InventoryTransactionController`, `inventory-service/PartCategoryController`, `inventory-service/ServiceCategoryController`
**Frontend:**
- `frontend/src/api/endpoints/inventory.ts` — endpoint client cho toàn bộ inventory-service (thêm mới: `checkAvailability`, `getPricing`, `issueParts`, CRUD suppliers, CRUD purchase-orders, `listInventoryTransactions`, CRUD BOM, CRUD categories)
- `frontend/src/api/types.ts` — `SupplierResponse`, `PurchaseOrderResponse`, `PurchaseOrderItemResponse`, `PurchaseOrderStatus`, `InventoryTransactionResponse`, `InventoryTransactionType`, `InventoryReferenceType`, `StockAvailabilityResponse`, `PartPricingResponse`
- `frontend/src/modules/admin/AdminParts.tsx` — danh sách + CRUD phụ tùng, hiển thị `onHand` / `reserved` / `available`, lọc "sắp hết hàng" *(route `/admin/parts`)*
- `frontend/src/modules/admin/AdminSuppliers.tsx` — CRUD nhà cung cấp *(route `/admin/suppliers`)*
- `frontend/src/modules/admin/AdminPurchaseOrders.tsx` + `AdminPurchaseOrderForms.tsx` — danh sách + modal soạn thảo + modal chi tiết, vòng đời `DRAFT → APPROVED → RECEIVED` *(route `/admin/purchase-orders`)*
- `frontend/src/modules/admin/AdminInventoryTransactions.tsx` — sổ nhật ký kho + bộ lọc (phụ tùng / loại giao dịch / loại tham chiếu / khoảng thời gian) *(route `/admin/inventory-transactions`)*
- `frontend/src/modules/admin/AdminServiceBom.tsx` — quản lý định mức phụ tùng của một dịch vụ *(route `/admin/services/bom/:serviceId`)*
- `frontend/src/modules/admin/AdminCategories.tsx` — quản lý nhóm dịch vụ & nhóm phụ tùng *(route `/admin/categories`)*
- `frontend/src/components/AdminTable.tsx` — thêm prop `readOnly` để ẩn nút ghi khi user chỉ có authority đọc

**Độ ưu tiên:** ⭐⭐ QUAN TRỌNG - Quản lý kho, tồn kho — **✅ ĐÃ XONG**

> **Lưu ý hợp đồng đã đối chiếu với source backend (2026-11-25):**
> 1. **Không có** `GET /api/parts/low-stock` và `GET /api/parts/categories` — backend dùng
>    `GET /api/parts?lowStockOnly=true` và `GET /api/part-categories`.
> 2. **Không có** endpoint sửa tồn kho trực tiếp. `PartController.updatePart` ghi rõ
>    *"Không đổi tồn kho qua API này"*. Tồn chỉ đổi qua đơn nhập hàng (nhập kho) và các
>    thao tác kho của Work Order. Form sửa phụ tùng vì vậy chỉ cho chỉnh `minStockLevel`.
> 3. `POST /api/parts/issue` nhận `{ referenceId, items[], note? }` — `referenceId` là **Work Order id**,
>    `items[]` là `{ partId, quantity }` (mọi endpoint stock dùng chung `StockItemRequest`).
> 4. `POST /api/parts/check-availability` và `POST /api/parts/pricing` nhận `{ items: [{ partId, quantity }] }`.
> 5. Vòng đời đơn nhập hàng: `DRAFT → APPROVED → RECEIVED`, huỷ được ở `DRAFT`/`APPROVED`
>    (đơn `RECEIVED` huỷ không được — lỗi 4503). Chỉ `DRAFT` mới sửa được.
> 6. `GET /api/purchase-orders` trả DTO **rút gọn** với `items = []` (backend `toSummary`).
>    Phải gọi thêm `GET /api/purchase-orders/{id}` mới lấy được dòng hàng — frontend gọi
>    endpoint chi tiết trước khi mở modal sửa, nếu không sẽ ghi đè mất dòng cũ.
> 7. `POST /api/purchase-orders/{id}/complete` là **nhập kho**: tăng `onHand`, tính lại
>    `costPrice` theo bình quân và ghi sổ kho `IMPORT` — tất cả trong một transaction.
> 8. `ServiceBomResponse` serialize `default_quantity` (snake_case, có `@JsonProperty`).
> 9. Xoá nhóm phụ tùng / nhóm dịch vụ là **xoá cứng** (không soft-delete) và không xoá được
>    nếu nhóm đang có phụ tùng / dịch vụ — backend trả 400 kèm message tiếng Việt.
> 10. `InventoryTransactionResponse.stockBefore/stockAfter` mang **hai nghĩa** khác nhau:
>     với `IMPORT`/`EXPORT`/`RETURN`/`ADJUSTMENT` là tồn thực, với `RESERVE`/`RELEASE` là
>     tồn giữ chỗ. UI ghi chú rõ dưới bảng.
> 11. Authority: `PART_READ`/`PART_WRITE`/`STOCK_WRITE`, `SUPPLIER_READ`/`SUPPLIER_WRITE`,
>     `PURCHASE_ORDER_READ`/`PURCHASE_ORDER_WRITE`, `INVENTORY_TRANSACTION_READ`,
>     `SERVICE_READ`/`SERVICE_WRITE`.
>
> **Ghi chú UI (2026-11-25):**
> - Mọi màn hình Section 3 đều kiểm tra authority từ claim `authorities` của JWT
>   (`hasTokenAuthority()` trong `api/session.ts`) để ẩn nút ghi — không chỉ ẩn nút mà còn
>   ẩn cả cột "Hành động" qua prop `readOnly` của `AdminTable`.
> - Sổ kho hiển thị `+/-` theo nghĩa giao dịch (nhập/giữ chỗ là tăng, xuất/giải phóng là giảm)
>   và chú thích phân biệt tồn thực vs tồn giữ chỗ.
> - Kiểm thử: `scripts/section3-smoke.mjs` (CRUD nhà cung cấp / phụ tùng / đơn nhập hàng /
>   nhập kho / sổ kho) và `scripts/section3-bom-cat-smoke.mjs` (BOM + nhóm danh mục).


---

### 4. **STAFF - QUẢN LÝ NHÂN VIÊN & LỊCH TRÌNH**
- ✅ `POST /api/staff` - Tạo nhân viên
- ✅ `PUT /api/staff/{id}` - Cập nhật nhân viên
- ✅ `PATCH /api/staff/{id}/is-active` - Bật/tắt trạng thái nhân viên
- ✅ `DELETE /api/staff/{id}` - Xóa nhân viên
- ✅ `GET /api/work-shifts` - Liệt kê ca làm việc
- ✅ `GET /api/work-shifts/{id}` - Chi tiết ca làm việc
- ✅ `POST /api/work-shifts` - Tạo ca làm việc
- ✅ `PUT /api/work-shifts/{id}` - Cập nhật ca làm việc
- ✅ `PATCH /api/work-shifts/{id}/is-active` - Bật/tắt ca làm việc
- ✅ `DELETE /api/work-shifts/{id}` - Xóa ca làm việc
- ✅ `GET /api/staff/{id}/absences` - Liệt kê ngày nghỉ
- ✅ `POST /api/staff/{id}/absences` - Tạo ngày nghỉ
- ✅ `PUT /api/staff/{id}/absences/{absenceId}` - Cập nhật ngày nghỉ
- ✅ `DELETE /api/staff/{id}/absences/{absenceId}` - Xóa ngày nghỉ
- ✅ `GET /api/staff/{id}/schedule-exceptions` - Ngoại lệ lịch trình
- ✅ `POST /api/staff/{id}/schedule-exceptions` - Tạo ngoại lệ
- ✅ `PUT /api/staff/{id}/schedule-exceptions/{id}` - Cập nhật ngoại lệ
- ✅ `DELETE /api/staff/{id}/schedule-exceptions/{id}` - Xóa ngoại lệ
- ✅ `GET /api/staff/{id}/recurring-schedules` - Lịch trình lặp lại
- ✅ `PUT /api/staff/{id}/recurring-schedules` - Cập nhật lịch trình lặp lại
- ✅ `GET /api/staff/{id}/schedules` - Chi tiết lịch trình nhân viên
- ✅ `GET /api/schedules` - Toàn bộ lịch trình
- ✅ `GET /api/staff/availability` - Kiểm tra khả dụng nhân viên
- ⏭️ `/internal/schedules` - Lấy sức chứa nhân viên (internal)

**Location:** `staff-service/StaffController`, `staff-service/WorkShiftController`, `staff-service/StaffAbsenceController`, `staff-service/StaffScheduleExceptionController`, `staff-service/StaffRecurringScheduleController`, `staff-service/StaffScheduleAggregationController`, `staff-service/InternalStaffCapacityController`
**Độ ưu tiên:** ⭐⭐ QUAN TRỌNG - Quản lý nhân sự, ca trực

**Trang frontend:**
- `/admin/staff` — danh sách + CRUD hồ sơ nhân viên (`AdminStaff.tsx`)
- `/admin/work-shifts` — CRUD ca làm việc (`AdminWorkShifts.tsx`)
- `/admin/staff/:staffId/schedule` — lịch định kỳ, ngày nghỉ, ngoại lệ, lịch tổng hợp
  của một nhân viên (`AdminStaffSchedule.tsx`)
- `/admin/schedule` — lưới lịch trình toàn xưởng + tra cứu nhân viên rảnh
  (`AdminScheduleBoard.tsx`)

**Client API:** `frontend/src/api/endpoints/staff.ts` (`staffApi`, `workShiftApi`,
`staffAbsenceApi`, `staffScheduleExceptionApi`, `staffScheduleApi`)

**Quy tắc nghiệp vụ của backend đã được xử lý ở UI:**
- `CANCEL_SHIFT` chỉ hợp lệ với ca **đã có** trong lịch định kỳ của ngày đó;
  `ADD_SHIFT` ngược lại (ca **không có** trong lịch định kỳ + ca phải đang hoạt
  động). Form ngoại lệ chỉ cho chọn ca hợp lệ theo loại ngoại lệ.
- `PUT /recurring-schedules` là **thay thế toàn bộ** → modal hiển thị cảnh báo và
  có nút "Xoá lịch định kỳ" (PUT với `weeklySchedules: []`).
- Ca đã dùng trong lịch thì backend **không cho xoá cứng** (lỗi `3103`) → phải
  tắt bằng `isActive=false`. Tương tự, xoá nhân viên là **soft delete**
  (`isActive=false` + `deletedAt`), mã nhân viên vẫn bị coi là trùng.
- `GET /absences` và `GET /schedule-exceptions` **bắt buộc** có `from`/`to`
  (`absences` dùng ISO instant, `schedule-exceptions` dùng `yyyy-MM-dd`).
- Thời gian trả về là `Instant` theo UTC → hiển thị quy đổi sang giờ địa phương.

**Kiểm thử:** `scripts/section4-smoke.mjs` (CRUD ca làm việc / hồ sơ nhân viên /
lịch định kỳ / ngày nghỉ / ngoại lệ / lịch tổng hợp / khả dụng — kèm các
case kỳ vọng backend từ chối).

---

### 5. **BILLING - HÓA ĐƠN & THANH TOÁN**
- ❌ `POST /api/invoices/from-work-order/{workOrderId}` - Tạo hóa đơn từ work order
- ❌ `PATCH /api/invoices/{id}/discount` - Cập nhật chiết khấu
- ❌ `POST /api/invoices/{id}/void` - Hủy hóa đơn
- ❌ `POST /api/payments` - Tạo thanh toán
- ❌ `POST /api/payments/{id}/refund` - Hoàn tiền

**Location:** `billing-service/InvoiceController`, `billing-service/PaymentController`
**Độ ưu tiên:** ⭐⭐ QUAN TRỌNG - Quản lý tài chính

---

### 6. **NOTIFICATIONS - THÔNG BÁO**
- ❌ `GET /api/notifications/me/unread-count` - Số thông báo chưa đọc
- ❌ `GET /api/notifications/stream` - SSE Stream thông báo
- ❌ `PATCH /api/notifications/{id}/read` - Đánh dấu đã đọc
- ❌ `PATCH /api/notifications/me/read-all` - Đánh dấu tất cả đã đọc
- ❌ `POST /api/notifications/send` - Gửi thông báo
- ❌ `GET /api/notification-templates` - Liệt kê template
- ❌ `PUT /api/notification-templates/{id}` - Cập nhật template

**Location:** `notification-service/NotificationController`, `notification-service/NotificationTemplateController`
**Độ ưu tiên:** ⭐ Nâng cao UX - Thông báo real-time

---

### 7. **CUSTOMER-VEHICLE SERVICE - LỰC SỬ BẢO DƯỠNG**
- ❌ `GET /api/customers/{id}/service-history` (Chỉ frontend dùng fallback sang internal)
- ❌ `GET /api/vehicles/{id}/service-history` (Chỉ frontend dùng fallback sang internal)
- ❌ `POST /api/vehicles/{id}/service-history` (Chỉ frontend dùng fallback sang internal)

**Note:** Frontend có fallback sang `/ai/customer-vehicles/*` nhưng không gọi trực tiếp API này từ Gateway

**Location:** `customer-vehicle-service/VehicleServiceHistoryController`, `customer-vehicle-service/CustomerServiceHistoryController`
**Độ ưu tiên:** ⭐ Fallback đã tồn tại

---

### 8. **INTERNAL ENDPOINTS** (Chỉ dùng Service-to-Service)
- `/internal/services/{serviceId}` - Lấy dịch vụ nội bộ
- `/internal/services/{serviceId}/bom` - Lấy BOM nội bộ
- `/internal/parts/{partId}` - Lấy phụ tùng nội bộ
- `/internal/parts/issue` - Lấy phụ tùng từ kho (nội bộ)
- `/internal/parts/release` - Trả phụ tùng (nội bộ)
- `/internal/customers/{id}` - Lấy khách hàng (nội bộ)
- `/internal/vehicles/{id}` - Lấy phương tiện (nội bộ)

**Location:** Các controller có `@RequestMapping("/internal")`
**Độ ưu tiên:** ℹ️ Dùng service-to-service, frontend không cần

---

## 📊 Phân Loại Theo Mức Độ Ưu Tiên

### 🔴 CỰC KỲ QUAN TRỌNG (Lõi Core Business)
1. ~~**Work Order Management**~~ - 20 endpoints — ✅ **Đã kết nối ở Phase 1**
   - Tạo, chỉnh sửa, hoàn thành phiếu sửa chữa
   - Quản lý estimate, phân công mechanic
2. ~~**Permissions & Roles**~~ - 13 endpoints — ✅ **Đã kết nối ở Phase 1**
   - Quản trị quyền hạn hệ thống

### ⭐⭐ QUAN TRỌNG (Secondary Features)
1. **Inventory Management** - 25+ endpoints
   - Quản lý kho, phụ tùng, dịch vụ, nhà cung cấp, đơn hàng
   
2. **Staff Management** - 24 endpoints — ✅ **Đã kết nối ở Phase 1**
   - Quản lý nhân viên, ca trực, lịch trình
   
3. **Billing** - 5 endpoints
   - Hóa đơn, thanh toán

### ⭐ NÂNG CAO (Enhancement)
1. **Notifications** - 7 endpoints
   - Real-time notifications, templates

---

## 💡 Khuyến Nghị Tiếp Theo

### Phase 1 (Urgent - 2-3 tuần)
- [x] Permissions & Roles Management APIs (13 endpoints) — **xong**
- [x] Work Order Management APIs (20 endpoints) — **xong**

### Phase 2 (Important - 3-4 tuần)
- [ ] Inventory Management (25+ endpoints)
- [ ] Staff Management (24 endpoints)
- [ ] Billing APIs (5 endpoints)

### Phase 3 (Enhancement - 2 tuần)
- [ ] Notifications (7 endpoints)
- [ ] Service History APIs (3 endpoints)

---

## 📝 Ghi Chú

- **Internal APIs:** Không cần kết nối từ frontend (Service-to-Service communication)
- **Fallback APIs:** Frontend đã có fallback sang `/ai/customer-vehicles/` cho một số API
- **Frontend Gaps:** Hiện tại frontend chỉ cover ~63% tổng API backend

---

**Last Updated:** 2026-11-25
**Analyzed By:** API Connectivity Analyzer
