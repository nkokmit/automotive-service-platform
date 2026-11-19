/**
 * Shape của dịch vụ / phụ tùng sau khi map từ DTO backend về UI.
 *
 * Tách riêng khỏi `catalog.tsx` để `mock.ts` (fallback) và `catalog.tsx`
 * (nguồn thật) dùng chung một khai báo — không tạo vòng import.
 */

/** Một dịch vụ trong catalog, đã chuẩn hoá cho UI. */
export interface CatalogService {
  id: string;
  /** Slug dùng cho URL `/services/:slug` — backend không có, ta tự sinh. */
  slug: string;
  code: string;
  name: string;
  description: string;
  category: string;
  categoryId: string;
  /** Thời lượng (phút). */
  durationMin: number;
  /** Số kỹ thuật viên cần đồng thời. */
  requiredTechs: number;
  /** Giá công chuẩn (chưa gồm phụ tùng). */
  priceFrom: number;
  priceTo: number;
  image: string;
  warrantyMonths: number;
  /** Hạng mục công việc (BOM phụ tùng). */
  includes: string[];
  /** Yêu cầu / lưu ý khi đến xưởng. */
  requirements: string[];
  isPopular: boolean;
  isFeatured: boolean;
  rating: number;
  reviewsCount: number;
  bookingsCount: number;
  /** Backend có cờ `is_active` — dịch vụ đã bị vô hiệu hóa thì không hiện nữa. */
  isActive?: boolean;
}

/** Một phụ tùng trong catalog, đã chuẩn hoá cho UI. */
export interface CatalogPart {
  id: string;
  /** Slug dùng cho URL `/parts/:slug` — backend không có, ta tự sinh. */
  slug: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  categoryId: string;
  unit: string;
  priceVND: number;
  /** Giá gốc (để hiển thị % giảm). */
  originalPriceVND?: number;
  /** Tồn khả dụng = onHandStock - reservedStock. */
  stockQty: number;
  image: string;
  shortDescription: string;
  compatibleCars: string[];
  rating: number;
  reviewsCount: number;
  isFeatured: boolean;
  isBestSeller: boolean;
  /** Backend có cờ `is_active` — phụ tùng đã bị vô hiệu hóa. */
  isActive?: boolean;
}

/** Sinh slug thân thiện từ tên + id (id đảm bảo slug là duy nhất). */
export function makeSlug(name: string, id: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = id.replace(/-/g, "").slice(0, 6);
  return base ? `${base}-${suffix}` : suffix;
}
