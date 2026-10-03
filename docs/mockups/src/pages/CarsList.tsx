import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IconSearch,
  IconStar,
  IconMapPin,
  IconCar,
  IconClose,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Input from "../components/Input";
import { SkeletonGrid, FullPageSpinner } from "../components/Loading";
import { useToast } from "../components/Toast";
import { cars, type Car } from "../data/mock";

// ===== Helpers =====
const compactVND = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "tr";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
};

const fullVND = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + " đ";

const formatOdo = (km: number) => km.toLocaleString("vi-VN") + " km";

// ===== Filter options (derived từ mock data) =====
const allBrands = Array.from(new Set(cars.map((c) => c.brand))).sort();
const allBodyTypes = Array.from(new Set(cars.map((c) => c.bodyType))).sort();
const allFuelTypes = Array.from(new Set(cars.map((c) => c.fuelType))).sort();
const allCities = Array.from(new Set(cars.map((c) => c.city))).sort();
const allTransmissions = Array.from(
  new Set(cars.map((c) => c.transmission)),
).sort();

// Year range từ data
const minYear = Math.min(...cars.map((c) => c.year));
const maxYear = Math.max(...cars.map((c) => c.year));

// Price range từ data
const minPrice = Math.min(...cars.map((c) => c.priceVND));
const maxPrice = Math.max(...cars.map((c) => c.priceVND));

// Bước nhảy cho price slider (50 triệu)
const PRICE_STEP = 50_000_000;

// ===== Sort options =====
const sortOptions = [
  { id: "newest", label: "Mới nhất" },
  { id: "price-asc", label: "Giá tăng dần" },
  { id: "price-desc", label: "Giá giảm dần" },
  { id: "year-desc", label: "Năm mới nhất" },
  { id: "odo-asc", label: "ODO thấp nhất" },
  { id: "rating", label: "Đánh giá cao nhất" },
] as const;

type SortId = (typeof sortOptions)[number]["id"];

