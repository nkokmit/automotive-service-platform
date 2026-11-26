/**
 * Quản lý token phiên đăng nhập.
 *
 * Quyết định thiết kế: refresh token lưu localStorage (chấp nhận rủi ro XSS để
 * đổi lấy độ phức tạp thấp — phù hợp phạm vi đồ án). Nếu lên production nên
 * chuyển refresh token sang httpOnly cookie phía server.
 */

const ACCESS_KEY = "autocare:accessToken";
const REFRESH_KEY = "autocare:refreshToken";

/** Báo cho các component biết phiên đã đổi (subscribe trong useAuth). */
export const TOKEN_EVENT = "autocare:token:changed";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode / storage bị chặn — bỏ qua, request sẽ 401 và xử lý ở tầng trên */
  }
}

export function getAccessToken(): string | null {
  return safeGet(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  return safeGet(REFRESH_KEY);
}

export function setTokens(accessToken: string, refreshToken: string): void {
  safeSet(ACCESS_KEY, accessToken);
  safeSet(REFRESH_KEY, refreshToken);
}

/** Chỉ cập nhật access token sau khi refresh — giữ nguyên refresh token. */
export function setAccessToken(accessToken: string): void {
  safeSet(ACCESS_KEY, accessToken);
}

export function hasSession(): boolean {
  return safeGet(ACCESS_KEY) !== null;
}

export function clearTokens(): void {
  safeSet(ACCESS_KEY, null);
  safeSet(REFRESH_KEY, null);
  window.dispatchEvent(new CustomEvent(TOKEN_EVENT));
}

/** Đọc `exp` (giây) từ JWT payload để canh trước thời điểm hết hạn. */
export function getTokenExpiry(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Token còn hợp lệ không — chừa 30s làm buffer để không hết hạn giữa chừng request. */
export function isAccessTokenValid(): boolean {
  const token = getAccessToken();
  if (!token) return false;
  const expiry = getTokenExpiry(token);
  if (expiry === null) return true; // không đọc được exp thì để backend tư quyết
  return Date.now() < expiry - 30_000;
}

/**
 * Đọc danh sách authority của phiên hiện tại từ claim `authorities` của JWT.
 *
 * Vì sao không lấy từ `GET /api/users/me`? Backend trả `roles[].permissions = null`
 * khi đọc user (xem `UserResponse.java`), nên giao diện **không biết** user có
 * `WORK_ORDER_CREATE` hay không. Claim `authorities` trong access token là nơi
 * duy nhất gateway/service đọc để gắn quyền → đây cũng là nguồn đúng nhất để
 * ẩn/hiện nút.
 *
 * @returns mảng authority (VD: `["WORK_ORDER_CREATE", "ESTIMATE_READ"]`), rỗng
 *          nếu không có token hoặc token không đọc được.
 */
export function getTokenAuthorities(): string[] {
  const token = getAccessToken();
  if (!token) return [];
  try {
    const payload = token.split(".")[1];
    if (!payload) return [];
    const json = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    const authorities = json.authorities;
    return Array.isArray(authorities)
      ? authorities.filter((a): a is string => typeof a === "string")
      : [];
  } catch {
    return [];
  }
}

/** Phiên hiện tại có authority này không. */
export function hasTokenAuthority(authority: string): boolean {
  return getTokenAuthorities().includes(authority);
}