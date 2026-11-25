# API Connectivity Analysis - Backend vs Frontend

## Tổng Hợp

| Chỉ Số | Giá Trị | Nguồn |
|--------|---------|-------|
| Tổng endpoint backend (unique method+path) | **167** | `scripts/gap-analysis.mjs` (quét annotation trong 37 controller) |
| ├─ Public (`/api/**`) | **159** | |
| └─ Internal (`/internal/**`) | **8** | *frontend không được gọi — đúng thiết kế, xem Section 8* |
| Endpoint public đã có frontend gọi | **159 / 159 (100%)** | ✅ |
| **Endpoint public chưa có frontend gọi** | **0** | ✅ *đã nối xong — xem Section 9* |
| Call site frontend đọc được | 162 | |

> **Trạng thái theo section:**
> - Section 1 (Permissions & Roles) — ✅ Đã xong
> - Section 2 (Work Order) — ✅ Đã xong
> - Section 3 (Inventory) — ✅ Đã xong *(xem mục 3 bên dưới)*
> - Section 4 (Staff) — ✅ Đã xong
> - Section 5 (Billing) — ✅ Đã xong
> - Section 6 (Notifications) — ✅ Đã xong
> - Section 7 (Customer-Vehicle / Lịch sử bảo dưỡng) — ✅ Đã xong
> - Section 8 (Internal endpoints) — ⏭️ **Không phụ trách** *(người khác đảm nhiệm)*
> - Section 9 (Gap thật) — ✅ **Đã đo + đã nối 7/7** *(xem mục 9)*

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

### 5. **BILLING - HÓA ĐƠN & THANH TOÁN** — ✅ Đã kết nối ở Phase 1
- ✅ `POST /api/invoices/from-work-order/{workOrderId}` - Tạo hóa đơn từ work order
- ✅ `PATCH /api/invoices/{id}/discount` - Cập nhật chiết khấu
- ✅ `POST /api/invoices/{id}/void` - Hủy hóa đơn
- ✅ `POST /api/payments` - Tạo thanh toán
- ✅ `POST /api/payments/{id}/refund` - Hoàn tiền

**Location:** `billing-service/InvoiceController`, `billing-service/PaymentController`
**Độ ưu tiên:** ⭐⭐ QUAN TRỌNG - Quản lý tài chính

**Endpoint client:** `frontend/src/api/endpoints/billing.ts` — `billingApi`
(list/search/detail/create-from-WO/discount/void) + `paymentApi` (record/refund).

**Authority:** `INVOICE_READ` (GET), `INVOICE_WRITE` (tạo/chiết khấu/huỷ),
`PAYMENT_WRITE` (ghi nhận), `PAYMENT_REFUND` (hoàn tiền).

**UI:** `/admin/invoices` → `AdminBilling.tsx` (+ `billingWidgets.tsx`,
`billingModals.tsx`, `billingShared.ts`).
- Bảng tra cứu + lọc theo trạng thái + tìm kiếm mã hóa đơn / WO / khách hàng.
- Modal chi tiết: dòng hàng, bốn số tiền (công / phụ tùng / chiết khấu / thuế),
  số dư còn phải thu, lịch sử thanh toán kèm nút Hoàn.
- Modal chiết khấu (validate tối đa = công + phụ tùng + thuế), modal ghi nhận
  thanh toán (CASH / BANK_TRANSFER / CARD, `idempotencyKey` UUID sinh tự động),
  modal huỷ hóa đơn, modal hoàn tiền.
- Nút **Tạo hóa đơn** trong `AdminWorkOrderDetail.tsx` khi phiếu ở
  `PENDING_PAYMENT` (authority `INVOICE_WRITE`).

**Quy tắc nghiệp vụ backend (đã mirror sang UI):**
- Tạo hóa đơn: Work Order phải `PENDING_PAYMENT` và có ít nhất một dịch vụ
  `COMPLETED` hoặc phụ tùng đã cấp (`issuedQuantity > 0`). Idempotent — gọi lại
  trả về hóa đơn cũ.
- Chiết khấu: chỉ khi `status == UNPAID` **và** `paidAmount == 0`; tối đa bằng
  `subtotalLabor + subtotalParts + taxAmount`; `grandTotal` được tính lại.
- Huỷ: chỉ khi `paidAmount == 0`; huỷ hóa đơn đã có thanh toán sẽ bị từ chối
  (phải hoàn tiền trước).
- Thanh toán: hóa đơn phải `UNPAID`/`PARTIALLY_PAID`; `amount > 0` và không vượt
  số dư còn lại; idempotent theo `idempotencyKey`; trả đủ → `PAID`, trả một
  phần → `PARTIALLY_PAID`.
