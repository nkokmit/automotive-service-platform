# API Connectivity Analysis - Backend vs Frontend

## Tổng Hợp

| Chỉ Số | Giá Trị |
|--------|--------|
| Tổng API Backend | 150+ endpoints |
| Tổng API Frontend kết nối | ~95 endpoints |
| API chưa kết nối | **55+ endpoints** |

---

## 🔴 API Backend Chưa Có Kết Nối Frontend

### 1. **PERMISSIONS & ROLES MANAGEMENT**
- ❌ `GET /api/permissions` - Liệt kê quyền
- ❌ `GET /api/permissions/{id}` - Chi tiết quyền
- ❌ `POST /api/permissions` - Tạo quyền
- ❌ `PUT /api/permissions/{id}` - Cập nhật quyền
- ❌ `DELETE /api/permissions/{id}` - Xóa quyền
- ❌ `GET /api/roles` - Liệt kê role (backend có, nhưng frontend chỉ dùng ở admin)
- ❌ `POST /api/roles` - Tạo role
- ❌ `PUT /api/roles/{id}` - Cập nhật role
- ❌ `DELETE /api/roles/{id}` - Xóa role
- ❌ `POST /api/roles/{id}/permissions` - Gán quyền cho role
- ❌ `DELETE /api/roles/{id}/permissions/{permissionId}` - Gỡ quyền
- ❌ `DELETE /api/users/{id}/roles/{roleId}` - Gỡ role khỏi user

**Location:** `user-service/PermissionController`, `user-service/RoleController`
**Độ ưu tiên:** ⭐ ADMIN/MANAGER - Quản trị quyền hạn hệ thống

---

### 2. **WORK ORDER - Chi Tiết & Quản Lý**
- ❌ `POST /api/work-orders` - Tạo work order mới
- ❌ `POST /api/work-orders/{id}/estimates` - Tạo estimate
- ❌ `GET /api/work-orders/{id}/estimates` - Lấy danh sách estimate
- ❌ `POST /api/work-orders/{id}/start-diagnosis` - Bắt đầu chẩn đoán
- ❌ `POST /api/work-orders/{id}/complete` - Hoàn thành work order
- ❌ `POST /api/work-orders/{id}/cancel` - Hủy work order
- ❌ `GET /api/estimates/{id}` - Chi tiết estimate
- ❌ `POST /api/estimates/{id}/services` - Thêm service vào estimate
- ❌ `DELETE /api/estimates/{id}/services/{serviceLineId}` - Gỡ service
- ❌ `POST /api/estimates/{id}/parts` - Thêm part vào estimate
- ❌ `DELETE /api/estimates/{id}/parts/{partLineId}` - Gỡ part
- ❌ `POST /api/estimates/{id}/submit` - Gửi estimate
- ❌ `PATCH /api/estimates/{id}/decision` - Quyết định estimate (Approve/Reject)
- ❌ `POST /api/work-order-service-lines/{id}/assign` - Phân công mechanic
- ❌ `GET /api/work-order-service-lines/me` - Service line của mechanic
- ❌ `POST /api/work-order-service-lines/{id}/start` - Bắt đầu service
- ❌ `POST /api/work-order-service-lines/{id}/complete` - Hoàn thành service
- ❌ `POST /api/work-orders/{id}/parts/{partLineId}/issue` - Lấy phụ tùng từ kho
- ❌ `POST /api/work-orders/{id}/parts/{partLineId}/release` - Trả phụ tùng lại kho

**Location:** `work-order-service/WorkOrderController`, `work-order-service/EstimateController`, `work-order-service/WorkOrderServiceLineController`, `work-order-service/WorkOrderPartController`
**Độ ưu tiên:** ⭐⭐⭐ CỰC KỲ QUAN TRỌNG - Core business logic

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
1. **Work Order Management** - 20 endpoints
   - Tạo, chỉnh sửa, hoàn thành phiếu sửa chữa
   - Quản lý estimate, phân công mechanic
   
2. **Permissions & Roles** - 12 endpoints
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
- [ ] Work Order Management APIs (20 endpoints)
- [ ] Permissions & Roles Management (12 endpoints)

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

**Last Updated:** 2024-11-25
**Analyzed By:** API Connectivity Analyzer
