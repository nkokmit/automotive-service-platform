/**
 * HTTP client — central fetch wrapper cho toàn bộ frontend.
 *
 * baseURL = "" (rỗng) — để Vite proxy xử lý:
 *   - Trong dev: /api/* -> http://localhost:4000 (xem vite.config.ts)
 *   - Trong prod: Nginx/host tương tự proxy /api -> Gateway
 *
 * Tất cả request tới backend ĐỀU phải đi qua client này.
 * Tuyệt đối KHÔNG gọi fetch trực tiếp ở component.
 */
const STORAGE_KEY = "autocare:auth";

/** Đọc access token từ localStorage (authStore session). */
function readToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { token?: string };
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

export interface ApiError extends Error {
  status?: number;
  body?: unknown;
}

async function parseBody(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

function buildError(res: Response, body: unknown): ApiError {
  const data = body as
    | { message?: string; error?: string }
    | string
    | null
    | undefined;
  let message = `HTTP ${res.status}`;
  if (data && typeof data === "object") {
    message = data.message || data.error || message;
  } else if (typeof data === "string" && data.trim()) {
    message = data;
  }
  const err = new Error(message) as ApiError;
  err.status = res.status;
  err.body = body;
  return err;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Form data — khi đó KHÔNG set Content-Type để browser tự thêm boundary */
  formData?: FormData;
  signal?: AbortSignal;
}

export async function request<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, headers = {}, formData, signal } = options;

  const finalHeaders: Record<string, string> = { ...headers };

  // Body
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

  // Authorization
  const token = readToken();
  if (token && !finalHeaders.Authorization) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(path, {
    method,
    headers: finalHeaders,
    body: payloadBody,
    signal,
  });

  // No content (204)
  if (res.status === 204) return undefined as T;

  const parsed = await parseBody(res);

  if (!res.ok) {
    throw buildError(res, parsed);
  }

  return parsed as T;
}

const client = { request };
export default client;