- Hoàn tiền: chỉ giao dịch `SUCCEEDED`; hóa đơn trừ `paidAmount` và trở về
  `UNPAID`/`PARTIALLY_PAID`.

**Kiểm thử:** `scripts/section5-smoke.mjs` (tra cứu / lọc / chi tiết / tạo từ
WO / idempotency / chiết khấu / thanh toán / hoàn tiền / các case kỳ vọng
backend từ chối). Script dùng token đăng nhập thật trong `.tok` (`sub` =
username `"admin"` — đúng trường hợp từng gây lỗi); chạy `node
scripts/section5-smoke.mjs --mint` để dùng token tự ký nếu không có `.tok`.
**Kết quả: 29/29 pass.**

> ✅ **2 bug backend đã được sửa trong `billing-service`:**
>
> 1. **Đọc sai claim JWT.** `InvoiceController.userId()` và
>    `PaymentController.record()` dùng `UUID.fromString(jwt.getSubject())` — nhưng
>    `sub` là **username** (`"admin"`), còn UUID nằm ở claim `userId`.
>    → `IllegalArgumentException: Invalid UUID string: admin` → HTTP 500.
>    Chạm: `GET /api/invoices/me`, `POST /api/invoices/from-work-order/{id}`,
>    `POST /api/payments`.
>    **Đã sửa:** tạo `security/JwtUserIdResolver` đọc `jwt.getClaimAsString("userId")`,
>    fallback về `jwt.getSubject()`; controller dùng hàm này. Khi token không có
>    định danh UUID hợp lệ → `ApiException(UNAUTHENTICATED)` (HTTP 401) thay vì 500.
>    Regression test: `JwtUserIdResolverTest` (6 case).
> 2. **Ghi `outbox_events` gây `StaleObjectStateException`.** `OutboxEvent.id` có
>    `@GeneratedValue(strategy = UUID)` trong khi `OutboxEventService.add()` tự gán
>    `UUID.randomUUID()` → Spring Data đi qua `merge()` → Hibernate 7 ném
>    `StaleObjectStateException` vì dòng chưa tồn tại → HTTP 500.
>    Chạm: `POST /api/invoices/{id}/void`, `POST /api/payments` (khi trả đủ),
>    `POST /api/payments/{id}/refund`.
>    **Đã sửa:** bỏ `@GeneratedValue` khỏi `OutboxEvent.id` (khớp với
>    `work-order-service`) — ID được gán bởi ứng dụng nên `save()` dùng `persist()`.
>    Regression test: `OutboxEventPersistenceTest` (`@DataJpaTest`) — đã xác minh
>    test bắt đúng lỗi khi cố tình thêm lại `@GeneratedValue`.
>
> Kết quả sau khi sửa: `scripts/section5-smoke.mjs` **29/29 pass** với token thật
> (`sub="admin"`); log `billing-service` không còn `Invalid UUID string` /
> `StaleObjectStateException`; các event outbox (`PaymentCompletedEvent`,
> `PaymentRefundedEvent`, `InvoiceVoidedEvent`) ghi và publish Kafka thành công
> (`status=SENT`, `retry_count=0`). Backend test: `billing-service` **21/21 pass**.



---

### 6. **NOTIFICATIONS - THÔNG BÁO** — ✅ **Đã kết nối ở Phase 3**
- ✅ `GET /api/notifications/me/unread-count` - Số thông báo chưa đọc
- ✅ `GET /api/notifications/stream` - SSE Stream thông báo
- ✅ `PATCH /api/notifications/{id}/read` - Đánh dấu đã đọc
- ✅ `PATCH /api/notifications/me/read-all` - Đánh dấu tất cả đã đọc
- ✅ `POST /api/notifications/send` - Gửi thông báo
- ✅ `GET /api/notification-templates` - Liệt kê template
- ✅ `PUT /api/notification-templates/{id}` - Cập nhật template
- ✅ `GET /api/notifications/me` - Danh sách thông báo (bonus, có phân trang + lọc)

**Location:** `notification-service/NotificationController`, `notification-service/NotificationTemplateController`
**Độ ưu tiên:** ⭐ Nâng cao UX - Thông báo real-time

**Frontend đã làm:**
- `frontend/src/api/endpoints/notification.ts` — API client (7 endpoint + `/me`)
- `frontend/src/api/endpoints/notificationStream.ts` — SSE client (fetch + ReadableStream)
- `frontend/src/data/notifications.ts` — hook `useNotifications` (badge + SSE + polling fallback)
- `frontend/src/components/NotificationBell.tsx` — chuông thông báo dùng chung (Header + AdminLayout)
- `frontend/src/modules/admin/AdminNotificationTemplates.tsx` — trang `/admin/notification-templates`

