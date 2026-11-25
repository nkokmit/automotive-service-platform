# API Connectivity Analysis - Backend vs Frontend

## Tổng Hợp

| Chỉ Số | Giá Trị |
|--------|--------|
| Tổng API Backend | 150+ endpoints |
| Tổng API Frontend kết nối | ~115 endpoints |
| API chưa kết nối | **35+ endpoints** |

---

## 🔴 API Backend Chưa Có Kết Nối Frontend

### 1. **PERMISSIONS & ROLES MANAGEMENT**
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

### 3. **INVENTORY - QUẢN LÝ KHO & NGUYÊN VẬT LIỆU**

#### 3.1 Phụ Tùng (Parts)
- ❌ `POST /api/parts/issue` - Lấy phụ tùng từ kho
- ❌ `POST /api/parts/check-availability` - Kiểm tra tồn kho
- ❌ `POST /api/parts/pricing` - Tính giá phụ tùng

#### 3.2 Dịch Vụ (Services) - BOM Management
- ❌ `POST /api/services/{id}/bom` - Tạo BOM (Bill of Materials)
- ❌ `PUT /api/services/{id}/bom/{bomId}` - Cập nhật BOM
- ❌ `DELETE /api/services/{id}/bom/{bomId}` - Xóa BOM

#### 3.3 Danh Mục (Categories)
- ❌ `POST /api/service-categories` - Tạo nhóm dịch vụ
- ❌ `PUT /api/service-categories/{id}` - Cập nhật nhóm dịch vụ
- ❌ `DELETE /api/service-categories/{id}` - Xóa nhóm dịch vụ
- ❌ `POST /api/part-categories` - Tạo nhóm phụ tùng
- ❌ `PUT /api/part-categories/{id}` - Cập nhật nhóm phụ tùng
- ❌ `DELETE /api/part-categories/{id}` - Xóa nhóm phụ tùng

#### 3.4 Nhà Cung Cấp (Suppliers)
- ❌ `GET /api/suppliers` - Liệt kê nhà cung cấp
- ❌ `GET /api/suppliers/{id}` - Chi tiết nhà cung cấp
- ❌ `POST /api/suppliers` - Tạo nhà cung cấp
- ❌ `PUT /api/suppliers/{id}` - Cập nhật nhà cung cấp
- ❌ `DELETE /api/suppliers/{id}` - Xóa nhà cung cấp

#### 3.5 Đơn Hàng (Purchase Orders)
- ❌ `GET /api/purchase-orders` - Liệt kê đơn hàng
- ❌ `GET /api/purchase-orders/{id}` - Chi tiết đơn hàng
- ❌ `POST /api/purchase-orders` - Tạo đơn hàng
- ❌ `PUT /api/purchase-orders/{id}` - Cập nhật đơn hàng
- ❌ `POST /api/purchase-orders/{id}/approve` - Phê duyệt đơn hàng
- ❌ `POST /api/purchase-orders/{id}/complete` - Hoàn thành đơn hàng
- ❌ `POST /api/purchase-orders/{id}/cancel` - Hủy đơn hàng

#### 3.6 Giao Dịch Kho (Inventory Transactions)
- ❌ `GET /api/inventory-transactions` - Lịch sử giao dịch kho

**Location:** `inventory-service/PartController`, `inventory-service/ServiceController`, `inventory-service/SupplierController`, `inventory-service/PurchaseOrderController`, `inventory-service/InventoryTransactionController`, `inventory-service/PartCategoryController`, `inventory-service/ServiceCategoryController`
**Độ ưu tiên:** ⭐⭐ QUAN TRỌNG - Quản lý kho, tồn kho

---

### 4. **STAFF - QUẢN LÝ NHÂN VIÊN & LỊCH TRÌNH**
- ❌ `POST /api/staff` - Tạo nhân viên
- ❌ `PUT /api/staff/{id}` - Cập nhật nhân viên
- ❌ `PATCH /api/staff/{id}/is-active` - Bật/tắt trạng thái nhân viên
- ❌ `DELETE /api/staff/{id}` - Xóa nhân viên
- ❌ `GET /api/work-shifts` - Liệt kê ca làm việc
- ❌ `GET /api/work-shifts/{id}` - Chi tiết ca làm việc
- ❌ `POST /api/work-shifts` - Tạo ca làm việc
- ❌ `PUT /api/work-shifts/{id}` - Cập nhật ca làm việc
- ❌ `PATCH /api/work-shifts/{id}/is-active` - Bật/tắt ca làm việc
- ❌ `DELETE /api/work-shifts/{id}` - Xóa ca làm việc
- ❌ `GET /api/staff/{id}/absences` - Liệt kê ngày nghỉ
- ❌ `POST /api/staff/{id}/absences` - Tạo ngày nghỉ
- ❌ `PUT /api/staff/{id}/absences/{absenceId}` - Cập nhật ngày nghỉ
- ❌ `DELETE /api/staff/{id}/absences/{absenceId}` - Xóa ngày nghỉ
- ❌ `GET /api/staff/{id}/schedule-exceptions` - Ngoại lệ lịch trình
- ❌ `POST /api/staff/{id}/schedule-exceptions` - Tạo ngoại lệ
- ❌ `PUT /api/staff/{id}/schedule-exceptions/{id}` - Cập nhật ngoại lệ
- ❌ `DELETE /api/staff/{id}/schedule-exceptions/{id}` - Xóa ngoại lệ
- ❌ `GET /api/staff/{id}/recurring-schedules` - Lịch trình lặp lại
- ❌ `PUT /api/staff/{id}/recurring-schedules` - Cập nhật lịch trình lặp lại
- ❌ `GET /api/staff/{id}/schedules` - Chi tiết lịch trình nhân viên
- ❌ `GET /api/schedules` - Toàn bộ lịch trình
- ❌ `GET /api/staff/availability` - Kiểm tra khả dụng nhân viên
- ❌ `/internal/schedules` - Lấy sức chứa nhân viên (internal)

**Location:** `staff-service/StaffController`, `staff-service/WorkShiftController`, `staff-service/StaffAbsenceController`, `staff-service/StaffScheduleExceptionController`, `staff-service/StaffRecurringScheduleController`, `staff-service/StaffScheduleAggregationController`, `staff-service/InternalStaffCapacityController`
**Độ ưu tiên:** ⭐⭐ QUAN TRỌNG - Quản lý nhân sự, ca trực

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
   
2. **Staff Management** - 24 endpoints
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
