import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IconSearch,
  IconStar,
  IconClock,
  IconWrench,
  IconMapPin,
  IconCheck,
  IconCalendar,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Input from "../components/Input";
import { services } from "../data/mock";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + "đ";

const categories = [
  "Tất cả",
  "Bảo dưỡng",
  "Sửa chữa",
  "Sơn & thân vỏ",
  "Điện - Điều hòa",
  "Lốp & phanh",
] as const;

const sortOptions = [
  { id: "popular", label: "Phổ biến nhất" },
  { id: "price-asc", label: "Giá tăng dần" },
  { id: "price-desc", label: "Giá giảm dần" },
  { id: "duration-asc", label: "Thời gian ngắn nhất" },
  { id: "rating", label: "Đánh giá cao nhất" },
] as const;

type SortId = (typeof sortOptions)[number]["id"];

export default function ServicesList() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({
    category: "Tất cả" as (typeof categories)[number],
    city: "Tất cả",
    maxPrice: 15000000,
  });
  const [sort, setSort] = useState<SortId>("popular");
  const [query, setQuery] = useState("");

  // Đọc ?category=... từ URL (khi click từ Home hoặc service card)
  useEffect(() => {
    const cat = params.get("category");
    if (cat && (categories as readonly string[]).includes(cat)) {
      setFilters((f) => ({ ...f, category: cat as typeof categories[number] }));
    }
  }, [params]);

  const filtered = useMemo(() => {
    let result = services.filter((s) => {
      if (
        filters.category !== "Tất cả" &&
        s.category !== filters.category
      )
        return false;
      if (filters.city !== "Tất cả" && s.provider.city !== filters.city)
        return false;
      if (s.priceFrom > filters.maxPrice) return false;
      if (
        query &&
        !`${s.name} ${s.description} ${s.provider.name}`
          .toLowerCase()
          .includes(query.toLowerCase())
      )
        return false;
      return true;
    });

    switch (sort) {
      case "price-asc":
        result = [...result].sort((a, b) => a.priceFrom - b.priceFrom);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.priceFrom - a.priceFrom);
        break;
      case "duration-asc":
        result = [...result].sort(
          (a, b) => a.durationMin - b.durationMin
        );
        break;
      case "rating":
        result = [...result].sort((a, b) => b.rating - a.rating);
        break;
      default:
        result = [...result].sort(
          (a, b) => b.bookingsCount - a.bookingsCount
        );
    }
    return result;
  }, [filters, sort, query]);

  const cities = Array.from(new Set(services.map((s) => s.provider.city)));

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <span className="text-ink">Dịch vụ sửa chữa</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Dịch vụ sửa chữa &amp; bảo dưỡng
        </h1>
        <p className="text-ink-light">
          {filtered.length} dịch vụ phù hợp — đặt lịch trực tuyến, xác nhận
          trong 30 phút
        </p>
      </div>

      {/* Top bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm dịch vụ (thay dầu, sơn xe, phanh...)"
            leftIcon={<IconSearch size={18} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm"
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
          <FilterSection title="Loại dịch vụ">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilters({ ...filters, category: c })}
                className={[
                  "flex items-center justify-between w-full text-left text-sm py-1.5 px-2 rounded-lg transition-colors",
                  filters.category === c
                    ? "bg-bgsoft text-primary font-medium"
                    : "text-ink hover:bg-bgsoft",
                ].join(" ")}
              >
                {c}
                <span className="text-xs text-ink-muted">
                  {c === "Tất cả"
                    ? services.length
                    : services.filter((s) => s.category === c).length}
                </span>
              </button>
            ))}
          </FilterSection>

          <FilterSection title="Khu vực">
            {["Tất cả", ...cities].map((c) => (
              <label
                key={c}
                className="flex items-center gap-2 text-sm py-1 cursor-pointer"
              >
                <input
                  type="radio"
                  name="city"
                  checked={filters.city === c}
                  onChange={() => setFilters({ ...filters, city: c })}
                />
                {c}
              </label>
            ))}
          </FilterSection>

          <FilterSection title="Khoảng giá">
            <div className="text-sm font-medium text-primary mb-2">
              {formatVND(filters.maxPrice)}
            </div>
            <input
              type="range"
              min={500000}
              max={15000000}
              step={500000}
              value={filters.maxPrice}
              onChange={(e) =>
                setFilters({ ...filters, maxPrice: Number(e.target.value) })
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-xs text-ink-muted mt-1">
              <span>500K</span>
              <span>15 triệu</span>
            </div>
          </FilterSection>

          <Button
            variant="outline"
            fullWidth
            onClick={() =>
              setFilters({
                category: "Tất cả",
                city: "Tất cả",
                maxPrice: 15000000,
              })
            }
          >
            Xoá bộ lọc
          </Button>
        </aside>

        {/* Results */}
        <div>
          {filtered.length === 0 ? (
            <Card>
              <div className="p-10 text-center text-ink-muted">
                <IconWrench size={40} className="mx-auto mb-3 text-ink-muted" />
                <p className="font-medium">Chưa có dịch vụ phù hợp</p>
                <p className="text-sm mt-1">
                  Thử điều chỉnh bộ lọc hoặc xoá bộ lọc để xem tất cả.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filtered.map((s) => (
                <ServiceCard key={s.id} service={s} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ service }: { service: (typeof services)[number] }) {
  return (
    <Link to={`/services/${service.slug}`}>
      <Card>
        <div className="grid sm:grid-cols-[220px_1fr] gap-0">
          <div className="aspect-[4/3] sm:aspect-auto overflow-hidden rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none bg-bgsoft relative">
            <img
              src={service.image}
              alt={service.name}
              className="w-full h-full object-cover"
            />
            {service.isPopular && (
              <Badge tone="primary" className="absolute top-2 left-2">
                Phổ biến
              </Badge>
            )}
          </div>
          <div className="p-5 flex flex-col">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                  <IconWrench size={12} />
                  <span>{service.category}</span>
                  <span>•</span>
                  <IconMapPin size={12} />
                  <span>{service.provider.city}</span>
                </div>
                <h3 className="font-semibold text-lg leading-tight mb-1.5">
                  {service.name}
                </h3>
                <div className="flex items-center gap-1 text-xs text-ink-muted">
                  <span>Bởi</span>
                  <span className="font-medium text-ink">
                    {service.provider.name}
                  </span>
                  <IconStar
                    size={12}
                    className="text-accent-hover ml-1"
                  />
                  <span className="font-medium">{service.provider.rating}</span>
                  <span>({service.provider.reviewsCount})</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-1 justify-end">
                  <IconStar size={14} className="text-accent-hover" />
                  <span className="font-semibold">{service.rating}</span>
                </div>
                <div className="text-xs text-ink-muted">
                  {service.bookingsCount} lượt đặt
                </div>
              </div>
            </div>

            <p className="text-sm text-ink-light line-clamp-2 mb-3">
              {service.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-light mb-3">
              <div className="flex items-center gap-1">
                <IconClock size={14} />~{service.durationMin} phút
              </div>
              <div className="flex items-center gap-1">
                <IconCalendar size={14} />
                {service.availableSlots} slot tuần tới
              </div>
              {service.warrantyMonths > 0 && (
                <div className="flex items-center gap-1 text-primary">
                  <IconCheck size={14} />
                  Bảo hành {service.warrantyMonths} tháng
                </div>
              )}
            </div>

            <div className="mt-auto flex items-end justify-between gap-3 pt-3 border-t border-ink/8">
              <div>
                <div className="text-xs text-ink-muted">Giá từ</div>
                <div className="text-lg font-bold text-primary">
                  {formatVND(service.priceFrom)}
                </div>
                {service.priceTo > service.priceFrom && (
                  <div className="text-xs text-ink-muted">
                    - {formatVND(service.priceTo)}
                  </div>
                )}
              </div>
              <Button size="sm">Đặt lịch</Button>
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