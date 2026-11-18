/**
 * AuthStore — quản lý phiên đăng nhập qua backend thật.
 *
 * Lưu ý về hợp đồng dữ liệu:
 *  - `UserResponse` từ backend có: id, username, email, phone, fullName, isActive, roles.
 *    KHÔNG có avatar / tier / memberSince / loyaltyPoints.
 *  - Giao diện đang dùng `AuthUser` với các field UI đó, nên bản đồ từ API sang giữ
 *    cho các trang hiện tại không phải sửa. Trường nào API không có sẽ có giá trị mặc
 *    định hợp lý — xem `mapUserFromApi()`.
 *  - Khi backend bổ sung field tương ứng, chỉ cần sửa hàm map này.
 */
import { useCallback, useEffect, useState } from "react";
import { authApi } from "../api/endpoints/auth";
import { customerApi, userApi } from "../api/endpoints/user";
import { isAuthError } from "../api/client";
import { TOKEN_EVENT, getAccessToken } from "../api/session";
import { primaryRole } from "../api/types";
import type { CustomerResponse, UserResponse } from "../api/types";
import { mockUsers, type Order, type Address, type Vehicle } from "./mock";

export const AUTH_KEY = "autocare:auth";
export const AUTH_EVENT = "autocare:auth:changed";

/**
 * Trạng thái hồ sơ khách hàng của tài khoản.
 *  - `unknown`: chưa thử / đang thử lần đầu
 *  - `linked`: server trả 200 — đã liên kết
 *  - `unlinked`: server trả 403 — tài khoản chưa có hồ sơ
 *    (CustomerProfileUnresolvedException, xem CurrentCustomerServiceImpl.java)
 */
export type CustomerStatus = "unknown" | "linked" | "unlinked";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  /** Backend chưa có avatar → dùng avatar mặc định của mock cho tới khi bổ sung. */
  avatar: string;
  /** Backend chưa có các field loyalty → giữ mặc định để UI không vỡ. */
  memberSince: string;
  totalOrders: number;
  totalSpentVND: number;
  loyaltyPoints: number;
  tier: "Thành viên" | "Bạc" | "Vàng" | "Bạch kim";
  /** Dữ liệu thật từ backend, dùng cho logic phân quyền. */
  username: string;
  roles: string[];
};

export type Session = {
  user: AuthUser;
  loggedInAt: string;
  /** Hồ sơ khách hàng — chỉ có khi `customerStatus === "linked"`. */
  customer?: CustomerResponse | null;
  customerStatus?: CustomerStatus;
};

/** Map DTO của backend sang shape mà giao diện đang dùng. */
export function mapUserFromApi(dto: UserResponse): AuthUser {
  const fallback = mockUsers[0];
  return {
    id: dto.id,
    // Ưu tiên fullName; fallback sang username để không hiện ô trống.
    name: dto.fullName?.trim() || dto.username,
    email: dto.email,
    phone: dto.phone ?? undefined,
    avatar: fallback.avatar,
    memberSince: fallback.memberSince,
    totalOrders: 0,
    totalSpentVND: 0,
    loyaltyPoints: 0,
    tier: "Thành viên",
    username: dto.username,
    roles: dto.roles ? Array.from(dto.roles).map((r) => r.name) : [],
  };
}

/**
 * Thử load hồ sơ khách hàng đi kèm tài khoản.
 * - 200 → `{ status: "linked", customer }`
 * - 401/403 (`isAuthError`) → `{ status: "unlinked", customer: null }`
 *      (CustomerProfileUnresolvedException — tài khoản chưa liên kết hồ sơ)
 * - Lỗi khác (mạng/5xx) → `{ status: "unknown", customer: null }`,
 *      KHÔNG xoá phiên đăng nhập vì không liên quan tới auth user.
 */
export async function loadCustomerProfile(): Promise<{
  status: CustomerStatus;
  customer: CustomerResponse | null;
}> {
  try {
    const customer = await customerApi.me();
    return { status: "linked", customer };
  } catch (err) {
    if (isAuthError(err)) {
      return { status: "unlinked", customer: null };
    }
    return { status: "unknown", customer: null };
  }
}

