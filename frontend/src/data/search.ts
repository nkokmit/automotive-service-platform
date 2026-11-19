/**
 * Tìm kiếm toàn site — dịch vụ + phụ tùng (catalog thật) và xe + tin tức (mock).
 *
 * Hàm ở đây thuần ký (pure) nên dễ test và dùng được ở cả trang /search lẫn
 * ô tìm kiếm trong Header (gợi ý tức thì).
 */
import { articles, cars, type Article, type Car } from "./mock";
import type { CatalogPart, CatalogService } from "./catalogTypes";

export type SearchKind = "service" | "part" | "car" | "article";

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
  part: "Phụ tùng",
  car: "Xe",
  article: "Tin tức",
};

export const SEARCH_KIND_ICON: Record<SearchKind, string> = {
  service: "🔧",
  part: "📦",
  car: "🚗",
  article: "📰",
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
  parts: CatalogPart[];
  cars: Car[];
  articles: Article[];
}

export interface SearchOptions {
  services: CatalogService[];
  parts: CatalogPart[];
  /** Bỏ qua xe/tin tức khi gọi gợi ý tức thì (tiết kiệm CPU). */
  includeCarsAndArticles?: boolean;
}

export function searchAll(query: string, options: SearchOptions): SearchResultGroups {
  const { services, parts, includeCarsAndArticles = true } = options;

  const serviceHits = services.filter((s) =>
    matchQuery([s.name, s.category, s.description, s.code], query),
  );
  const partHits = parts.filter((p) =>
    matchQuery(
      [p.name, p.brand, p.category, p.sku, p.shortDescription],
      query,
    ),
  );
  const carHits = includeCarsAndArticles
    ? cars.filter((c) =>
        matchQuery(
          [c.title, c.brand, c.model, c.bodyType, c.fuelType, c.city],
          query,
        ),
      )
    : [];
  const articleHits = includeCarsAndArticles
    ? articles.filter((a) =>
        matchQuery(
          [a.title, a.excerpt, a.category, ...(a.tags ?? [])],
          query,
        ),
      )
    : [];

  return {
    services: serviceHits,
    parts: partHits,
    cars: carHits,
    articles: articleHits,
  };
}

/** Gợi ý tức thì — gộp các nhóm thành danh sách phẳng, giới hạn `limit`. */
export function suggest(query: string, options: SearchOptions, limit = 6): SearchHit[] {
  const groups = searchAll(query, options);
  const hits: SearchHit[] = [
    ...groups.services.map(
      (s): SearchHit => ({
        id: s.id,
        kind: "service",
        title: s.name,
        subtitle: `${s.category} · ${s.durationMin} phút`,
        to: `/services/${s.slug}`,
        image: s.image,
        priceVND: s.priceFrom,
      }),
    ),
    ...groups.parts.map(
      (p): SearchHit => ({
        id: p.id,
        kind: "part",
        title: p.name,
        subtitle: `${p.brand} · ${p.category}`,
        to: `/parts/${p.slug}`,
        image: p.image,
        priceVND: p.priceVND,
      }),
    ),
    ...groups.cars.map(
      (c): SearchHit => ({
        id: c.id,
        kind: "car",
        title: c.title,
        subtitle: `${c.year} · ${c.city}`,
        to: `/cars/${c.slug}`,
        image: c.image,
        priceVND: c.priceVND,
      }),
    ),
    ...groups.articles.map(
      (a): SearchHit => ({
        id: a.id,
        kind: "article",
        title: a.title,
        subtitle: `${a.category} · ${a.readMinutes} phút đọc`,
        to: `/news/${a.slug}`,
        image: a.image,
      }),
    ),
  ];
  return hits.slice(0, limit);
}

export function countHits(groups: SearchResultGroups): number {
  return (
    groups.services.length +
    groups.parts.length +
    groups.cars.length +
    groups.articles.length
  );
}