**Backend đã sửa (1 bug):**
- `NotificationController` khai báo tham số `Jwt jwt` **thiếu `@AuthenticationPrincipal`** →
  Spring Framework 7 cố construct bean `Jwt` từ request binding → `IllegalArgumentException:
  tokenValue cannot be empty` → **HTTP 500 cho cả 5 endpoint** (`/me`, `/me/unread-count`,
  `/me/read-all`, `/{id}/read`, `/stream`). Đã sửa giống cách sửa Bug 1 của billing-service.

---

### 7. **CUSTOMER-VEHICLE SERVICE - LỊCH SỬ BẢO DƯỠNG** — ✅ **Đã kết nối ở Phase 3**
- ✅ `GET /api/service-history/me` - Lịch sử bảo dưỡng của chính mình (khách hàng)
- ✅ `GET /api/service-history` - Toàn bộ lịch sử bảo dưỡng của gara (nhân viên) **[MỚI]**
- ✅ `GET /api/customers/{id}/service-history` - Lịch sử theo khách hàng (nhân viên)
- ✅ `GET /api/vehicles/{id}/service-history` - Lịch sử theo xe (nhân viên)
- ✅ `POST /api/vehicles/{id}/service-history` - Ghi nhận lần bảo dưỡng mới
- ✅ `GET /api/customers` - Danh sách khách hàng
- ✅ `GET /api/vehicles` - Danh sách phương tiện

**Note:** Frontend có fallback sang `/ai/customer-vehicles/*` nhưng không gọi trực tiếp API này từ Gateway

**Location:** `customer-vehicle-service/VehicleServiceHistoryController`, `customer-vehicle-service/CustomerServiceHistoryController`, `customer-vehicle-service/CustomerServiceHistoryByIdController`, `customer-vehicle-service/ServiceHistoryAdminController`
**Độ ưu tiên:** ⭐ Đã kết nối trực tiếp qua Gateway

**Frontend đã làm:**
- `frontend/src/api/endpoints/customerVehicle.ts` — 5 endpoint lịch sử + CRUD danh mục
- `frontend/src/modules/admin/AdminCustomerVehicles.tsx` — 3 tab: Phương tiện / Khách hàng / Nhật ký bảo dưỡng
- `frontend/src/modules/auth/Profile.tsx` — tab "Bảo dưỡng" cho khách hàng

**Backend đã thêm/sửa:**

1. **Endpoint mới `GET /api/service-history`** (`ServiceHistoryAdminController`).
   Trước đây màn hình "Nhật ký bảo dưỡng" của quản trị gọi
   `GET /api/service-history/me` — tức lịch sử của *chính người đang đăng nhập* —
   nên nhân viên đăng nhập bằng tài khoản không gắn với hồ sơ khách hàng thấy
   trang rỗng, còn lịch sử của những lần khách mang xe tới lại không hiện ở đâu.
   Endpoint mới lấp đúng khoảng trống đó, chặn bằng
   `@PreAuthorize("hasAuthority('SERVICE_HISTORY_READ') and not hasAuthority('ROLE_CUSTOMER')")`.

2. **Route Gateway.** `Path=/api/service-history` **không** khớp
   `Path=/api/service-history/**` với đúng path gốc — phải khai báo cả hai:
   `Path=/api/service-history,/api/service-history/**`.

3. **Enrichment trường hiển thị.** `ServiceHistoryResponse` giờ có thêm
   `licensePlate`, `vehicleMake`, `vehicleModel`, `customerName`. Vì
   `VehicleServiceHistory.vehicle` là `@ManyToOne(LAZY)` nên phải gom id trong
   trang rồi tra batch (`findAllByIdIn`) cho xe và khách hàng — nếu không sẽ N+1
   query mỗi dòng lịch sử.

> 🔒 **Lỗi bảo mật nghiêm trọng đã sửa: fail-open sang bridge không xác thực.**
>
> `frontend/src/api/endpoints/customerVehicle.ts` trước đây bọc mọi lời gọi
> trong `try ... catch` trần. Khi Spring backend từ chối request (HTTP 401/403 —
> tức người dùng *bị chặn quyền*), `catch` nuốt lỗi và rơi về FastAPI
> `ai-services/agent-service` (`/ai/customer-vehicles/*`) — service này **không
> có authentication và không lọc theo vai trò**. Kết quả: khách hàng đọc được
> lịch sử bảo dưỡng của *mọi* khách khác, và ghi được bản ghi vào xe của người
> khác — tức leo thang đặc quyền qua chính lớp fallback.
>
> **Đã sửa:** thêm `withBridgeFallback` + `isRetryableViaBridge`. Chỉ rơi về
> bridge khi lỗi mạng (fetch bị reject) hoặc lỗi 5xx; mọi lỗi 4xx (401/403/404/400)
> được ném thẳng ra ngoài. Riêng `getCustomerServiceHistory` /
> `getVehicleServiceHistory` / `getAllServiceHistory` **không có fallback bridge**
> vì bridge không có endpoint tương đương và không kiểm tra vai trò.

