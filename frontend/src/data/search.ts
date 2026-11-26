/**
 * Tìm kiếm toàn site — chỉ dịch vụ (catalog thật từ inventory-service).
 *
 * Phụ tùng không còn trang storefront riêng (đã gỡ `/parts`) nên chỉ xuất
 * hiện trong kết quả tìm kiếm dưới dạng "phụ tùng đi kèm" của từng dịch vụ
 * (xem `GET /api/services/{id}/bom` trong `ServiceDetail.tsx`).
 *
 * Hàm ở đây thuần ký (pure) nên dễ test và dùng được ở cả trang /search lẫn
 * ô tìm kiếm trong Header (gợi ý tức thì).
 */
import type { CatalogService } from "./catalogTypes";

export type SearchKind = "service";

export interface SearchHit {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle: string;
  to: string;
  image?: string;
  priceVND?: number;
}

export const SEARCH_KIND_LABEL: Record<SearchKind, string> = {
  service: "Dịch vụ",
};

export const SEARCH_KIND_ICON: Record<SearchKind, string> = {
  service: "🔧",
};

/** Bỏ dấu + lowercase để so khớp không phân biệt tiếng Việt. */
export function foldText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

/**
 * Khớp chuỗi: mọi từ khoá trong query đều phải xuất hiện trong một trong các
 * trường được đưa vào. Nhờ vậy "thay dau vios" vẫn ra kết quả.
 */
export function matchQuery(fields: (string | null | undefined)[], query: string): boolean {
  const tokens = foldText(query).trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const haystack = fields
    .filter((f): f is string => typeof f === "string" && f.length > 0)
    .map(foldText);
  return tokens.every((token) => haystack.some((h) => h.includes(token)));
}

export interface SearchResultGroups {
  services: CatalogService[];
}

export interface SearchOptions {
  services: CatalogService[];
}

export function searchAll(query: string, options: SearchOptions): SearchResultGroups {
  const { services } = options;

  const serviceHits = services.filter((s) =>
    matchQuery([s.name, s.category, s.description, s.code], query),
  );

  return { services: serviceHits };
}

/** Gợi ý tức thì — gộp các nhóm thành danh sách phẳng, giới hạn `limit`. */
export function suggest(query: string, options: SearchOptions, limit = 6): SearchHit[] {
  const groups = searchAll(query, options);
  return groups.services.slice(0, limit).map(
    (s): SearchHit => ({
      id: s.id,
      kind: "service",
      title: s.name,
      subtitle: `${s.category} · ${s.durationMin} phút`,
      to: `/services/${s.slug}`,
      image: s.image,
      priceVND: s.priceFrom,
    }),
  );
}

export function countHits(groups: SearchResultGroups): number {
  return groups.services.length;
}
