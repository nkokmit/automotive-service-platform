/**
 * Endpoint cho user-service.
 *
 * Lưu ý khác biệt so với contracts/auth-api.yaml (đã lệch với code backend):
 *  - Login dùng `username`, KHÔNG phải email.
 *  - Endpoint refresh là `/api/auth/refresh-token`, KHÔNG phải `/api/auth/refresh`.
 *  - Không có field expiresIn trong response.
 */
import client from "../client";
import {
  setTokens,
  setAccessToken,
  clearTokens,
  getAccessToken,
  getRefreshToken,
} from "../session";
import type {
  AuthenticationResponse,
  LoginRequest,
  RefreshTokenResponse,
  RegisterRequest,
  UserResponse,
} from "../types";

export const authApi = {
  async login(credentials: LoginRequest): Promise<void> {
    const res = await client.request<AuthenticationResponse>("/api/auth/login", {
      method: "POST",
      body: credentials,
      skipAuthRetry: true,
    });
    setTokens(res.accessToken, res.refreshToken);
  },

  /** Đăng ký trả về token luôn → đăng nhập luôn, không cần gọi login sau đó. */
  async register(payload: RegisterRequest): Promise<void> {
    const res = await client.request<AuthenticationResponse>("/api/auth/register", {
      method: "POST",
      body: payload,
      skipAuthRetry: true,
    });
    setTokens(res.accessToken, res.refreshToken);
  },

  async refresh(): Promise<void> {
    const rawToken = getRefreshToken();
    if (!rawToken) throw new Error("Không có refresh token");
    const res = await client.request<RefreshTokenResponse>(
      "/api/auth/refresh-token",
      { method: "POST", body: { rawToken }, skipAuthRetry: true },
    );
    setAccessToken(res.accessToken);
  },

  /**
   * Đăng xuất. Backend cần Bearer token để revoke refresh token.
   * Dù thất bại vẫn xoá token cục bộ — nếu không, user bị kẹt ở trạng thái đã đăng nhập giả.
   */
  async logout(): Promise<void> {
    try {
      await client.request<void>("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore — vẫn phải clear phiên cục bộ */
    } finally {
      clearTokens();
    }
  },

  /** Hồ sơ user hiện tại, đọc từ principal trong access token. */
  me(): Promise<UserResponse> {
    return client.request<UserResponse>("/api/users/me");
  },

  /** Đã có token chưa — dùng cho guard nhanh, không cần gọi mạng. */
  hasToken(): boolean {
    return getAccessToken() !== null;
  },
};