**Kiểm thử:** `scripts/section7-smoke.mjs` — 7 nhóm: danh mục khách/xe, lịch sử
cả gara, lịch sử của chính mình, lịch sử theo khách, lịch sử theo xe, ghi bản
ghi mới + đọc lại, validation (`recordType` sai / `summary` rỗng → 400), phân
quyền (token `ROLE_CUSTOMER` bị 403 ở cả 5 endpoint nhân viên), và bảo mật
(không token → 401, token sai → 401).

**Kết quả: 29/29 pass.** Đã xác minh thêm trên trình duyệt: tab "Nhật ký bảo
dưỡng" (quản trị) hiện 10 bản ghi kèm biển số/tên khách/loại bản ghi; modal
lịch sử theo khách; tab "Bảo dưỡng" trong trang cá nhân khách hàng.

---

### 8. **INTERNAL ENDPOINTS** (Chỉ dùng Service-to-Service)
- `/internal/services/{serviceId}` - Lấy dịch vụ nội bộ
- `/internal/services/{serviceId}/bom` - Lấy BOM nội bộ
- `/internal/parts/{partId}` - Lấy phụ tùng nội bộ
- `/internal/parts/issue` - Lấy phụ tùng từ kho (nội bộ)
- `/internal/parts/release` - Trả phụ tùng (nội bộ)
- `/internal/customers/{id}` - Lấy khách hàng (nội bộ)
- `/internal/vehicles/{id}` - Lấy phương tiện (nội bộ)
- `/internal/schedules?from&to` - Sức chứa lịch trình *(staff-service — bổ sung)*

**Location:** Các controller có `@RequestMapping("/internal")`
**Độ ưu tiên:** ℹ️ Dùng service-to-service, frontend không cần

> ℹ️ **Không có frontend gọi `/internal`.** Đây là ranh giới perimeter: các
> endpoint này chỉ dành cho service gọi service, **không** được route qua
> `api-gateway`, và **không** được frontend gọi trực tiếp.

---

### 9. **GAP THẬT CỦA FRONTEND** — ✅ **Đã đo + đã nối xong 7/7**

> ⚠️ Con số "~5 endpoints chưa kết nối" ở phần *Tổng Hợp* trước đây là
> **ước lượng bằng tay** và đã **lỗi thời**. Mục này thay bằng kết quả đo
> bằng máy trên toàn bộ source.

#### 🔧 Cách đo

**`scripts/gap-analysis.mjs`** — quét 2 phía và đối chiếu:

1. **Backend (167 endpoint):** đọc annotation `@RequestMapping` / `@GetMapping` /
   `@PostMapping` / `@PutMapping` / `@PatchMapping` / `@DeleteMapping` trong
   **37 controller** thuộc 9 service. Ghép `@RequestMapping` cấp class với
   mapping cấp method → ra `METHOD + /path` đầy đủ.
2. **Frontend (155 call site):** quét `frontend/src/**` theo 4 kiểu gọi thực tế:
   - `client.request<T>(...)` / `client.requestPage<T>(...)` — method nằm trong
     object options
   - `client.get/post/put/patch/delete(...)`
   - `fetch(...)` — dùng cho SSE (`/api/notifications/stream`)
3. **Khớp:** so từng segment path. Segment **literal** của backend được ưu tiên
   hơn segment **placeholder** — nếu không, `/api/users/me` sẽ bị "nuốt" mất
   bởi `/api/users/{id}`.

> 🔧 **3 lỗi scanner đã phát hiện và sửa trong quá trình đo** (đều là lỗi
> *giảm gap*, tức báo cáo thiếu endpoint):
> 1. Generic type lồng nhau — `client.requestPage<PageResponse<PermissionResponse>>(`
>    không match regex `<[^>]*>` → sót 20+ endpoint.
> 2. Dấu `(` trong chuỗi — `` `/api/staff/availability?${qs.toString()}` `` làm
>    lệch số ngoặc khi cân bằng → sót 6 endpoint.
> 3. Interpolation lồng nhau — `` `/api/work-order-service-lines/me${status ? `?status=${status}` : ""}` ``
>    bị cắt sai → sót 1 endpoint.
>
> Tổng: sót **27 endpoint** nếu không sửa. Đây là lý do con số "~5" cũ
> không đáng tin — cần đo bằng script, không ước lượng tay.

#### 📊 Kết quả