// ===== Main component =====
export default function CarsList() {
  const [params, setParams] = useSearchParams();
  const t = useToast();

  // Filter state
  const [filters, setFilters] = useState({
    brand: "Tất cả" as string,
    bodyType: "Tất cả" as string,
    fuelType: "Tất cả" as string,
    transmission: "Tất cả" as string,
    city: "Tất cả" as string,
    sellerType: "Tất cả" as "Tất cả" | Car["seller"]["type"],
    maxPrice: maxPrice,
    minYear: minYear,
  });
  const [sort, setSort] = useState<SortId>("newest");
  const [query, setQuery] = useState("");

  // Loading state (giả lập API call)
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(id);
  }, []);

  // Đọc ?brand= từ URL
  useEffect(() => {
    const brand = params.get("brand");
    if (brand && allBrands.includes(brand)) {
      setFilters((f) => ({ ...f, brand }));
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    let result = cars.filter((c) => {
      if (filters.brand !== "Tất cả" && c.brand !== filters.brand) return false;
      if (filters.bodyType !== "Tất cả" && c.bodyType !== filters.bodyType)
        return false;
      if (filters.fuelType !== "Tất cả" && c.fuelType !== filters.fuelType)
        return false;
      if (
        filters.transmission !== "Tất cả" &&
        c.transmission !== filters.transmission
      )
        return false;
      if (filters.city !== "Tất cả" && c.city !== filters.city) return false;
      if (
        filters.sellerType !== "Tất cả" &&
        c.seller.type !== filters.sellerType
      )
        return false;
      if (c.priceVND > filters.maxPrice) return false;
      if (c.year < filters.minYear) return false;
      if (
        query &&
        !`${c.title} ${c.brand} ${c.model} ${c.city} ${c.seller.name}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return true;
    });

    switch (sort) {
      case "price-asc":
        result = [...result].sort((a, b) => a.priceVND - b.priceVND);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.priceVND - a.priceVND);
        break;
      case "year-desc":
        result = [...result].sort((a, b) => b.year - a.year);
        break;
      case "odo-asc":
        result = [...result].sort((a, b) => a.odoKm - b.odoKm);
        break;
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      default:
        // newest: ưu tiên isNew + year desc
        result = [...result].sort((a, b) => {
          if (a.isNew && !b.isNew) return -1;
          if (!a.isNew && b.isNew) return 1;
          return b.year - a.year;
        });
    }
    return result;
  }, [filters, sort, query]);

  const resetFilters = () => {
    setFilters({
      brand: "Tất cả",
      bodyType: "Tất cả",
      fuelType: "Tất cả",
      transmission: "Tất cả",
      city: "Tất cả",
      sellerType: "Tất cả",
      maxPrice,
      minYear,
    });
    setQuery("");
    t.info("Đã xoá tất cả bộ lọc");
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.brand !== "Tất cả") count++;
    if (filters.bodyType !== "Tất cả") count++;
    if (filters.fuelType !== "Tất cả") count++;
    if (filters.transmission !== "Tất cả") count++;
    if (filters.city !== "Tất cả") count++;
    if (filters.sellerType !== "Tất cả") count++;
    if (filters.maxPrice < maxPrice) count++;
    if (filters.minYear > minYear) count++;
    if (query) count++;
    return count;
  }, [filters, query]);

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-ink">Mua bán xe</span>
      </nav>

      <div className="mb-6">
        <Badge tone="primary" className="mb-2">
          <IconCar size={14} /> Mua bán xe
        </Badge>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Xe ô tô cũ &amp; mới — đăng bán bởi cá nhân &amp; salon
        </h1>
        <p className="text-ink-light">
          {loading ? (
            <span className="inline-block w-48 h-4 bg-bgsoft rounded animate-pulse" />
          ) : (
            <>
              <strong className="text-ink">{filtered.length}</strong> / {cars.length}{" "}
              xe phù hợp — đăng ký miễn phí để liên hệ người bán
            </>
          )}
        </p>
      </div>

      {/* Top bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm theo tên xe, hãng, thành phố, người bán..."
            leftIcon={<IconSearch size={18} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm font-medium"
            aria-label="Sắp xếp"
          >
            {sortOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Filter sidebar */}
        <aside className="space-y-6">
          {/* Active filter count */}
          {activeFilterCount > 0 && (
            <div className="bg-bgsoft/60 border border-ink/8 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm">
                <strong className="text-primary">{activeFilterCount}</strong>{" "}
                bộ lọc đang áp dụng
              </span>
              <button
                onClick={resetFilters}
                className="text-xs text-primary hover:underline font-medium"
              >
                Xoá hết
              </button>
            </div>
          )}

          <FilterSection title="Hãng xe">
            {["Tất cả", ...allBrands].map((b) => (
              <button
                key={b}
                onClick={() => setFilters({ ...filters, brand: b })}
                className={[
                  "flex items-center justify-between w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors",
                  filters.brand === b
                    ? "bg-bgsoft text-primary font-medium"
                    : "text-ink hover:bg-bgsoft",
                ].join(" ")}
              >
                {b}
                <span className="text-xs text-ink-muted">
                  {b === "Tất cả"
                    ? cars.length
                    : cars.filter((c) => c.brand === b).length}
                </span>
              </button>
            ))}
          </FilterSection>

          <FilterSection title="Loại xe">
            {["Tất cả", ...allBodyTypes].map((b) => (
              <button
                key={b}
                onClick={() => setFilters({ ...filters, bodyType: b })}
                className={[
                  "flex items-center justify-between w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors",
                  filters.bodyType === b
                    ? "bg-bgsoft text-primary font-medium"
                    : "text-ink hover:bg-bgsoft",
                ].join(" ")}
              >
                {b}
                <span className="text-xs text-ink-muted">
                  {b === "Tất cả"
                    ? cars.length
                    : cars.filter((c) => c.bodyType === b).length}
                </span>
              </button>
            ))}
          </FilterSection>

          <FilterSection title="Nhiên liệu">
            <div className="flex flex-wrap gap-1.5">
              {["Tất cả", ...allFuelTypes].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilters({ ...filters, fuelType: f })}
                  className={[
                    "px-3 h-8 rounded-full text-xs font-medium border transition-colors",
                    filters.fuelType === f
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-ink border-ink/15 hover:border-ink/30",
                  ].join(" ")}
                >
                  {f}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Hộp số">
            <div className="flex flex-wrap gap-1.5">
              {["Tất cả", ...allTransmissions].map((tr) => (
                <button
                  key={tr}
                  onClick={() => setFilters({ ...filters, transmission: tr })}
                  className={[
                    "px-3 h-8 rounded-full text-xs font-medium border transition-colors",
                    filters.transmission === tr
                      ? "bg-primary text-white border-primary"
                      : "bg-white text-ink border-ink/15 hover:border-ink/30",
                  ].join(" ")}
                >
                  {tr}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Khu vực">
            {["Tất cả", ...allCities].map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 text-sm py-1 cursor-pointer"
              >
                <input
                  type="radio"
                  name="city"
                  checked={filters.city === c}
                  onChange={() => setFilters({ ...filters, city: c })}
                  className="accent-primary"
                />
                {c}
              </label>
            ))}
          </FilterSection>

          <FilterSection title="Loại người bán">
            {(["Tất cả", "Cá nhân", "Salon"] as const).map((s) => (
              <label
                key={s}
                className="flex items-center gap-2 text-sm py-1 cursor-pointer"
              >
                <input
                  type="radio"
                  name="sellerType"
                  checked={filters.sellerType === s}
                  onChange={() => setFilters({ ...filters, sellerType: s })}
                  className="accent-primary"
                />
                {s}
              </label>
            ))}
          </FilterSection>

          <FilterSection title="Năm sản xuất (từ)">
            <div className="text-sm font-medium text-primary mb-2">
              Từ năm {filters.minYear}
            </div>
            <input
              type="range"
              min={minYear}
              max={maxYear}
              step={1}
              value={filters.minYear}
              onChange={(e) =>
                setFilters({ ...filters, minYear: Number(e.target.value) })
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-ink-muted mt-1">
              <span>{minYear}</span>
              <span>{maxYear}</span>
            </div>
          </FilterSection>

          <FilterSection title="Giá tối đa">
            <div className="text-sm font-medium text-primary mb-2">
              {fullVND(filters.maxPrice)}
            </div>
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              step={PRICE_STEP}
              value={filters.maxPrice}
              onChange={(e) =>
                setFilters({ ...filters, maxPrice: Number(e.target.value) })
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-ink-muted mt-1">
              <span>{compactVND(minPrice)}</span>
              <span>{compactVND(maxPrice)}</span>
            </div>
          </FilterSection>

          <Button variant="outline" fullWidth onClick={resetFilters}>
            Xoá bộ lọc
          </Button>
        </aside>

        {/* Results */}
        <div>
          {loading ? (
            <SkeletonGrid count={6} lines={3} />
          ) : filtered.length === 0 ? (
            <EmptyState onReset={resetFilters} />
          ) : (
            <>
              {/* Toolbar trên cùng (mobile) — quick sort chips */}
              <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-2 -mx-4 px-4">
                {allBrands.slice(0, 6).map((b) => (
                  <button
                    key={b}
                    onClick={() => setFilters({ ...filters, brand: b })}
                    className={[
                      "shrink-0 px-3 h-9 rounded-full text-sm font-medium border transition-colors",
                      filters.brand === b
                        ? "bg-primary text-white border-primary"
                        : "bg-white text-ink border-ink/15",
                    ].join(" ")}
                  >
                    {b}
                  </button>
                ))}
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {filtered.map((car) => (
                  <CarCard key={car.id} car={car} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Subcomponents =====
function CarCard({ car }: { car: Car }) {
  return (
    <Link to={`/cars/${car.slug}`} className="group block h-full">
      <Card className="h-full flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-bgsoft">
          <img
            src={car.image}
            alt={car.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-2 left-2 flex gap-1">
            {car.isNew && <Badge tone="primary">Mới</Badge>}
            {car.isFeatured && <Badge tone="accent">Nổi bật</Badge>}
          </div>
          <div className="absolute top-2 right-2">
            <Badge tone="default" className="bg-white/90 backdrop-blur">
              {car.bodyType}
            </Badge>
          </div>
        </div>
        <div className="p-4 flex flex-col flex-1">
          <h3 className="font-semibold leading-tight mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
            {car.title}
          </h3>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted mb-3">
            <span>{car.year}</span>
            <span>•</span>
            <span>{formatOdo(car.odoKm)}</span>
            <span>•</span>
            <span>{car.transmission}</span>
            <span>•</span>
            <span>{car.fuelType}</span>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {car.features.slice(0, 2).map((f) => (
              <span
                key={f}
                className="text-[11px] px-2 py-0.5 bg-bgsoft/70 text-ink-light rounded-md"
              >
                {f}
              </span>
            ))}
            {car.features.length > 2 && (
              <span className="text-[11px] px-2 py-0.5 text-ink-muted">
                +{car.features.length - 2}
              </span>
            )}
          </div>

          <div className="mt-auto flex items-end justify-between gap-2 pt-3 border-t border-ink/8">
            <div>
              <div className="text-primary font-bold text-lg">
                {compactVND(car.priceVND)}
              </div>
              <div className="text-xs text-ink-muted flex items-center gap-1">
                <IconMapPin size={12} /> {car.city}
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end text-xs">
                <IconStar size={14} className="text-accent-hover" />
                <span className="font-semibold">{car.rating}</span>
              </div>
              <div className="text-[11px] text-ink-muted">
                {car.seller.name}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="font-semibold mb-3 text-sm">{title}</h4>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Card>
      <div className="p-10 text-center">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
          <IconCar size={32} className="text-ink-muted" />
        </div>
        <p className="font-semibold text-lg mb-1">Không tìm thấy xe phù hợp</p>
        <p className="text-sm text-ink-light mb-5 max-w-sm mx-auto">
          Thử điều chỉnh bộ lọc hoặc xoá bộ lọc để xem tất cả{" "}
          {cars.length} xe đang đăng bán.
        </p>
        <Button variant="outline" onClick={onReset}>
          <IconClose size={16} /> Xoá bộ lọc
        </Button>
      </div>
    </Card>
  );
}