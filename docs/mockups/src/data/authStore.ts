/**
 * AuthStore mini — tạm thời dùng localStorage + custom event để mô phỏng auth.
 * Khi có backend thật, sẽ thay bằng React Query + JWT.
 *
 * Luật:
 * - 1 user đang đăng nhập / null (chưa đăng nhập)
 * - Lưu localStorage key "autocare:auth"
 * - Dispatch event "autocare:auth:changed" để các component subscribe
 */
import { useEffect, useState, useCallback } from "react";
import { mockUsers, type Order, type Address, type Vehicle } from "./mock";

export const AUTH_KEY = "autocare:auth";
export const AUTH_EVENT = "autocare:auth:changed";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar: string;
  memberSince: string;
  // Stats (derived từ orders + vehicles)
  totalOrders: number;
  totalSpentVND: number;
  loyaltyPoints: number;
  tier: "Thành viên" | "Bạc" | "Vàng" | "Bạch kim";
};

export type Session = {
  user: AuthUser;
  loggedInAt: string;
};

// =========================
// Read / write
// =========================
export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Session;
    if (!parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeSession(session: Session | null) {
  if (session) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

// =========================
// Actions
// =========================

/**
 * Đăng nhập bằng email (mock — không cần password).
 * Nếu email khớp với mockUsers → login, ngược lại tạo user tạm.
 */
export function login(email: string): Session {
  const existing = mockUsers.find(
    (u) => u.email.toLowerCase() === email.toLowerCase(),
  );
  const userData = existing ?? mockUsers[0]; // fallback cho demo
  const session: Session = {
    user: {
      id: userData.id,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      avatar: userData.avatar,
      memberSince: userData.memberSince,
      totalOrders: userData.orders.length,
      totalSpentVND: userData.orders.reduce((s, o) => s + o.totalVND, 0),
      loyaltyPoints: userData.loyaltyPoints,
      tier: userData.tier,
    },
    loggedInAt: new Date().toISOString(),
  };
  writeSession(session);
  return session;
}

export function logout() {
  writeSession(null);
}

export function updateProfile(patch: Partial<AuthUser>): Session | null {
  const current = readSession();
  if (!current) return null;
  const next: Session = {
    ...current,
    user: { ...current.user, ...patch },
  };
  writeSession(next);
  return next;
}

// =========================
// Per-user data (orders, addresses, vehicles)
// =========================

export function getUserOrders(userId: string): Order[] {
  const u = mockUsers.find((x) => x.id === userId);
  return u?.orders ?? [];
}

export function getUserAddresses(userId: string): Address[] {
  const u = mockUsers.find((x) => x.id === userId);
  return u?.addresses ?? [];
}

export function getUserVehicles(userId: string): Vehicle[] {
  const u = mockUsers.find((x) => x.id === userId);
  return u?.vehicles ?? [];
}

// =========================
// React hooks
// =========================

/** Hook đọc session hiện tại. Trả về null nếu chưa đăng nhập. */
export function useSession(): Session | null {
  const [session, setSession] = useState<Session | null>(() => readSession());

  useEffect(() => {
    const refresh = () => setSession(readSession());
    window.addEventListener(AUTH_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(AUTH_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return session;
}

/** Hook trả về user (không bao gồm session metadata). */
export function useAuthUser(): AuthUser | null {
  const session = useSession();
  return session?.user ?? null;
}

/** Hook kết hợp: trả về user + login/logout/updateProfile. */
export function useAuth() {
  const user = useAuthUser();
  const loginFn = useCallback((email: string) => login(email), []);
  const logoutFn = useCallback(() => logout(), []);
  const updateProfileFn = useCallback(
    (patch: Partial<AuthUser>) => updateProfile(patch),
    [],
  );
  return { user, login: loginFn, logout: logoutFn, updateProfile: updateProfileFn };
}