| Chỉ số | Giá trị |
|---|---|
| Endpoint backend (unique) | **167** |
| ├─ Public `/api/**` | 159 |
| └─ Internal `/internal/**` | 8 *(frontend không gọi — đúng thiết kế)* |
| Public **đã** có frontend gọi | **152** (95.6%) |
| Public **chưa** có frontend gọi | **7** |

#### ✅ Kết quả — ĐÃ NỐI XONG 7/7

Tất cả 7 endpoint đã được **nối vào frontend** và **kiểm chứng runtime** bằng
`scripts/gap-verify.mjs` (**36/36 pass**, chạy lặp lại nhiều lần đều 36/36).

| # | Method + Path | Service | Authority | File frontend đã sửa |
|---|---|---|---|---|
| 1 | `GET /api/users/{id}` | user-service | `USER_READ` | `api/endpoints/user.ts` → `adminUserApi.getUser()` |
| 2 | `POST /api/users` | user-service | `USER_CREATE` | `api/endpoints/user.ts` → `adminUserApi.createUser()` |
| 3 | `GET /api/customers/{id}` | customer-vehicle-service | `CUSTOMER_READ` | `api/endpoints/customerVehicle.ts` → `getCustomer()` |
| 4 | `GET /api/part-categories/{categoryId}` | inventory-service | `PART_READ` | `api/endpoints/inventory.ts` → `getPartCategory()` |
| 5 | `GET /api/service-categories/{categoryId}` | inventory-service | `SERVICE_READ` | `api/endpoints/inventory.ts` → `getServiceCategory()` |
| 6 | `POST /api/staff/bookings` | booking-service | `BOOKING_CREATE` | `api/endpoints/booking.ts` → `staffBookingApi.createBooking()` |
| 7 | `PATCH /api/staff/bookings/{bookingId}/reschedule` | booking-service | `BOOKING_RESCHEDULE` | `api/endpoints/booking.ts` → `staffBookingApi.rescheduleBooking()` |

**Type mới:** `UserCreateRequest`, `StaffBookingCreateRequest` (thêm vào
`api/types.ts`).

**Trạng thái hiện tại:**

| Chỉ số | Giá trị |
|---|---|
| Public endpoint đã có frontend gọi | **159 / 159 (100%)** |
| Public endpoint chưa có frontend gọi | **0** |

#### 🐛 Một bug backend phát hiện khi kiểm chứng

`GET /api/users/khong-phai-uuid` (UUID sai trong path) trả **HTTP 500** thay vì
**400**. Nguyên nhân: `MethodArgumentTypeMismatchException` không có
`@ExceptionHandler` riêng nên rơi vào handler `Exception.class` trong
`GlobalExceptionHandler` → trả `ErrorCode.UNCATEGORIZED_EXCEPTION`.

Đây là lỗi phía **client** (gửi dữ liệu sai) nhưng lại báo lỗi máy chủ —
client có thể hiểu nhầm là sập hệ thống. **Đã sửa** tại
`user-service/exception/GlobalExceptionHandler.java` (thêm handler trả 400 +
`ErrorCode.INVALID_REQUEST`). Đã rebuild & verify lại: **400** ✅

> ⚠️ Cùng lỗi này nhiều khả năng tồn tại ở các service khác — các service
> dùng chung pattern `GlobalExceptionHandler` với handler `Exception.class`
> cuối cùng. Nên rà lại khi có task backend.

#### 🔎 Nhận xét quan trọng

**Cả 7 gap đều là endpoint "chi tiết" hoặc "ghi" — không có endpoint "đọc danh
sách" nào bị thiếu.** Frontend đã phủ 159/159 endpoint, và phần thiếu đều là
biến thể của CRUD mà đã có 3/4 thao tác còn lại.

**Điểm cần chú ý về #6 và #7:** frontend có **hai bộ API booking song song**:
- `/api/bookings/*` — dành cho **khách hàng** (`CUSTOMER_BOOKING_*`)
- `/api/staff/bookings/*` — dành cho **nhân viên** (`BOOKING_*`)

Frontend đã phủ gần hết bộ `/api/staff/bookings/*` (list, get-by-id, status,
check-in, cancel) nhưng **thiếu `create` và `reschedule`** — tức staff chưa
tạo được lịch hẹn giúp khách và chưa đổi lịch hẹn được. Hai endpoint này
gắn với nghiệp vụ *"nhân viên tiếp nhận khách đến xưởng"*, nên khả năng cao
là **cần nối** nếu có màn hình tiếp nhận tại xưởng. → **Đã nối xong** ✅

---

## 📊 Phân Loại Theo Mức Độ Ưu Tiên