/** Đồng bộ cache session với backend. Gọi khi vừa đăng nhập hoặc mount app. */
export async function hydrateUser(): Promise<Session | null> {
  if (!getAccessToken()) return null;
  try {
    const dto = await userApi.me();
    const session: Session = {
      user: mapUserFromApi(dto),
      loggedInAt: new Date().toISOString(),
      customerStatus: "unknown",
    };
    const { status, customer } = await loadCustomerProfile();
    session.customerStatus = status;
    session.customer = customer;
    writeSession(session);
    return session;
  } catch {
    // Token hết hạn và refresh cũng hỏng → coi như chưa đăng nhập.
    writeSession(null);
    return null;
  }
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.user?.id) return null;
    // Backward-compat: session từ phiên cũ không có customerStatus.
    if (!parsed.customerStatus) parsed.customerStatus = "unknown";
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  try {
    if (session) {
      localStorage.setItem(AUTH_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(AUTH_KEY);
    }
  } catch {
    /* storage bị chặn — bỏ qua */
  }
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Đăng nhập thật qua `POST /api/auth/login`.
 * Lưu ý: backend xác thực bằng **username**, không phải email.
 */
export async function login(username: string, password: string): Promise<Session> {
  await authApi.login({ username, password });
  const dto = await userApi.me();
  const session: Session = {
    user: mapUserFromApi(dto),
    loggedInAt: new Date().toISOString(),
    customerStatus: "unknown",
  };
  const { status, customer } = await loadCustomerProfile();
  session.customerStatus = status;
  session.customer = customer;
  writeSession(session);
  return session;
}

/** Đăng ký thật qua `POST /api/auth/register`. Backend trả token luôn nên vào thẳng phiên. */
export async function register(payload: {
  username: string;
  password: string;
  email: string;
  phone?: string;
  fullName?: string;
}): Promise<Session> {
  await authApi.register(payload);
  const dto = await userApi.me();
  const session: Session = {
    user: mapUserFromApi(dto),
    loggedInAt: new Date().toISOString(),
    customerStatus: "unknown",
  };
  const { status, customer } = await loadCustomerProfile();
  session.customerStatus = status;
  session.customer = customer;
  writeSession(session);
  return session;
}

/**
 * Tải lại hồ sơ khách hàng và merge vào session hiện tại.
 * Dùng khi người dùng vừa liên kết hồ sơ thành công (vd: nhân viên gara xác nhận)
 * — gọi nút "Tải lại" trên banner để cập nhật mà không phải logout.
 */
export async function refreshCustomerProfile(): Promise<Session | null> {
  const current = readSession();
  if (!current) return null;
  const { status, customer } = await loadCustomerProfile();
  const next: Session = {
    ...current,
    customerStatus: status,
    customer,
  };
  writeSession(next);
  return next;
}

/** Đăng xuất: revoke token phía server rồi xoá phiên cục bộ. */
export async function logout(): Promise<void> {
  await authApi.logout();
  writeSession(null);
}

/** Cập nhật hồ sơ — CHƯA có endpoint tương ứng trong backend. */
export function updateProfile(patch: Partial<AuthUser>): Session | null {
  const current = readSession();
  if (!current) return null;
  const next: Session = { ...current, user: { ...current.user, ...patch } };
  writeSession(next);
  return next;
}

// ── Per-user data ─────────────────────────────────────────────────────────────
// Ba hàm dưới đây vẫn dùng mock vì backend **chưa có** endpoint tương ứng:
//   - orders/addresses → thuộc commerce-service, chưa tồn tại.
//   - vehicles → VehicleController cố ý không có route "xe của tôi" (xem
//     comment trong VehicleController.java); lịch sử bảo dưỡng nằm ở
//     `GET /api/service-history/me`.
// Khi các service tương ứng được implement, thay phần thân của hàm bằng call API.

export function getUserOrders(userId: string): Order[] {
  return mockUsers.find((x) => x.id === userId)?.orders ?? [];
}

export function getUserAddresses(userId: string): Address[] {
  return mockUsers.find((x) => x.id === userId)?.addresses ?? [];
}

export function getUserVehicles(userId: string): Vehicle[] {
  return mockUsers.find((x) => x.id === userId)?.vehicles ?? [];
}

// ── React hooks ───────────────────────────────────────────────────────────────

/** Hook đọc session hiện tại. Đồng bộ lại khi token đổi (refresh / logout). */
export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(() => readSession());

  useEffect(() => {
    const refresh = () => setSession(readSession());
    window.addEventListener(AUTH_EVENT, refresh);
    window.addEventListener(TOKEN_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(AUTH_EVENT, refresh);
      window.removeEventListener(TOKEN_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return session;
}

export function useAuthUser(): AuthUser | null {
  return useSession()?.user ?? null;
}

export function useAuth() {
  const session = useSession();
  const user = session?.user ?? null;
  const loginFn = useCallback((username: string, password: string) => login(username, password), []);
  const registerFn = useCallback(
    (payload: Parameters<typeof register>[0]) => register(payload),
    [],
  );
  const logoutFn = useCallback(() => logout(), []);
  const updateProfileFn = useCallback(
    (patch: Partial<AuthUser>) => updateProfile(patch),
    [],
  );
  const refreshCustomerFn = useCallback(() => refreshCustomerProfile(), []);
  return {
    user,
    customer: session?.customer ?? null,
    customerStatus: (session?.customerStatus ?? "unknown") as CustomerStatus,
    login: loginFn,
    register: registerFn,
    logout: logoutFn,
    updateProfile: updateProfileFn,
    refreshCustomer: refreshCustomerFn,
  };
}

/** Người dùng có phải quản trị viên không — dùng để ẩn/hiện khu vực admin. */
export function isAdmin(user: AuthUser | null): boolean {
  return user?.roles.includes("ADMIN") ?? false;
}

/** Lấy role chính từ DTO backend (dùng ngoài React). */
export { primaryRole };