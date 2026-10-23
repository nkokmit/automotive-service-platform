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

// ── Customer / Vehicle (customer-vehicle-service) ─────────────────────────────
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

// ── Helpers ───────────────────────────────────────────────────────────────────
/** Kiểm tra user có authority cụ thể không (role ADMIN ⇒ ROLE_ADMIN). */
export function hasAuthority(user: UserResponse | null, authority: string): boolean {
  if (!user?.roles) return false;
  for (const role of user.roles) {
    if (role.name === authority) return true;
    // Set không có .some() — phải chuyển sang mảng trước khi kiểm tra.
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