### 🔴 CỰC KỲ QUAN TRỌNG (Lõi Core Business)
1. ~~**Work Order Management**~~ - 20 endpoints — ✅ **Đã kết nối ở Phase 1**
   - Tạo, chỉnh sửa, hoàn thành phiếu sửa chữa
   - Quản lý estimate, phân công mechanic
2. ~~**Permissions & Roles**~~ - 13 endpoints — ✅ **Đã kết nối ở Phase 1**
   - Quản trị quyền hạn hệ thống

### ⭐⭐ QUAN TRỌNG (Secondary Features)
1. **Inventory Management** - 25+ endpoints — ✅ **Đã xong** *(Section 3)*
   - Quản lý kho, phụ tùng, dịch vụ, nhà cung cấp, đơn hàng

2. **Staff Management** - 24 endpoints — ✅ **Đã xong** *(Section 4)*
   - Quản lý nhân viên, ca trực, lịch trình

3. **Billing** - 5 endpoints — ✅ **Đã xong** *(Section 5)*
   - Hóa đơn, thanh toán

### ⭐ NÂNG CAO (Enhancement)
1. **Notifications** - 7 endpoints — ✅ **Đã xong** *(Section 6)*
   - Real-time notifications (SSE), templates, badge chưa đọc

### 🔧 GAP THẬT (đã xử lý xong)
1. **7 endpoint public chưa có frontend gọi** — ✅ **Đã nối xong** *(xem Section 9)*
   - `GET /api/users/{id}`, `POST /api/users`, `GET /api/customers/{id}`,
     `GET /api/part-categories/{id}`, `GET /api/service-categories/{id}`,
     `POST /api/staff/bookings`, `PATCH /api/staff/bookings/{id}/reschedule`

---

## 💡 Khuyến Nghị Tiếp Theo

### Phase 1 (Urgent - 2-3 tuần)
- [x] Permissions & Roles Management APIs (13 endpoints) — **xong**
- [x] Work Order Management APIs (20 endpoints) — **xong**

### Phase 2 (Important - 3-4 tuần)
- [x] Inventory Management (25+ endpoints) — **xong** *(Section 3)*
- [x] Staff Management (24 endpoints) — **xong** *(Section 4)*
- [x] Billing APIs (5 endpoints) — **xong** *(Section 5; 2 bug backend đã sửa)*

### Phase 3 (Enhancement - 2 tuần)
- [x] Notifications (7 endpoints) — **xong** *(Section 6; 1 bug backend đã sửa)*
- [x] Service History APIs (7 endpoints) — **xong** *(Section 7; 1 endpoint mới + 1 lỗi bảo mật fail-open đã sửa)*

### Phase 4 (Đo & đóng gap thật — xong)
- [x] Đo lại gap frontend bằng script — **xong** *(Section 9)*
- [x] Nối 7 endpoint còn thiếu — **xong** *(verify 36/36 bằng `scripts/gap-verify.mjs`)*
- [x] Sửa bug backend `MethodArgumentTypeMismatchException` → 500 — **xong** *(user-service)*

---

## 🔍 Section 10 — Kiểm chứng thực tế màn "Hồ sơ" (`/profile`) — "Xe của tôi"

> Ngày 2026-11-26. Điều tra sâu vì người dùng nghi ngờ tab "Xe của tôi"
> **không có dữ liệu thật** (chỉ là mock để dựng UI).

### 10.1 Kết luận ngắn

| Tiêu chí | Thực tế |
|---|---|
| Tab "Xe của tôi" **có tồn tại** | ✅ Có (`Profile.tsx:72`, component `VehiclesTab` tại `:1634`) |
| Dữ liệu xe lấy từ **API thật** | ❌ **KHÔNG** — từ `localStorage` + mock |
| Khách hàng **được phép** đọc/ghi xe | ❌ **KHÔNG** — 1403/403 (thiếu `VEHICLE_READ`/`VEHICLE_CREATE`) |
| Backend **có** endpoint "xe của tôi" | ❌ **KHÔNG** — không tồn tại, không thể tồn tại |
| `vehicles` table có `customer_id`? | ❌ **KHÔNG** — cột bị `DROP` ở migration V3 |

### 10.2 Bằng chứng

**(a) Nguồn dữ liệu là localStorage/mock** — `frontend/src/data/authStore.ts:294-326`:

```typescript
// ── Xe của tôi ────────────────────────────────────────────────────────────────
// Backend KHÔNG có endpoint "xe của tôi" (xem comment trong VehicleController.java)
// nên danh sách xe của khách được giữ ở localStorage. ...
export function getUserVehicles(userId: string): Vehicle[] {
  const stored = readVehicleStore(userId);
  if (stored) return stored;
  return mockUsers.find((x) => x.id === userId)?.vehicles ?? [];
}
```

