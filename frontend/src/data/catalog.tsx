/**
 * Catalog dùng chung cho toàn bộ web: dịch vụ + phụ tùng.
 *
 * Nguồn dữ liệu chính là API thật:
 *   - `GET /api/services` + `GET /api/service-categories` (inventory-service)
 *   - `GET /api/parts`    + `GET /api/part-categories`    (inventory-service)
 *
 * Nếu API lỗi (chưa bật backend, chưa cấp quyền, mạng hỏng…) thì module tự
 * động rơi về dữ liệu mẫu trong `mock.ts` để web vẫn dùng được, kèm cờ
 * `usingFallback` để UI có thể hiển thị cảnh báo.
 *
 * Web phục vụ MỘT xưởng duy nhất (AutoCare Workshop) nên các trường kiểu
 * `provider.city` / `provider.rating` đã bị gỡ khỏi mô hình dịch vụ —
 * thông tin xưởng lấy từ `config/garage.ts`.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { inventoryApi } from "../api/endpoints/inventory";
import type {
  CategoryResponse,
  PartResponse,
  ServiceResponse,
} from "../api/types";
import { GARAGE, SERVICE_IMAGE_FALLBACK, partImageFor } from "../config/garage";
import { mockParts, mockServices } from "./mock";
import { registerCatalogParts } from "./cartStore";
import {
  makeSlug,
  type CatalogPart,
  type CatalogService,
} from "./catalogTypes";

export type { CatalogPart, CatalogService };

export interface CatalogState {
  services: CatalogService[];
  parts: CatalogPart[];
  serviceCategories: CategoryResponse[];
  partCategories: CategoryResponse[];
  loading: boolean;
  error: string | null;
  /** true khi rơi về dữ liệu mẫu vì API lỗi. */
  usingFallback: boolean;
  reload: () => void;
}

// =========================
// Mapping: DTO → UI model
// =========================

/** Mô tả dịch vụ mặc định theo nhóm — backend `services` chưa có cột mô tả. */
const CATEGORY_DESCRIPTION: Record<string, string> = {
  "Bảo dưỡng": "Bảo dưỡng định kỳ theo khuyến cáo của nhà sản xuất xe.",
  "Sửa chữa": "Sửa chữa, khắc phục hư hỏng kỹ thuật bằng linh kiện chính hãng.",
  "Sơn & thân vỏ": "Sơn, đánh bóng và phục hồi thân vỏ trong phòng sơn kín.",
  "Điện - Điều hòa": "Chăm sóc hệ thống điện, ắc quy và điều hòa.",
  "Lốp & phanh": "Thay lốp, kiểm tra hệ thống phanh và cân chỉnh độ chụm.",
};

function describeService(dto: ServiceResponse): string {
  const base =
    CATEGORY_DESCRIPTION[dto.categoryName] ??
    "Dịch vụ chuyên nghiệp tại AutoCare Workshop, thực hiện bởi kỹ thuật viên có thâm niên.";
  return `${base} Thời gian dự kiến ${dto.duration_minutes} phút với ${dto.required_techs} kỹ thuật viên.`;
}

export function mapService(dto: ServiceResponse): CatalogService {
  const price = Number(dto.baseLaborPrice ?? 0);
  return {
    id: dto.id,
    slug: makeSlug(dto.name, dto.id),
    code: dto.code,
    name: dto.name,
    description: describeService(dto),
    category: dto.categoryName,
    categoryId: dto.categoryId,
    durationMin: dto.duration_minutes ?? 30,
    requiredTechs: dto.required_techs ?? 1,
    priceFrom: price,
    priceTo: price,
    image: SERVICE_IMAGE_FALLBACK,
    warrantyMonths: 3,
    includes: [],
    requirements: [],
    // Backend chưa có cờ nổi bật / phổ biến → tự suy ra để UI không rỗng.
    isPopular: true,
    isFeatured: true,
    rating: 0,
    reviewsCount: 0,
    bookingsCount: 0,
  };
}

