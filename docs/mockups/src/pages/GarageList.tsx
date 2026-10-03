import { useState } from "react";
import { Link } from "react-router-dom";
import {
  IconSearch,
  IconMapPin,
  IconStar,
  IconWrench,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Input from "../components/Input";
import { featuredGarages, popularServices } from "../data/mock";

export default function GarageList() {
  const [view, setView] = useState<"list" | "map">("list");
  const [filters, setFilters] = useState({
    city: "Tất cả",
    service: "",
    minRating: 0,
    openNow: false,
  });

  const filtered = featuredGarages.filter((g) => {
    if (filters.city !== "Tất cả" && g.city !== filters.city) return false;
    if (filters.service && !g.services.includes(filters.service)) return false;
    if (g.rating < filters.minRating) return false;
    if (filters.openNow && !g.openNow) return false;
    return true;
  });

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">Trang chủ</Link>
        <span>/</span>
        <span className="text-ink">Garage</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Tìm garage gần bạn
        </h1>
        <p className="text-ink-light">
          {filtered.length} kết quả phù hợp với bộ lọc của bạn
        </p>
      </div>

      {/* Top bar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Tìm theo tên garage..."
            leftIcon={<IconSearch size={18} />}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex p-1 bg-bgsoft rounded-xl">
            <button
              onClick={() => setView("list")}
              className={[
                "px-4 py-2 text-sm font-medium rounded-lg",
                view === "list" ? "bg-white shadow-sm" : "text-ink-muted",
              ].join(" ")}
            >
              Danh sách
            </button>
            <button
              onClick={() => setView("map")}
              className={[
                "px-4 py-2 text-sm font-medium rounded-lg",
                view === "map" ? "bg-white shadow-sm" : "text-ink-muted",
              ].join(" ")}
            >
              Bản đồ
            </button>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Filter sidebar */}
        <aside className="space-y-6">
          <FilterSection title="Khu vực">
            {["Tất cả", "TP.HCM", "Hà Nội", "Đà Nẵng"].map((c) => (
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

          <FilterSection title="Loại dịch vụ">
            <select
              value={filters.service}
              onChange={(e) =>
                setFilters({ ...filters, service: e.target.value })
              }
              className="w-full h-10 px-3 rounded-lg border border-ink/15 bg-white text-sm"
            >
              <option value="">Tất cả</option>
              {popularServices.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </FilterSection>

          <FilterSection title="Đánh giá tối thiểu">
            <div className="flex gap-2">
              {[0, 3, 4, 4.5].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilters({ ...filters, minRating: r })}
                  className={[
                    "flex-1 py-2 text-xs rounded-lg border transition-colors",
                    filters.minRating === r
                      ? "bg-primary text-white border-primary"
                      : "border-ink/15 hover:border-primary/40",
                  ].join(" ")}
                >
                  {r === 0 ? "Tất cả" : `${r}+`}
                </button>
              ))}
            </div>
          </FilterSection>

          <FilterSection title="Trạng thái">
            <label className="flex items-center gap-2 text-sm py-1 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.openNow}
                onChange={(e) =>
                  setFilters({ ...filters, openNow: e.target.checked })
                }
              />
              Đang mở cửa
            </label>
          </FilterSection>

          <Button
            variant="outline"
            fullWidth
            onClick={() =>
              setFilters({
                city: "Tất cả",
                service: "",
                minRating: 0,
                openNow: false,
              })
            }
          >
            Xoá bộ lọc
          </Button>
        </aside>

        {/* Results */}
        <div>
          {view === "list" ? (
            <div className="space-y-4">
              {filtered.map((g) => (
                <Link to={`/garages/${g.slug}`} key={g.id}>
                  <Card>
                    <div className="grid sm:grid-cols-[200px_1fr] gap-0">
                      <div className="aspect-[4/3] sm:aspect-auto overflow-hidden rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none bg-bgsoft">
                        <img
                          src={g.image}
                          alt={g.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{g.name}</h3>
                              {g.openNow ? (
                                <Badge tone="primary">Đang mở</Badge>
                              ) : (
                                <Badge>Đóng cửa</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-ink-muted">
                              <IconMapPin size={14} /> {g.address} · {g.distanceKm}km
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 justify-end">
                              <IconStar size={14} className="text-accent-hover" />
                              <span className="font-semibold">{g.rating}</span>
                            </div>
                            <div className="text-xs text-ink-muted">
                              {g.reviewsCount} đánh giá
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {g.services.map((s) => (
                            <Badge key={s}>
                              <IconWrench size={12} /> {s}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-sm text-ink-light line-clamp-2">
                          {g.description}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            // Map view placeholder
            <div className="aspect-[16/10] rounded-2xl bg-bgsoft flex items-center justify-center text-ink-muted relative overflow-hidden">
              <div className="text-center">
                <IconMapPin size={48} className="mx-auto mb-3 text-primary" />
                <p className="font-medium">Bản đồ sẽ tích hợp Google Maps / Leaflet</p>
                <p className="text-sm mt-1">Hiển thị {filtered.length} garage</p>
              </div>
              {/* Decorative dots */}
              {filtered.map((g, i) => (
                <div
                  key={g.id}
                  className="absolute w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm cursor-pointer hover:scale-110 transition-transform"
                  style={{
                    left: `${20 + i * 20}%`,
                    top: `${30 + (i % 2) * 30}%`,
                  }}
                  title={g.name}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
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