Fallback `mockUsers` chỉ có **một** user với `id: "u1"` (`frontend/src/data/mock.ts:473`).
User thật từ backend có id là **UUID** → `mockUsers.find(...)` luôn trả `undefined`
→ **tab luôn rỗng với tài khoản thật**, trừ khi localStorage đã có dữ liệu.

**(b) Kiểm chứng runtime** (đăng ký user mới → login → gọi API bằng token thật):

```
[1] register -> 0 Đăng ký thành công
[2] login    -> 0 | token? true
[3] GET /api/customers/me              -> 0 Success
[4] GET /api/service-history/me        -> 0 | items: 0
[5] GET /api/vehicles  (token khách)   -> 1403 Bạn không có quyền
[6] GET /api/vehicles/{id}/service-history (token khách) -> 403
[7] POST /api/vehicles (token khách)   -> 1403 Bạn không có quyền
[8] PUT  /api/customers/me (token khách)-> 1000 Tham số 'id' phải là UUID
```

**(c) Backend không thể có "xe của tôi"** —
`V3__decouple_customer_from_vehicle.sql` đã **xoá cột quan hệ sở hữu**:

```sql
ALTER TABLE `vehicles`
    DROP FOREIGN KEY `fk_vehicles_customer`,
    DROP INDEX `idx_vehicles_customer_id`,
    DROP COLUMN `customer_id`;
```

Quyết định nghiệp vụ ghi rõ trong file đó: *"Customer là hồ sơ người liên hệ
/ người mang xe đến gara, KHÔNG phải chủ sở hữu pháp lý"*. Liên kết
Customer–Vehicle được ghi **theo từng lần tiếp nhận** qua bảng
`vehicle_service_histories.customer_id` — một chiều, theo lịch sử, không phải
sở hữu.

Xác nhận trực tiếp trên DB (`DESCRIBE customer_vehicle_service.vehicles`) —
**không có `customer_id`**:

```
id | license_plate | vin | make | model | model_year | trim | color
fuel_type | transmission | odometer_km | notes | is_active | created_at
updated_at | deleted_at
```

**(d) Quyền của role CUSTOMER** — `V5__seed_customer_vehicle_permissions.sql`:
`VEHICLE_READ/CREATE/UPDATE/DELETE` chỉ cấp cho `ADMIN`, `MANAGER`, `MECHANIC`.
`CUSTOMER` **không có** các quyền này. `V7` còn **thu hồi**
`SERVICE_HISTORY_READ` của CUSTOMER và thay bằng `SERVICE_HISTORY_READ_SELF`
(chỉ đọc lịch sử của chính mình, qua `GET /api/service-history/me`).

**(e) `PUT /api/customers/me` không tồn tại** — `CustomerController` chỉ có
`GET /me` (đọc). Ghi hồ sơ khách hàng là `PUT /api/customers/{id}` cần
`CUSTOMER_UPDATE` — chỉ ADMIN có → khách sẽ luôn nhận 403.

### 10.3 Hệ quả với UI hiện tại

| Vị trí | Vấn đề |
|---|---|
| `Profile.tsx:109` (`useMemo`) | Nguồn xe = localStorage/mock → **tab rỗng với user thật** |
| `Profile.tsx:1716-1762` (`VehiclesTab`) | Thêm/sửa xe gọi API → **luôn 1403**, rơi về `persistLocal()` → dữ liệu chỉ nằm trên máy khách, **mất khi đổi thiết bị** |
| `Profile.tsx:341-380` (`InfoTab.handleSave`) | `PUT /api/users/{id}` cần `USER_UPDATE` → 403 → chỉ lưu local |
| `Profile.tsx:616-653` (`CustomerCard.handleSave`) | `PUT /api/customers/{id}` cần `CUSTOMER_UPDATE` → 403 → chỉ lưu local |
| Toàn bộ form "Thông tin" | **Không có đường ghi nào lên server thật** cho khách hàng |

Tóm lại: màn `/profile` hiện tại hiển thị đúng nhưng **không ghi được gì xuống
hệ thống** với tài khoản CUSTOMER — mọi thao tác sửa đều rơi về localStorage.

### 10.4 Đề xuất (Option B — refactor `/profile`)

Vì backend **cố ý** bỏ khái niệm "xe của tôi", frontend **không nên** giữ
tab mang tên "Xe của tôi" với dữ liệu giả. Hướng phù hợp với mô hình nghiệp
vụ hiện tại:

#### Phần A — Frontend (làm được ngay, không cần backend)

