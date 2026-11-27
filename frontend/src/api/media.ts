/**
 * Helper xử lý URL ảnh từ backend.
 *
 * Bài viết tin tức lưu URL ảnh theo dạng đường dẫn tương đối
 * (`/api/news-images/<file>`) vì gateway phục vụ ảnh trên cùng origin với
 * API. Ở chế độ dev, Vite proxy `/api` → API Gateway nên URL tương đối chạy
 * đúng. Khi deploy production, nếu frontend và API khác origin, đặt biến môi
 * trường `VITE_API_BASE_URL` (vd: `https://api.example.com`) để ghép origin.
 */

/** Origin API — rỗng nếu frontend và API cùng origin (hoặc chạy qua proxy). */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

/**
 * Trả về URL hiển thị được cho ảnh.
 *
 * @param url URL ảnh từ backend (tương đối hoặc tuyệt đối)
 * @returns URL dùng cho thuộc tính `src` của thẻ `<img>`
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return "";
  // URL tuyệt đối (http/https/data) → giữ nguyên.
  if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) {
    return url;
  }
  if (!url.startsWith("/")) {
    return url;
  }
  return API_BASE_URL ? `${API_BASE_URL}${url}` : url;
}
