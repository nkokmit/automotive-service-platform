/**
 * Types phản ánh ĐÚNG code backend hiện tại.
 *
 * Nguồn: backend/services/user-service + customer-vehicle-service (ApiResponse record).
 * Khi backend đổi DTO, cập nhật file này — không sửa theo contracts/ nếu hai bên
 * đang lệch nhau (xem contracts/README.md: code là nguồn sự thật).
 */

// ── Envelope chung của mọi API ────────────────────────────────────────────────
/** Backend trả HTTP 200/201/204 nhưng code != 0 nghĩa là lỗi nghiệp vụ. */
export interface ApiEnvelope<T> {
  /** 0 = thành công. Khác 0 xem ErrorCode. */
  code: number;
  message: string;
  result: T | null;
}

export interface PageResponse<T> {
  items: T[];
  /** Lưu ý: Spring Data đếm từ 0. */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

// ── Error code (khớp ErrorCode.java) ──────────────────────────────────────────
export const ErrorCode = {
  UNCATEGORIZED_EXCEPTION: 9999,
  INVALID_REQUEST: 1000,
  USER_NOT_FOUND: 1001,
  USER_ALREADY_EXISTS: 1002,
  USER_USERNAME_EXISTS: 1003,
  USER_EMAIL_EXISTS: 1004,
  USER_PHONE_EXISTS: 1005,
  ROLE_NOT_FOUND: 1101,
  ROLE_ALREADY_EXISTS: 1102,
  PERMISSION_NOT_FOUND: 1201,
  PERMISSION_ALREADY_EXISTS: 1202,
  UNAUTHENTICATED: 1401,
  UNAUTHORIZED: 1403,
  CUSTOMER_NOT_FOUND: 2001,
  VEHICLE_NOT_FOUND: 2101,
} as const;

// ── User / Auth ───────────────────────────────────────────────────────────────
/** Khớp PermissionResponse.java */
export interface PermissionResponse {
  id: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
}

/**
 * Role rút gọn — khi embed trong UserResponse thì permissions luôn null.
 *
 * `permissions` là mảng JSON (backend trả `Set<PermissionResponse>` → serialize
 * thành array), nên khai báo dạng array cho khớp thực tế.
 */
export interface RoleResponse {
  id: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
  permissions: PermissionResponse[] | null;
}

/**
 * Khớp PermissionCreateRequest.java.
 *
 * Lưu ý: `name` KHÔNG có tiền tố `PERMISSION_` — backend lưu nguyên văn
 * và dùng đúng chuỗi này làm authority (`hasAuthority('PERMISSION_READ')`).
 */
export interface PermissionCreateRequest {
  name: string;
  displayName?: string | null;
  description?: string | null;
}

/** Khớp PermissionUpdateRequest.java — mọi field đều optional (null = không đổi). */
export type PermissionUpdateRequest = PermissionCreateRequest;

/**
 * Khớp RoleCreateRequest.java.
 *
 * Lưu ý: `name` KHÔNG bao gồm prefix `ROLE_` — backend tự thêm khi dựng
 * authority (`ROLE_<NAME>`). Phần raw name phải là UPPER_SNAKE_CASE.
 */
export interface RoleCreateRequest {
  name: string;
  displayName?: string | null;
  description?: string | null;
}

/** Khớp RoleUpdateRequest.java — mọi field đều optional (null = không đổi). */
export type RoleUpdateRequest = RoleCreateRequest;

/** Khớp UserResponse.java — không có avatar/tier/memberSince. */
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  isActive: boolean | null;
  createdAt: string;
  /** Backend trả `Set<RoleResponse>` → JSON là array. */
  roles: RoleResponse[];
}

/** Khớp UserUpdateRequest.java — mọi field đều optional (null = không đổi). */
export interface UserUpdateRequest {
  username?: string;
  password?: string;
  email?: string;
  phone?: string;
  fullName?: string;
  isActive?: boolean;
  roleIds?: string[];
}

/**
 * Khớp UserCreateRequest.java — `username`, `password`, `email` là bắt buộc
 * (@NotBlank/@Size/@Email). `roleIds` là `Set<UUID>` → JSON là array.
 */
export interface UserCreateRequest {
  /** 3–50 ký tự. */
  username: string;
  /** 6–100 ký tự. */
  password: string;
  email: string;
  /** Tối đa 20 ký tự. */
  phone?: string;
  /** Tối đa 100 ký tự. */
  fullName?: string;
  isActive?: boolean;
  roleIds?: string[];
}