1. **Đổi tab "Xe của tôi"** → thành danh sách **xe đã từng mang đến xưởng**
   (dữ liệu thật từ `GET /api/service-history/me`, đã có sẵn và hoạt động).
   Bỏ luôn luồng thêm/sửa xe từ phía khách (vì `POST /api/vehicles` bị chặn
   có chủ đích) — hoặc giữ nút nhưng ghi rõ "xe được xưởng ghi nhận khi bạn
   mang đến, vui lòng liên hệ xưởng để thêm".
2. **Gộp "Thông tin tài khoản" + "Hồ sơ khách hàng"** thành **một form duy
   nhất**. Hiện tại có 2 form chồng lặp cùng trường (tên/email/SĐT) và cả 2
   đều không ghi được lên server.
3. **Bỏ hiệu ứng "giả"**: xoá `getUserVehicles`/`saveUserVehicles`
   (localStorage) và fallback `mockUsers` khi đã có nguồn thật.
4. **Sửa thông điệp**: khi ghi thất bại vì thiếu quyền, UI phải nói rõ
   *"đã lưu tạm trên thiết bị này — liên hệ xưởng để đồng bộ"*, không
   giả vờ đã lưu vào hệ thống.

#### Phần B — Backend (cần team backend thực hiện)

Để khách hàng **tự sửa được** hồ sơ của chính mình. Đây là **task backend**,
cần được duyệt trước khi triển khai:

| Hạng mục | Nội dung |
|---|---|
| Permission mới | `CUSTOMER_UPDATE_SELF` — quyền hẹp, chỉ dùng cho endpoint tự phục vụ |
| Migration (user-service) | Seed permission + cấp cho role `CUSTOMER`. **Không** cấp `CUSTOMER_UPDATE` (quyền toàn hệ thống) cho CUSTOMER — nếu cấp thì mở đường sửa hồ sơ người khác (IDOR) |
| Endpoint mới (customer-vehicle-service) | `PUT /api/customers/me` — **không nhận id trong path**, server tự ánh xạ caller → hồ sơ qua claim `userId` trong JWT. Đối xứng với `GET /api/customers/me` đã có |
| DTO mới | `CustomerSelfUpdateRequest` — chỉ nhận `fullName`, `phone`, `email`, `address`, `notes`. **Không** có `userId` / `isActive` (nếu có, khách tự dánh được hồ sơ người khác hoặc tự mở lại quyền sau khi bị vô hiệu hoá) |
| `@PreAuthorize` | `hasAuthority('CUSTOMER_UPDATE_SELF')` |
| Kiểm thử | Khách sửa được hồ sơ của mình → 200; khách đọc/sửa hồ sơ người khác → 403; gửi `userId`/`isActive` trong body → bị bỏ qua (DTO không có field) |

**Tiêu chí nghiệm thu:** sau khi Phần B có, `PUT /api/customers/me` trả 200 và
ghi xuống `customers`; `GET /api/customers/me` trả về giá trị vừa sửa.

> **Ghi chú phạm vi:** nếu Phần B chưa được duyệt, frontend vẫn ship được
> Phần A. Khi Phần B xong, frontend chỉ cần đổi 1 hàm gọi
> (`updateCustomer(id, ...)` → `updateCurrentCustomer(...)`).

---

## 📝 Ghi Chú

- **Internal APIs:** Không cần kết nối từ frontend (Service-to-Service communication).
  8 endpoint `/internal/**` — frontend **không được** gọi, gateway cũng **không
  route** tới (trả 404). ⏭️ Section 8 thuộc phạm vi người khác.
- **Fallback APIs:** Frontend có fallback sang `/ai/customer-vehicles/` cho một số API — **chỉ dùng khi lỗi mạng/5xx**, không dùng khi backend trả 4xx (xem Section 7)
- **Frontend Gaps:** Đo thật bằng `scripts/gap-analysis.mjs` → **159/159 endpoint
  public đã có frontend gọi (100%)**, **0** endpoint thiếu (xem Section 9).
  *Con số "~63%" trong các bản cũ của tài liệu này là ước lượng bằng tay và
  không còn đúng.*
- **Script kiểm chứng:**
  - `scripts/gap-analysis.mjs` — đo gap (static, đọc source)
  - `scripts/gap-verify.mjs` — kiểm chứng runtime 7 endpoint mới (36/36)

---

**Last Updated:** 2026-11-26
**Analyzed By:** API Connectivity Analyzer

> **Ghi chú 2026-11-26:** Section 10 bổ sung kiểm chứng runtime màn `/profile`:
> tab "Xe của tôi" **tồn tại trong UI nhưng không có dữ liệu thật** (localStorage
> + mock), vì backend cố ý bỏ quan hệ sở hữu xe (`vehicles.customer_id` đã bị
> DROP ở V3) và role CUSTOMER không có `VEHICLE_*`/`CUSTOMER_UPDATE`.
