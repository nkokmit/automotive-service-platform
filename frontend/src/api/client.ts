/**
 * HTTP client — tầng thấp duy nhất được phép gọi backend.
 *
 * Đặc điểm quan trọng của backend hiện tại:
 *  1. Mọi response được bọc trong `{ code, message, result }` (ApiResponse.java).
 *  2. `code != 0` là lỗi nghiệp vụ **dù HTTP status có thể là 200** → không được
 *     chỉ dựa vào `res.ok`.
 *  3. Access token sống 1h, hết hạn giữa phiên là bình thường → tự refresh và retry.
 *
 * Component KHÔNG được gọi fetch trực tiếp; mọi request đi qua `request()` ở đây.
 */
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  clearTokens,
  isAccessTokenValid,
} from "./session";
import type { ApiEnvelope } from "./types";

export interface ApiError extends Error {
  /** HTTP status (0 nếu lỗi mạng). */
  status?: number;
  /** ErrorCode nghiệp vụ từ ApiResponse.code — dùng để if/sap theo mã. */
  code?: number;
  body?: unknown;
}

/** Đường dẫn refresh — không bọc lại qua chính nó để tránh vòng lặp vô hạn. */
const REFRESH_PATH = "/api/auth/refresh-token";

async function parseBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

function buildError(res: Response, body: unknown): ApiError {
  const data = body as { message?: string; error?: string } | string | null | undefined;
  let message = `HTTP ${res.status}`;
  let code: number | undefined;

  if (data && typeof data === "object") {
    message = data.message || data.error || message;
    if (typeof (data as ApiEnvelope<unknown>).code === "number") {
      code = (data as ApiEnvelope<unknown>).code;
    }
  } else if (typeof data === "string" && data.trim()) {
    message = data;
  }

  const err = new Error(message) as ApiError;
  err.status = res.status;
  err.code = code;
  err.body = body;
  return err;
}

function isApiError(err: unknown): err is ApiError {
  return err instanceof Error && "status" in err;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Form data — khi đó KHÔNG set Content-Type để browser tự thêm boundary. */
  formData?: FormData;
  signal?: AbortSignal;
  /** Bỏ qua auto-refresh (dùng cho chính endpoint refresh / login). */
  skipAuthRetry?: boolean;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const { method = "GET", body, headers = {}, formData, signal } = options;

  const finalHeaders: Record<string, string> = { ...headers };

  let payloadBody: BodyInit | undefined;
  if (formData) {
    payloadBody = formData;
    // KHÔNG set Content-Type — browser tự thêm boundary
  } else if (body !== undefined) {
    payloadBody = JSON.stringify(body);
    if (!("Content-Type" in finalHeaders)) {
      finalHeaders["Content-Type"] = "application/json";
    }
  }

  const token = getAccessToken();
  if (token && !finalHeaders.Authorization) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  return fetch(path, { method, headers: finalHeaders, body: payloadBody, signal });
}

// ── Refresh dùng chung một promise ───────────────────────────────────────────
// Nhiều request cùng 401 sẽ không tạo N lần gọi refresh; tất cả chờ cùng 1 promise.
let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(REFRESH_PATH, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawToken: refreshToken }),
    });
    if (!res.ok) return false;

    const body = (await res.json()) as ApiEnvelope<{ accessToken: string }>;
    if (body.code !== 0 || !body.result?.accessToken) return false;

    setAccessToken(body.result.accessToken);
    return true;
  } catch {
    return false;
  }
}

function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Gọi API tới backend.
 *
 * Tự bóc lớp vỏ `ApiResponse` và trả thẳng `result` cho component, nên component
 * không bao giờ phải viết `res.result`.
 */
export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  // Token đã hết hạn (client đọc được exp) → refresh trước khi gửi, tiết kiệm 1 round-trip.
  if (!options.skipAuthRetry && !isAccessTokenValid()) {
    await refreshOnce();
  }

  let res = await send(path, options);

  // 401 → thử refresh một lần rồi replay request gốc.
  if (res.status === 401 && !options.skipAuthRetry) {
    const refreshed = await refreshOnce();
    if (!refreshed) {
      clearTokens();
      const body = await parseBody(res);
      throw buildError(res, body);
    }
    res = await send(path, options);
  }

  if (res.status === 204) return undefined as T;

  const parsed = await parseBody(res);

  if (!res.ok) {
    throw buildError(res, parsed);
  }

  // Bóc ApiResponse. Endpoint không bọc (ví dụ /actuator) thì trả nguyên body.
  if (parsed && typeof parsed === "object" && "code" in (parsed as object)) {
    const envelope = parsed as ApiEnvelope<T>;
    if (envelope.code !== 0) {
      throw buildError(res, parsed);
    }
    return envelope.result as T;
  }

  return parsed as T;
}

/** GET có phân trang — chuẩn hoá tham số về page/size 0-based của Spring Data. */
export async function requestPage<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
): Promise<T> {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      qs.append(key, String(value));
    }
  }
  const query = qs.toString();
  return request<T>(query ? `${path}?${query}` : path);
}

/** Lỗi mang ErrorCode cụ thể — tiện cho component bắt case 1401/1403. */
export function isAuthError(err: unknown): boolean {
  return isApiError(err) && (err.status === 401 || err.status === 403 || err.code === 1401 || err.code === 1403);
}

const client = { request, requestPage };
export default client;