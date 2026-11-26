/**
 * Chuẩn hoá link trả về từ AI service.
 *
 * Backend `damage-detection-service` / `agent-service` vẫn sinh link tới các
 * trang storefront đã bị gỡ (`/parts/...`, `/cars/...`). Vì storefront không
 * còn tồn tại, ta chuyển hướng các link đó về trang dịch vụ để người dùng
 * vẫn tìm được nơi đặt lịch cho linh kiện được AI gợi ý.
 */

/** Link storefront đã bị gỡ → trang đặt lịch sửa chữa. */
const REMOVED_STOREFRONT_PREFIXES = ["/parts", "/cars", "/news"];

export function normalizeAiLink(link: string | undefined | null): string {
  if (!link) return "/services";
  const trimmed = link.trim();
  if (!trimmed) return "/services";

  const isRemoved = REMOVED_STOREFRONT_PREFIXES.some(
    (prefix) => trimmed === prefix || trimmed.startsWith(`${prefix}/`),
  );
  if (isRemoved) return "/services";

  return trimmed;
}