export function mapPart(dto: PartResponse): CatalogPart {
  const selling = Number(dto.sellingPrice ?? 0);
  const cost = Number(dto.costPrice ?? 0);
  // Giá vốn chỉ dùng làm "giá gốc" khi cao hơn giá bán (tức đang giảm giá).
  const hasDiscount = cost > selling && selling > 0;
  return {
    id: dto.id,
    slug: makeSlug(dto.name, dto.id),
    sku: dto.sku,
    name: dto.name,
    brand: dto.brand ?? "OEM",
    category: dto.categoryName,
    categoryId: dto.categoryId,
    unit: dto.unit,
    priceVND: selling,
    originalPriceVND: hasDiscount ? cost : undefined,
    stockQty: dto.availableStock ?? dto.onHandStock ?? 0,
    image: partImageFor(dto.categoryName),
    shortDescription: dto.oemCode
      ? `Mã OEM ${dto.oemCode}. Đơn vị: ${dto.unit}.`
      : `Phụ tùng chính hãng. Đơn vị: ${dto.unit}.`,
    compatibleCars: [],
    rating: 0,
    reviewsCount: 0,
    isFeatured: false,
    isBestSeller: false,
  };
}

// =========================
// Provider
// =========================

const CatalogContext = createContext<CatalogState | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [services, setServices] = useState<CatalogService[]>(mockServices);
  const [parts, setParts] = useState<CatalogPart[]>(mockParts);
  const [serviceCategories, setServiceCategories] = useState<CategoryResponse[]>(
    [],
  );
  const [partCategories, setPartCategories] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  // Đăng ký phụ tùng đang hiển thị cho cartStore để giỏ hàng tra cứu được
  // tên/giá khi catalog là dữ liệu thật từ inventory-service.
  useEffect(() => {
    registerCatalogParts(parts);
  }, [parts]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const [svcRes, partRes, svcCatRes, partCatRes] = await Promise.all([
          inventoryApi.listServices({ isActive: true, size: 100 }),
          inventoryApi.listParts({ isActive: true, size: 100 }),
          inventoryApi.listServiceCategories({ size: 100 }),
          inventoryApi.listPartCategories({ size: 100 }),
        ]);
        if (cancelled) return;

        const mappedServices = svcRes.items.map(mapService);
        const mappedParts = partRes.items.map(mapPart);

        setServices(mappedServices.length > 0 ? mappedServices : mockServices);
        setParts(mappedParts.length > 0 ? mappedParts : mockParts);
        setServiceCategories(svcCatRes.items ?? []);
        setPartCategories(partCatRes.items ?? []);
        setError(null);
        setUsingFallback(false);
      } catch (err) {
        if (cancelled) return;
        // Rơi về dữ liệu mẫu — web vẫn hiển thị được, chỉ mất dữ liệu thật.
        setError(
          err instanceof Error ? err.message : "Không tải được catalog từ máy chủ",
        );
        setUsingFallback(true);
        setServices(mockServices);
        setParts(mockParts);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const value = useMemo<CatalogState>(
    () => ({
      services,
      parts,
      serviceCategories,
      partCategories,
      loading,
      error,
      usingFallback,
      reload,
    }),
    [
      services,
      parts,
      serviceCategories,
      partCategories,
      loading,
      error,
      usingFallback,
      reload,
    ],
  );

  return (
    <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
  );
}

/** Hook đọc catalog. Bọc trong `CatalogProvider` (xem `App.tsx`). */
export function useCatalog(): CatalogState {
  const ctx = useContext(CatalogContext);
  if (!ctx) {
    throw new Error("useCatalog phải nằm trong <CatalogProvider>");
  }
  return ctx;
}

/** Danh mục dịch vụ để hiển thị bộ lọc — "Tất cả" + danh sách nhóm thật. */
export function useServiceCategoryOptions(): string[] {
  const { services, serviceCategories } = useCatalog();
  return useMemo(() => {
    const names = new Set<string>();
    for (const c of serviceCategories) names.add(c.name);
    for (const s of services) names.add(s.category);
    return ["Tất cả", ...Array.from(names).filter(Boolean).sort()];
  }, [services, serviceCategories]);
}

/** Danh mục phụ tùng để hiển thị bộ lọc. */
export function usePartCategoryOptions(): string[] {
  const { parts, partCategories } = useCatalog();
  return useMemo(() => {
    const names = new Set<string>();
    for (const c of partCategories) names.add(c.name);
    for (const p of parts) names.add(p.category);
    return ["Tất cả", ...Array.from(names).filter(Boolean).sort()];
  }, [parts, partCategories]);
}

/** Thương hiệu phụ tùng đang có trong catalog. */
export function usePartBrands(): string[] {
  const { parts } = useCatalog();
  return useMemo(
    () => Array.from(new Set(parts.map((p) => p.brand).filter(Boolean))).sort(),
    [parts],
  );
}

export { GARAGE };