/** Khớp AuthenticationResponse.java — KHÔNG có field expiresIn. */
export interface AuthenticationResponse {
  accessToken: string;
  refreshToken: string;
}

/** Khớp RefreshTokenResponse.java. */
export interface RefreshTokenResponse {
  accessToken: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

/** Khớp RegisterRequest.java — role/isActive do server gán, client không gửi. */
export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
  phone?: string;
  fullName?: string;
}

export interface RefreshTokenRequest {
  rawToken: string;
}

// ── Customer / Vehicle / ServiceHistory (customer-vehicle-service) ─────────────
/** Khớp CustomerResponse.java — cố ý không có deletedAt. */
export interface CustomerResponse {
  id: string;
  userId: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerCreateRequest {
  fullName: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  userId?: string | null;
  isActive?: boolean;
}

export type CustomerUpdateRequest = CustomerCreateRequest;

/**
 * Khớp VehicleResponse.java.
 *
 * Lưu ý: dùng `make` (KHÔNG phải `brand`) và KHÔNG có `customerId` — V3 migration
 * đã tách xe khỏi khách hàng. Muốn biết ai từng mang xe thì tra service-history.
 */
export interface VehicleResponse {
  id: string;
  licensePlate: string;
  vin: string | null;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  trim: string | null;
  color: string | null;
  fuelType: string | null;
  transmission: string | null;
  odometerKm: number | null;
  notes: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleCreateRequest {
  licensePlate: string;
  vin?: string | null;
  make: string;
  model: string;
  modelYear?: number | null;
  trim?: string | null;
  color?: string | null;
  fuelType?: string | null;
  transmission?: string | null;
  odometerKm?: number | null;
  notes?: string | null;
  isActive?: boolean;
}

export type VehicleUpdateRequest = VehicleCreateRequest;

/** Khớp ServiceRecordType.java */
export type ServiceRecordType =
  | "GARAGE_SERVICE"
  | "EXTERNAL_SERVICE"
  | "CUSTOMER_REPORTED";

/** Khớp ServiceHistoryResponse.java */
export interface ServiceHistoryResponse {
  id: string;
  vehicleId: string;
  customerId: string | null;
  workOrderId: string | null;
  recordType: ServiceRecordType;
  serviceDate: string;
  odometerKm: number | null;
  summary: string;
  description: string | null;
  garageName: string | null;
  createdAt: string;
  /**
   * Biển số / hãng / dòng xe / tên khách hàng — thông tin hiển thị.
   *
   * Backend Spring trả về 4 trường này (xem `ServiceHistoryResponse.java`).
   * Còn bridge MySQL (`/ai/customer-vehicles/*`) cũng trả chúng.
   *
   * Có thể null: xe hoặc khách hàng đã bị xoá mềm nhưng bản ghi lịch sử vẫn
   * được giữ để audit.
   */
  licensePlate?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  customerName?: string | null;
}

/** Khớp ServiceHistoryCreateRequest.java */
export interface ServiceHistoryCreateRequest {
  customerId?: string | null;
  recordType: "EXTERNAL_SERVICE" | "CUSTOMER_REPORTED";
  serviceDate: string;
  odometerKm?: number | null;
  summary: string;
  description?: string | null;
  garageName?: string | null;
}

// ── Inventory service (inventory-service) ─────────────────────────────────────
/** Khớp CategoryResponse.java — dùng chung cho nhóm dịch vụ và nhóm phụ tùng. */
export interface CategoryResponse {
  id: string;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
}

/**
 * Khớp ServiceResponse.java.
 *
 * Lưu ý tên field: backend serialize snake_case (`duration_minutes`,
 * `required_techs`, `base_labor_price`) — xem @JsonProperty trong record.
 */
export interface ServiceResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  code: string;
  name: string;
  duration_minutes: number;
  required_techs: number;
  /** BigDecimal — serialize thành number. */
  baseLaborPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Khớp PartResponse.java. */
export interface PartResponse {
  id: string;
  categoryId: string;
  categoryName: string;
  sku: string;
  oemCode: string | null;
  name: string;
  brand: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  onHandStock: number;
  reservedStock: number;
  availableStock: number;
  minStockLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Khớp ServiceBomResponse.java — định mức phụ tùng của một dịch vụ. */
export interface ServiceBomResponse {
  id: string;
  serviceId: string;
  partId: string;
  partSku: string;
  partName: string;
  partUnit: string;
  default_quantity: number;
  note: string | null;
}

/** Khớp PartCompatibilityResponse.java — dòng xe mà phụ tùng lắp được. */
export interface PartCompatibilityResponse {
  id: string;
  partId: string;
  vehicleBrand: string;
  vehicleModel: string;
  yearFrom: number | null;
  yearTo: number | null;
  createdAt: string;
}

// ── Inventory: nhà cung cấp, đơn nhập hàng, sổ kho ────────────────────────────
/** Khớp SupplierResponse.java. */
export interface SupplierResponse {
  id: string;
  code: string;
  name: string;
  taxCode: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Khớp PurchaseOrderStatus.java. */
export type PurchaseOrderStatus =
  | "DRAFT"
  | "APPROVED"
  | "RECEIVED"
  | "CANCELED";

/** Khớp PurchaseOrderItemResponse.java — một dòng hàng của đơn nhập hàng. */
export interface PurchaseOrderItemResponse {
  id: string;
  partId: string;
  partSku: string;
  partName: string;
  quantity: number;
  importPrice: number;
  totalPrice: number;
}

/** Khớp PurchaseOrderResponse.java. */
export interface PurchaseOrderResponse {
  id: string;
  code: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  totalAmount: number;
  createdBy: string | null;
  receivedAt: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItemResponse[];
}

/** Khớp TransactionType.java — loại biến động tồn kho. */
export type InventoryTransactionType =
  | "IMPORT"
  | "EXPORT"
  | "RESERVE"
  | "RELEASE"
  | "RETURN"
  | "ADJUSTMENT";

/** Khớp ReferenceType.java — nguồn phát sinh giao dịch kho. */
export type InventoryReferenceType =
  | "PURCHASE_ORDER"
  | "WORK_ORDER"
  | "STOCK_TAKE";

/** Khớp InventoryTransactionResponse.java — một dòng sổ kho. */
export interface InventoryTransactionResponse {
  id: string;
  partId: string;
  partSku: string;
  partName: string;
  type: InventoryTransactionType;
  quantity: number;
  /**
   * Với IMPORT/EXPORT/RETURN/ADJUSTMENT là tồn thực (on_hand);
   * với RESERVE/RELEASE là tồn giữ chỗ (reserved).
   */
  stockBefore: number;
  stockAfter: number;
  referenceType: InventoryReferenceType;
  referenceId: string | null;
  createdBy: string | null;
  note: string | null;
  createdAt: string;
}

/** Khớp StockAvailabilityResponse.java — kết quả kiểm tra tồn tức thời. */
export interface StockAvailabilityResponse {
  partId: string;
  sku: string;
  name: string;
  requestedQuantity: number;
  onHandStock: number;
  reservedStock: number;
  availableStock: number;
  sufficient: boolean;
  isActive: boolean;
}

/** Khớp PartPricingResponse.java — kết quả định giá phụ tùng. */
export interface PartPricingResponse {
  partId: string;
  sku: string;
  name: string;
  unit: string;
  sellingPrice: number;
  quantity: number;
  lineTotal: number;
  availableStock: number;
  isActive: boolean;
}

// ── Booking service (booking-service) ─────────────────────────────────────────
/** Khớp BookingStatus.java. */
export type BookingStatus =
  | "CONFIRMED"
  | "CANCELLED"
  | "NO_SHOW"
  | "CHECKED_IN"
  | "FULFILLED";

/** Khớp BookingSource.java. */
export type BookingSource = "ONLINE" | "PHONE" | "WALK_IN";

/** Khớp BookingServiceResponse.java — dịch vụ đã chốt trong 1 lịch hẹn. */
export interface BookingServiceResponse {
  serviceId: string;
  serviceNameSnapshot: string;
  estimatedDurationMinutes: number | null;
  requiredTechniciansSnapshot: number | null;
  sequenceNumber: number;
}

/** Khớp BookingResponse.java. */
export interface BookingResponse {
  id: string;
  customerId: string;
  vehicleId: string | null;
  licensePlateSnapshot: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  customerNote: string | null;
  services: BookingServiceResponse[];
  createdAt: string;
  updatedAt: string;
}

/** Khớp AvailabilitySlotResponse.java. */
export interface AvailabilitySlotResponse {
  startAt: string;
  endAt: string;
}

/** Khớp BookingCreateRequest.java. */
export interface BookingCreateRequest {
  /** ISO-8601 instant, ví dụ "2026-11-20T02:00:00Z". */
  startAt: string;
  serviceIds: string[];
  licensePlate: string;
  customerNote?: string;
}

/** Khớp BookingRescheduleRequest.java. */
export interface BookingRescheduleRequest {
  startAt: string;
}

/** Khớp BookingCancelRequest.java. */
export interface BookingCancelRequest {
  reason?: string;
}

// ── Staff service (staff-service) ─────────────────────────────────────────────
/** Khớp StaffResponse.java */
export interface StaffResponse {
  id: string;
  userId: string | null;
  employeeCode: string | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  /** Chức vụ: MECHANIC, SERVICE_ADVISOR, CASHIER, MANAGER… */
  position: string | null;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

/** Khớp WorkShiftResponse.java */
export interface WorkShiftResponse {
  id: string;
  code: string;
  name: string;
  /** Định dạng `HH:mm:ss` (Java `LocalTime`). */
  startTime: string;
  /** Định dạng `HH:mm:ss` (Java `LocalTime`). */
  endTime: string;
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
}

/** Khớp StaffAbsenceResponse.java */
export interface StaffAbsenceResponse {
  absenceId: string;
  staffId: string;
  /** ISO instant. */
  startAt: string;
  /** ISO instant. */
  endAt: string;
  /** Loại nghỉ: ANNUAL_LEAVE, SICK_LEAVE, UNPAID_LEAVE… */
  absenceType: string;
  reason: string | null;
  recordedBy: string | null;
  createdAt: string;
}

/** Khớp ScheduleExceptionType.java */
export type ScheduleExceptionType = "CANCEL_SHIFT" | "ADD_SHIFT";

/** Khớp StaffScheduleExceptionResponse.java */
export interface StaffScheduleExceptionResponse {
  exceptionId: string;
  staffId: string;
  shiftId: string;
  /** Định dạng `yyyy-MM-dd` (Java `LocalDate`). */
  exceptionDate: string;
  exceptionType: ScheduleExceptionType;
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Khớp StaffRecurringScheduleResponse.java */
export interface StaffRecurringScheduleResponse {
  scheduleId: string;
  shiftId: string;
  /** `MONDAY` … `SUNDAY` (Java `DayOfWeek`). */
  dayOfWeek: string;
  /** Định dạng `yyyy-MM-dd`. */
  effectiveFrom: string;
  /** Định dạng `yyyy-MM-dd` — `null` nghĩa là hiệu lực vô thời hạn. */
  effectiveTo: string | null;
}

/** Khớp ScheduleIntervalResponse.java */
export interface ScheduleIntervalResponse {
  shiftId: string;
  shiftCode: string;
  shiftName: string;
  /** ISO instant — mốc bắt đầu thực tế của ca (đã gộp ngày). */
  startAt: string;
  /** ISO instant — mốc kết thúc thực tế của ca. */
  endAt: string;
}

/** Khớp ScheduleDayResponse.java */
export interface ScheduleDayResponse {
  /** Định dạng `yyyy-MM-dd`. */
  date: string;
  intervals: ScheduleIntervalResponse[];
}

/** Khớp StaffScheduleResponse.java */
export interface StaffScheduleResponse {
  staffId: string;
  employeeCode: string | null;
  fullName: string | null;
  days: ScheduleDayResponse[];
}

/** Khớp StaffAvailabilityResponse.java */
export interface StaffAvailabilityResponse {
  staffId: string;
  employeeCode: string | null;
  fullName: string | null;
  /** ISO instant. */
  startAt: string;
  /** ISO instant. */
  endAt: string;
}

// ── Work Order service (work-order-service) ───────────────────────────────────
/** Khớp WorkOrderStatus.java */
export type WorkOrderStatus =
  | "CREATED"
  | "DIAGNOSING"
  | "PENDING_APPROVAL"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "PENDING_PAYMENT"
  | "CLOSED"
  | "CANCELED";

/** Khớp WorkOrderListItemResponse.java — dòng trong bảng tra cứu. */
export interface WorkOrderListItemResponse {
  id: string;
  code: string;
  bookingId: string | null;
  customerId: string | null;
  vehicleId: string | null;
  advisorId: string | null;
  status: WorkOrderStatus;
  odometerIn: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Khớp WorkOrderPageResponse.java — không có hasNext/hasPrevious. */
export interface WorkOrderPageResponse {
  items: WorkOrderListItemResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Khớp CustomerSummaryResponse.java */
export interface WorkOrderCustomerSummary {
  id: string;
  fullName: string | null;
  phone: string | null;
}

/** Khớp VehicleSummaryResponse.java */
export interface WorkOrderVehicleSummary {
  id: string;
  licensePlate: string | null;
  vin: string | null;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  trim: string | null;
  color: string | null;
  fuelType: string | null;
  transmission: string | null;
  odometerKm: number | null;
  notes: string | null;
  isActive: boolean | null;
}

/** Khớp EstimateSummaryResponse.java */
export interface EstimateSummaryResponse {
  id: string;
  code: string;
  /** INITIAL | SUPPLEMENTARY */
  type: string;
  /** DRAFT | PENDING_APPROVAL | APPROVED | REJECTED… */
  status: string;
  totalAmount: number;
}

/** Khớp WorkOrderStatusHistoryResponse.java */
export interface WorkOrderStatusHistoryResponse {
  id: string;
  statusFrom: string | null;
  statusTo: string;
  changedBy: string | null;
  note: string | null;
  createdAt: string;
}

/** Khớp WorkOrderResponse.java */
export interface WorkOrderResponse {
  id: string;
  code: string;
  bookingId: string | null;
  customerId: string | null;
  vehicleId: string | null;
  customer: WorkOrderCustomerSummary | null;
  vehicle: WorkOrderVehicleSummary | null;
  advisorId: string | null;
  status: WorkOrderStatus;
  odometerIn: number | null;
  odometerOut: number | null;
  vehicleCondition: string | null;
  customerNote: string | null;
  createdAt: string;
  updatedAt: string;
  /** Snapshot booking lúc tạo Work Order — có thể null với dữ liệu cũ. */
  booking: WorkOrderBookingSummary | null;
  estimates: EstimateSummaryResponse[];
  statusHistory: WorkOrderStatusHistoryResponse[];
}

/** Khớp BookingSummaryResponse.java — booking snapshot gắn vào Work Order. */
export interface WorkOrderBookingSummary {
  id: string;
  licensePlateSnapshot: string | null;
  startAt: string;
  endAt: string;
  status: string;
  source: string;
  customerNote: string | null;
  services: WorkOrderBookingServiceSummary[];
}

/** Khớp BookingServiceSummaryResponse.java */
export interface WorkOrderBookingServiceSummary {
  serviceId: string;
  serviceNameSnapshot: string | null;
  estimatedDurationMinutes: number | null;
  requiredTechniciansSnapshot: number | null;
  sequenceNumber: number | null;
}

// ── Estimate ──────────────────────────────────────────────────────────────────
/** Khớp EstimateType.java */
export type EstimateType = "INITIAL" | "SUPPLEMENTARY";

/** Khớp EstimateStatus.java */
export type EstimateStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED";

/** Khớp WorkOrderServiceStatus.java */
export type WorkOrderServiceStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "IN_PROGRESS"
  | "COMPLETED";

/** Khớp WorkOrderPartStatus.java */
export type WorkOrderPartStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PARTIALLY_RESERVED"
  | "RESERVED"
  | "FAILED"
  | "ISSUED"
  | "RETURNED";

/** Khớp EstimateItemType.java */
export type EstimateItemType = "SERVICE" | "PART";

/** Khớp EstimateItemDecision.java */
export type EstimateItemDecision = "APPROVED" | "REJECTED";

/** Khớp WorkOrderServiceLineResponse.java */
export interface WorkOrderServiceLineResponse {
  id: string;
  serviceId: string;
  snapshotName: string | null;
  durationMinutes: number | null;
  requiredTechs: number | null;
  unitPrice: number;
  totalPrice: number;
  status: WorkOrderServiceStatus;
  assignedTechId: string | null;
  completedAt: string | null;
  createdAt: string;
}

/** Khớp WorkOrderPartLineResponse.java */
export interface WorkOrderPartLineResponse {
  id: string;
  serviceLineId: string | null;
  partId: string;
  snapshotName: string | null;
  snapshotSku: string | null;
  snapshotUnit: string | null;
  requestedQuantity: number;
  reservedQuantity: number;
  issuedQuantity: number;
  releasedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  status: WorkOrderPartStatus;
  createdAt: string;
}

/** Khớp EstimateResponse.java */
export interface EstimateResponse {
  id: string;
  code: string;
  workOrderId: string;
  type: EstimateType;
  status: EstimateStatus;
  totalLaborAmount: number;
  totalPartsAmount: number;
  totalAmount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  serviceLines: WorkOrderServiceLineResponse[];
  partLines: WorkOrderPartLineResponse[];
}

/** Khớp AssignedServiceLineResponse.java */
export interface AssignedServiceLineResponse {
  id: string;
  estimateId: string;
  workOrderId: string;
  workOrderCode: string;
  serviceId: string;
  snapshotName: string | null;
  durationMinutes: number | null;
  requiredTechs: number | null;
  unitPrice: number;
  totalPrice: number;
  status: WorkOrderServiceStatus;
  assignedTechId: string | null;
  completedAt: string | null;
  createdAt: string;
}

// ── Request DTO của work-order-service ───────────────────────────────────────
/** Khớp CreateWorkOrderRequest.java */
export interface CreateWorkOrderRequest {
  bookingId: string;
  /** Số km vào xưởng — bắt buộc, >= 0. */
  odometerIn: number;
  /** Tình trạng xe khi vào (tối đa 65535 ký tự). */
  vehicleCondition?: string | null;
  /** Ghi chú của khách về xe. */
  customerNote?: string | null;
}

/** Khớp CreateEstimateRequest.java */
export interface CreateEstimateRequest {
  type: EstimateType;
}

/** Khớp AddServiceToEstimateRequest.java */
export interface AddServiceToEstimateRequest {
  serviceId: string;
}

/** Khớp AddPartToEstimateRequest.java */
export interface AddPartToEstimateRequest {
  partId: string;
  /** Số lượng > 0. */
  quantity: number;
}

/** Khớp EstimateItemDecisionRequest.java */
export interface EstimateItemDecisionRequest {
  itemType: EstimateItemType;
  /** id của service line hoặc part line (KHÔNG phải id catalog). */
  itemId: string;
  decision: EstimateItemDecision;
}

/** Khớp EstimateDecisionRequest.java */
export interface EstimateDecisionRequest {
  items: EstimateItemDecisionRequest[];
}

/** Khớp AssignMechanicRequest.java */
export interface AssignMechanicRequest {
  /** id của hồ sơ nhân viên (staff profile), không phải user id. */
  mechanicId: string;
}

/** Khớp PartQuantityRequest.java */
export interface PartQuantityRequest {
  quantity: number;
}

// ── Billing service (billing-service) ─────────────────────────────────────────
/** Khớp InvoiceStatus.java */
export type InvoiceStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "VOID";

/** Khớp InvoiceItemType.java */
export type InvoiceItemType = "SERVICE" | "PART";

/** Khớp PaymentMethod.java */
export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD";

/** Khớp PaymentStatus.java */
export type PaymentStatus = "SUCCEEDED" | "REFUNDED";

/** Khớp InvoiceItemResponse.java */
export interface InvoiceItemResponse {
  id: string;
  itemType: InvoiceItemType;
  referenceItemId: string | null;
  catalogId: string | null;
  snapshotCode: string | null;
  snapshotName: string | null;
  quantity: number | null;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  totalPrice: number;
}

/** Khớp PaymentResponse.java */
export interface PaymentResponse {
  id: string;
  code: string;
  invoiceId: string;
  idempotencyKey: string | null;
  paymentMethod: PaymentMethod;
  amount: number;
  status: PaymentStatus;
  transactionRef: string | null;
  processedBy: string | null;
  note: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  refundReason: string | null;
}

/** Khớp InvoiceSummaryResponse.java — dòng trong bảng tra cứu hóa đơn. */
export interface InvoiceSummaryResponse {
  id: string;
  code: string;
  workOrderId: string | null;
  customerId: string | null;
  vehicleId: string | null;
  subtotalLabor: number;
  subtotalParts: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  status: InvoiceStatus;
  issuedAt: string;
  paidAt: string | null;
}

/** Khớp InvoicePageResponse.java — không có hasNext/hasPrevious. */
export interface InvoicePageResponse {
  items: InvoiceSummaryResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Khớp InvoiceResponse.java */
export interface InvoiceResponse {
  id: string;
  code: string;
  workOrderId: string | null;
  customerId: string | null;
  vehicleId: string | null;
  subtotalLabor: number;
  subtotalParts: number;
  discountAmount: number;
  taxAmount: number;
  grandTotal: number;
  paidAmount: number;
  status: InvoiceStatus;
  note: string | null;
  issuedBy: string | null;
  issuedAt: string;
  paidAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  items: InvoiceItemResponse[];
  payments: PaymentResponse[];
}

// ── Section 5: Billing — payload ghi (billing-service) ─────────────────────

/**
 * Khớp `DiscountUpdateRequest.java`.
 *
 * `discountAmount` phải >= 0 và không vượt quá
 * `subtotalLabor + subtotalParts + taxAmount` (backend trả 71xx nếu vượt).
 */
export interface DiscountUpdateRequest {
  /** Số tiền chiết khấu (> = 0). */
  discountAmount: number;
  /** Ghi chú, tối đa 255 ký tự. */
  note?: string | null;
}

/** Khớp `InvoiceVoidRequest.java` — body optional. */
export interface InvoiceVoidRequest {
  reason?: string | null;
}

/**
 * Khớp `PaymentCreateRequest.java`.
 *
 * Lưu ý: `idempotencyKey` là **UUID bắt buộc** — backend dùng làm khoá chống
 * ghi trùng. Gọi lại cùng key sẽ trả về đúng giao dịch cũ.
 */
export interface PaymentCreateRequest {
  invoiceId: string;
  /** UUID duy nhất cho mỗi lần thanh toán. */
  idempotencyKey: string;
  paymentMethod: PaymentMethod;
  /** Số tiền > 0, không được vượt số dư còn lại của hóa đơn. */
  amount: number;
  /** Mã giao dịch / số tài khoản nhận tiền (tối đa 100 ký tự). */
  transactionRef?: string | null;
  note?: string | null;
}

/** Khớp `PaymentRefundRequest.java` — body optional. */
export interface PaymentRefundRequest {
  reason?: string | null;
}

// ── Section 6: Notification service (notification-service) ────────────────────

/** Khớp `NotificationCategory.java` */
export type NotificationCategory =
  | "BOOKING"
  | "WORK_ORDER"
  | "BILLING"
  | "INVENTORY"
  | "SYSTEM";

/** Khớp `RecipientType.java` */
export type RecipientType = "CUSTOMER" | "STAFF";

/** Khớp `NotificationChannel.java` */
export type NotificationChannel = "IN_APP" | "EMAIL" | "SMS" | "ZNS";

/**
 * Khớp `NotificationResponse.java`.
 *
 * Lưu ý: `referenceType`/`referenceId` trỏ tới entity liên quan (BOOKING,
 * WORK_ORDER, INVOICE, PART…) — dùng để điều hướng tới màn hình chi tiết.
 */
export interface NotificationResponse {
  id: string;
  category: NotificationCategory;
  title: string;
  content: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

/** Khớp `UnreadCountResponse.java` */
export interface UnreadCountResponse {
  unreadCount: number;
}

/**
 * Khớp `PageResponse.java` của notification-service.
 *
 * Khác `PageResponse` chung trong file này: dùng `content` (không phải `items`)
 * và có `first`/`last` (không phải `hasNext`/`hasPrevious`).
 */
export interface NotificationPageResponse {
  content: NotificationResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Khớp `NotificationTemplateResponse.java` */
export interface NotificationTemplateResponse {
  id: string;
  code: string;
  channel: NotificationChannel;
  subjectTemplate: string | null;
  bodyTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Khớp `NotificationTemplatePageResponse.java` (PageResponse<NotificationTemplateResponse>) */
export interface NotificationTemplatePageResponse {
  content: NotificationTemplateResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Khớp `SendNotificationRequest.java` */
export interface SendNotificationRequest {
  recipientType: RecipientType;
  recipientId: string;
  category: NotificationCategory;
  title: string;
  content: string;
  referenceType?: string | null;
  referenceId?: string | null;
  /** Gửi kèm email — khi true thì `emailAddress` bắt buộc. */
  sendEmail?: boolean;
  emailAddress?: string | null;
}

/** Khớp `UpdateNotificationTemplateRequest.java` */
export interface UpdateNotificationTemplateRequest {
  /** Chỉ dùng cho kênh EMAIL — có thể null. */
  subjectTemplate?: string | null;
  bodyTemplate: string;
  isActive: boolean;
}

/**
 * Payload của 1 event SSE từ `GET /api/notifications/stream`.
 *
 * Khớp `NotificationSsePayload.java` — khác `NotificationResponse` (thiếu
 * `referenceType`/`referenceId`/`isRead`/`readAt`).
 */
export interface NotificationSsePayload {
  id: string;
  title: string;
  content: string;
  category: NotificationCategory;
  createdAt: string;
}

// ── Staff booking (booking-service — màn hình lịch hẹn của xưởng) ─────────────
/**
 * Khớp StaffBookingCreateRequest.java — lịch hẹn do **nhân viên** tạo hộ khách.
 *
 * Khác `BookingCreateRequest` (khách tự tạo) ở 2 điểm:
 *  - Bắt buộc có `customerId` + `source` (khách tự đặt thì không cần).
 *  - `licensePlate` là bắt buộc và tối đa 20 ký tự — nhân viên nhập tay biển số.
 */
export interface StaffBookingCreateRequest {
  /** ONLINE | PHONE | WALK_IN — nguồn lịch hẹn do nhân viên nhập. */
  source: BookingSource;
  /** ISO-8601 instant, ví dụ "2026-11-20T02:00:00Z". */
  startAt: string;
  /** Danh sách id dịch vụ — không được rỗng. */
  serviceIds: string[];
  /** Biển số xe, tối đa 20 ký tự. */
  licensePlate: string;
  /** Khách hàng phải đã tồn tại trong customer-vehicle-service. */
  customerId: string;
  /** Ghi chú của khách, tối đa 1000 ký tự. */
  customerNote?: string;
}

/** Khớp StaffBookingResponse.java */
export interface StaffBookingResponse {
  id: string;
  customerId: string | null;
  vehicleId: string | null;
  workOrderId: string | null;
  licensePlateSnapshot: string;
  startAt: string;
  endAt: string;
  status: BookingStatus;
  source: BookingSource;
  createdBy: string | null;
  customerNote: string | null;
  services: BookingServiceResponse[];
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  checkedInAt: string | null;
}

/** Khớp StaffBookingPageResponse.java — không có hasNext/hasPrevious. */
export interface StaffBookingPageResponse {
  items: StaffBookingResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * Khớp `StaffBookingVehicleRequest.java` — payload cho
 * `POST /api/staff/bookings/{id}/check-in`.
 */
export interface StaffBookingVehicleRequest {
  /** Xe thực tế đưa vào xưởng (bắt buộc — booking chưa gắn xe thì không tạo được Work Order). */
  vehicleId: string;
  /** Số km vào xưởng, >= 0. */
  odometerIn: number;
  /** Tình trạng xe khi nhận. */
  vehicleCondition?: string | null;
  /** Ghi chú của khách. */
  customerNote?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Nhãn tiếng Việt cho tên role của backend.
 *
 * Backend trả `roles[].name` ở dạng "ADMIN", "MECHANIC", "MANAGER",
 * "SERVICE_ADVISOR", "CASHIER", "CUSTOMER". Giao diện hiển thị nhãn tiếng Việt
 * tương ứng; role lạ (do admin tự tạo) thì giữ nguyên tên gốc.
 */
export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Quản trị viên",
  MANAGER: "Quản lý",
  MECHANIC: "Kỹ thuật viên",
  TECHNICIAN: "Kỹ thuật viên",
  SERVICE_ADVISOR: "Tư vấn viên",
  CASHIER: "Thu ngân",
  CUSTOMER: "Khách hàng",
};

/** Nhãn hiển thị cho một danh sách tên role. */
export function roleLabel(names: string[] | undefined | null): string {
  if (!names || names.length === 0) return "Quản trị viên";
  const first = names[0]?.toUpperCase() ?? "";
  return ROLE_LABEL[first] ?? names[0] ?? "Quản trị viên";
}

/** Kiểm tra user có authority cụ thể không (role ADMIN ⇒ ROLE_ADMIN). */
export function hasAuthority(user: UserResponse | null, authority: string): boolean {
  if (!user?.roles) return false;
  for (const role of user.roles) {
    if (role.name === authority) return true;
    const perms = role.permissions ? role.permissions : [];
    if (perms.some((p) => p.name === authority)) return true;
  }
  return false;
}

/** Lấy tên role đầu tiên — dùng cho phân nhánh UI CUSTOMER / ADMIN. */
export function primaryRole(user: UserResponse | null): string | null {
  if (!user?.roles) return null;
  const names = user.roles.map((r) => r.name);
  return names.length > 0 ? names[0] : null;
}
