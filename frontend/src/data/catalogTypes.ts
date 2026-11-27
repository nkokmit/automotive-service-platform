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
  /** Mức tồn tối thiểu — dùng để cảnh báo sắp hết hàng. */
  minStockLevel?: number;
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

/**
 * Mô tả dựng sẵn theo nhóm dịch vụ — dùng khi admin CHƯA nhập mô tả.
 *
 * <p>Đặt ở đây (thay vì `catalog.tsx`) vì `search.ts` cũng dùng và phải tránh
 * import vòng.
 */
const CATEGORY_DESCRIPTION: Record<string, string> = {
  "Bảo dưỡng": "Bảo dưỡng định kỳ theo khuyến cáo của nhà sản xuất xe.",
  "Sửa chữa": "Sửa chữa, khắc phục hư hỏng kỹ thuật bằng linh kiện chính hãng.",
  "Sơn & thân vỏ": "Sơn, đánh bóng và phục hồi thân vỏ trong phòng sơn kín.",
  "Điện - Điều hòa": "Chăm sóc hệ thống điện, ắc quy và điều hòa.",
  "Lốp & phanh": "Thay lốp, kiểm tra hệ thống phanh và cân chỉnh độ chụm.",
};

/** Mô tả fallback theo nhóm dịch vụ. */
export function fallbackDescription(categoryName: string): string {
  return (
    CATEGORY_DESCRIPTION[categoryName] ??
    "Dịch vụ chuyên nghiệp tại AutoCare Workshop, thực hiện bởi kỹ thuật viên có thâm niên."
  );
}

/**
 * Mô tả để HIỂN THỊ cho khách.
 *
 * <p>Ưu tiên mô tả thật do admin nhập; khi rỗng thì dựng từ nhóm dịch vụ +
 * thông tin thời lượng / số kỹ thuật viên.
 */
export function displayDescription(service: CatalogService): string {
  const real = service.description?.trim();
  if (real) return real;
  return (
    `${fallbackDescription(service.category)} ` +
    `Thời gian dự kiến ${service.durationMin} phút ` +
    `với ${service.requiredTechs} kỹ thuật viên.`
  );
}
