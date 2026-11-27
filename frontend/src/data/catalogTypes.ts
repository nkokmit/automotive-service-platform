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

/** Bỏ hậu tố id 6 ký tự mà `makeSlug` gắn vào slug thật. */
function slugBase(slug: string): string {
  return slug.replace(/-[a-f0-9]{6}$/i, "");
}

/**
 * Tìm dịch vụ theo slug trong URL — chịu được việc slug mẫu ≠ slug thật.
 *
 * <p>Slug thật do backend sinh: `{tên-slug}-{6 ký tự đầu id}`. Slug trong dữ
 * liệu mẫu (`data/mock.ts`) thì trần, không có hậu tố, và TÊN KHÁC (dữ liệu mẫu
 * là "Thay dầu động cơ", dữ liệu thật là "Thay dau dong").
 *
 * <p>Khách xem trang dịch vụ lúc CHƯA đăng nhập sẽ có URL chứa slug mẫu. Sau
 * khi đăng nhập, catalog đổi sang dữ liệu thật → URL đó không còn khớp
 * chính xác. Vì vậy cần khớp "mềm": so slug gốc, và nếu một slug là tiền tố
 * của slug kia thì coi như cùng một dịch vụ (slug mẫu thường DÀI hơn vì
 * tên đầy đủ hơn — VD `thay-dau-dong-co` vs `thay-dau-dong-c4dfea`).
 *
 * @param services danh sách dịch vụ hiện có (thật hoặc mẫu)
 * @param slug slug lấy từ URL
 */
export function findServiceBySlug(
  services: CatalogService[],
  slug: string,
): CatalogService | null {
  const exact = services.find((s) => s.slug === slug);
  if (exact) return exact;

  const wanted = slugBase(slug);
  const sameBase = services.find((s) => slugBase(s.slug) === wanted);
  if (sameBase) return sameBase;

  // Slug mẫu là tiền tố của slug thật (hoặc ngược lại).
  const prefix = services.find(
    (s) => slugBase(s.slug).startsWith(wanted) || wanted.startsWith(slugBase(s.slug)),
  );
  return prefix ?? null;
}

/**
 * Trả về URL `/services/{slug}` đúng cho dịch vụ tương ứng với `slug` đã cho.
 *
 * <p>Dùng sau khi đăng nhập: URL cũ có slug mẫu cần được đổi sang slug thật
 * để không rơi vào trang 404. Trả về `null` khi không khớp được.
 */
export function resolveServiceSlug(
  services: CatalogService[],
  slug: string,
): string | null {
  return findServiceBySlug(services, slug)?.slug ?? null;
}
