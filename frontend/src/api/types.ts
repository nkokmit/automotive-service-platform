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
export interface PermissionResponse {
  id: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
}

/** Role rút gọn — khi embed trong UserResponse thì permissions luôn null. */
export interface RoleResponse {
  id: string;
  name: string;
  displayName?: string | null;
  description?: string | null;
  permissions: Set<PermissionResponse> | null;
}

/** Khớp UserResponse.java — không có avatar/tier/memberSince. */
export interface UserResponse {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  fullName: string | null;
  isActive: boolean | null;
  roles: Set<RoleResponse>;
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
  // Các trường mở rộng từ bridge MySQL giúp hiển thị nhanh biển số/tên xe
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
  estimates: EstimateSummaryResponse[];
  statusHistory: WorkOrderStatusHistoryResponse[];
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

// ── Staff booking (booking-service — màn hình lịch hẹn của xưởng) ─────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Kiểm tra user có authority cụ thể không (role ADMIN ⇒ ROLE_ADMIN). */
export function hasAuthority(user: UserResponse | null, authority: string): boolean {
  if (!user?.roles) return false;
  for (const role of user.roles) {
    if (role.name === authority) return true;
    const perms = role.permissions ? Array.from(role.permissions) : [];
    if (perms.some((p) => p.name === authority)) return true;
  }
  return false;
}

/** Lấy tên role đầu tiên — dùng cho phân nhánh UI CUSTOMER / ADMIN. */
export function primaryRole(user: UserResponse | null): string | null {
  if (!user?.roles) return null;
  const names = Array.from(user.roles).map((r) => r.name);
  return names.length > 0 ? names[0] : null;
}
