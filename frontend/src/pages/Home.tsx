import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconSearch,
  IconMapPin,
  IconArrowRight,
  IconSparkles,
  IconWrench,
  IconStar,
  IconCar,
  IconBolt,
  IconShield,
  IconCheck,
  IconPhone,
  IconClock,
} from "../components/icons";
import Button from "../components/Button";
import Card from "../components/Card";
import Badge from "../components/Badge";
import { useCatalog } from "../data/catalog";
import { GARAGE } from "../config/garage";

/** Số dịch vụ tối đa hiển thị ở trang chủ. */
const HOME_SERVICE_LIMIT = 8;

const compactVND = (n: number) => {
  // 489.000.000 -> "489tr", 1.450.000 -> "1,4tr"
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "tr";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
};

export default function Home() {
  const { services } = useCatalog();

  /** Danh mục dịch vụ đang chọn — "Tất cả" hoặc tên nhóm. */
  const [activeCategory, setActiveCategory] = useState("Tất cả");

  // Chip danh mục dịch vụ — suy ra từ catalog đang hiển thị (API thật hoặc mẫu).
  const categoryChips = useMemo(() => {
    const names = Array.from(new Set(services.map((s) => s.category))).filter(
      Boolean,
    );
    // Luôn có "Tất cả" ở đầu để người dùng bỏ lọc nhanh.
    return [
      { name: "Tất cả", count: services.length },
      ...names.slice(0, 8).map((name) => ({
        name,
        count: services.filter((s) => s.category === name).length,
      })),
    ];
  }, [services]);

  // Dịch vụ hiển thị: lọc theo danh mục đang chọn.
  const visibleServices = useMemo(() => {
    const filtered =
      activeCategory === "Tất cả"
        ? services
        : services.filter((s) => s.category === activeCategory);

    // Backend chưa có cột `is_featured` / `bookings_count` (xem entity
    // `Service.java`) nên không có tiêu chí "nổi bật" thật để sắp xếp.
    // Giữ thứ tự backend trả về (mới nhất trước) thay vì bịa tiêu chí.
    return filtered.slice(0, HOME_SERVICE_LIMIT);
  }, [services, activeCategory]);

  return (
    <>
      {/* ============== HERO ============== */}
      <section className="bg-bgsoft">
        <div className="container-page py-12 md:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge tone="primary" className="mb-4">
              <IconSparkles size={14} /> {GARAGE.tagline}
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-ink">
              {GARAGE.name}
              <br />
              <span className="text-primary">
                Bảo dưỡng — Sửa chữa — Chẩn đoán AI
              </span>
            </h1>
            <p className="mt-4 text-ink-light text-base md:text-lg max-w-lg">
              Xưởng sửa chữa ô tô chuyên nghiệp tại {GARAGE.city}. Đặt lịch
              trực tuyến, phân tích hư hỏng bằng AI, tư vấn kỹ thuật 24/7 — tất
              cả tại một nơi.
            </p>

            {/* Quick search bar */}
            <div className="mt-8 bg-white p-2 rounded-2xl shadow-card flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1 px-3">
                <IconSearch size={18} className="text-ink-muted" />
                <input
                  placeholder="Tìm dịch vụ sửa chữa..."
                  className="flex-1 outline-none text-sm bg-transparent"
                />
              </div>
              <div className="flex items-center gap-2 px-3 sm:border-l border-ink/10">
                <IconMapPin size={18} className="text-ink-muted" />
                <span className="text-sm text-ink-muted sm:w-40 truncate">
                  {GARAGE.district}, {GARAGE.city}
                </span>
              </div>
              <Link to="/services" className="sm:self-stretch">
                <Button size="md">
                  Tìm kiếm
                  <IconArrowRight size={16} />
                </Button>
              </Link>
            </div>

            {/* Quick category chips */}
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {[
                { label: "Đặt lịch sửa chữa", to: "/services" },
                { label: "Phân tích hư hỏng AI", to: "/ai/damage" },
                { label: "Trợ lý AI", to: "/ai/assistant" },
              ].map((c) => (
                <Link
                  key={c.to}
                  to={c.to}
                  className="inline-flex items-center gap-1 px-3 h-9 rounded-full bg-white border border-ink/10 text-sm text-ink hover:bg-primary hover:text-white hover:border-primary transition-colors"
                >
                  {c.label}
                </Link>
              ))}
            </div>

            {/* Social proof */}
            <div className="mt-6 flex items-center gap-4 text-sm text-ink-light">
              <div className="flex items-center -space-x-2">
                {["a", "b", "c", "d"].map((s) => (
                  <div
                    key={s}
                    className="w-8 h-8 rounded-full bg-accent border-2 border-white flex items-center justify-center text-xs font-medium"
                  >
                    {s.toUpperCase()}
                  </div>
                ))}
              </div>
              <span>
                <strong className="text-ink">10.000+</strong> chủ xe tin dùng
              </span>
            </div>
          </div>

          {/* Hero illustration */}
          <div className="relative hidden lg:block">
            <div className="aspect-[5/4] rounded-3xl bg-primary overflow-hidden shadow-cardHover">
              <img
                src={GARAGE.image}
                alt={GARAGE.name}
                className="w-full h-full object-cover opacity-90"
              />
            </div>
            {/* Floating cards */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-cardHover p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <IconWrench size={22} className="text-ink" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {GARAGE.technicians} kỹ thuật viên
                </div>
                <div className="text-xs text-ink-muted">{GARAGE.bays} bãi sửa</div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-cardHover p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <IconStar size={22} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold">
                  {GARAGE.rating} / 5 đánh giá
                </div>
                <div className="text-xs text-ink-muted">
                  {GARAGE.reviewsCount} lượt
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== THÔNG TIN XƯỞNG ============== */}
      <section className="container-page py-8 md:py-10">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: <IconMapPin size={20} className="text-primary" />,
              title: GARAGE.address,
              desc: `${GARAGE.district}, ${GARAGE.city}`,
            },
            {
              icon: <IconClock size={20} className="text-primary" />,
              title: GARAGE.workingHours,
              desc: "Làm việc cả thứ 7 & Chủ nhật",
            },
            {
              icon: <IconPhone size={20} className="text-primary" />,
              title: GARAGE.hotline,
              desc: GARAGE.phone,
            },
            {
              icon: <IconShield size={20} className="text-primary" />,
              title: "Bảo hành rõ ràng",
              desc: "Linh kiện chính hãng, bảo hành dịch vụ 12 tháng",
            },
          ].map((b) => (
            <div
              key={b.title}
              className="bg-white border border-ink/8 rounded-2xl p-5 flex items-start gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-bgsoft flex items-center justify-center shrink-0">
                {b.icon}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold mb-0.5 text-sm">{b.title}</h3>
                <p className="text-xs text-ink-muted">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ DỊCH VỤ PHỔ BIẾN + DANH MỤC (gộp 1 section) ============ */}
      <section className="container-page py-12 md:py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <Badge tone="primary" className="mb-2">
              <IconWrench size={14} /> Đặt lịch sửa chữa
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold">
              Dịch vụ phổ biến
            </h2>
            <p className="text-ink-light mt-1">
              Khám phá nhanh các dịch vụ cần thiết tại {GARAGE.name} — đặt lịch
              trực tuyến, xác nhận trong 30 phút
            </p>
          </div>
          <Link
            to="/services"
            className="text-sm text-primary font-medium hover:underline hidden sm:inline-flex items-center gap-1"
          >
            Xem tất cả <IconArrowRight size={14} />
          </Link>
        </div>

        {/* Chip danh mục — dòng trên, cuộn ngang khi nhiều danh mục.
            Không dùng icon emoji: nhóm dịch vụ đến từ DB (admin tự tạo nên
            không có icon), icon cứng sẽ lệch với dữ liệu thật. */}
        <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none">
            {categoryChips.map((s) => {
              const isActive = activeCategory === s.name;
              return (
                <button
                  key={s.name}
                  onClick={() => setActiveCategory(s.name)}
                  aria-pressed={isActive}
                  className={[
                    "group shrink-0 snap-start w-[104px] sm:w-auto bg-white border rounded-2xl px-4 py-3 text-center transition-colors",
                    isActive
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-ink/8 hover:bg-bgsoft",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "text-xs sm:text-sm font-medium leading-tight line-clamp-2",
                      isActive ? "text-primary" : "",
                    ].join(" ")}
                  >
                    {s.name}
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    {s.count} dịch vụ
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Danh sách dịch vụ theo danh mục đang chọn */}
        {visibleServices.length === 0 ? (
          <Card>
            <div className="p-10 text-center text-ink-muted">
              <IconWrench size={40} className="mx-auto mb-3 text-ink-muted" />
              <p className="font-medium">Chưa có dịch vụ phù hợp</p>
              <p className="text-sm mt-1">
                Xem tất cả dịch vụ của {GARAGE.name} để đặt lịch.
              </p>
              <Link to="/services" className="inline-block mt-4">
                <Button size="sm">Xem tất cả dịch vụ</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {visibleServices.map((s) => (
              <Link to={`/services/${s.slug}`} key={s.id} className="group">
                <Card>
                  <div className="aspect-[4/3] overflow-hidden rounded-t-2xl bg-bgsoft">
                    <img
                      src={s.image}
                      alt={s.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <div className="p-4">
                    <Badge tone="default" className="mb-2">
                      {s.category}
                    </Badge>
                    <h3 className="font-semibold leading-tight mb-1 line-clamp-2">
                      {s.name}
                    </h3>
                    <div className="text-xs text-ink-muted mb-2">
                      {GARAGE.name} · ~{s.durationMin} phút
                    </div>
                    <div className="flex items-end justify-between">
                      <div className="text-primary font-bold text-sm">
                        {compactVND(s.priceFrom)}
                      </div>
                      {s.rating > 0 && (
                        <div className="flex items-center gap-1 text-xs">
                          <IconStar
                            size={14}
                            className="text-accent-hover"
                          />
                          <span className="font-medium">{s.rating}</span>
                          {s.bookingsCount > 0 && (
                            <span className="text-ink-muted">
                              ({s.bookingsCount})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Nút "Xem tất cả" cho mobile — trên desktop đã có ở góc trên */}
        <div className="mt-6 sm:hidden">
          <Link to="/services">
            <Button variant="outline" fullWidth>
              Xem tất cả dịch vụ <IconArrowRight size={14} />
            </Button>
          </Link>
        </div>
      </section>

      {/* ============== AI WIDGETS ============== */}
      <section className="container-page py-8 md:py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <Badge tone="primary" className="mb-2">
              <IconBolt size={14} /> Tính năng AI
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold">
              Trợ lý AI cho chủ xe
            </h2>
            <p className="text-ink-light mt-1">
              Phân tích hư hỏng từ ảnh và tư vấn kỹ thuật 24/7
            </p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          <Link
            to="/ai/damage"
            className="group relative overflow-hidden rounded-2xl bg-primary text-white p-8 hover:shadow-cardHover transition-shadow"
          >
            <div className="relative z-10">
              <Badge tone="accent" className="mb-3">
                Mới
              </Badge>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
                  <IconCar size={24} />
                </div>
                <h3 className="text-xl font-bold">Phân tích hư hỏng</h3>
              </div>
              <p className="text-white/85 text-sm leading-relaxed">
                Upload ảnh xe, AI tự động phát hiện vết trầy xước, móp, vỡ...
                và gợi ý chi phí sửa chữa tại {GARAGE.name}.
              </p>
              <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium">
                Thử ngay <IconArrowRight size={16} />
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/10" />
          </Link>

          <Link
            to="/ai/assistant"
            className="group relative overflow-hidden rounded-2xl bg-accent text-ink p-8 hover:shadow-cardHover transition-shadow"
          >
            <div className="relative z-10">
              <Badge tone="primary" className="mb-3">
                24/7
              </Badge>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                  <IconSparkles size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold">Trợ lý AI</h3>
              </div>
              <p className="text-ink-light text-sm leading-relaxed">
                Hỏi đáp về bảo dưỡng, sửa chữa, linh kiện... Bằng ngôn ngữ
                tự nhiên, có trích dẫn nguồn từ bài viết chuyên môn.
              </p>
              <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Trò chuyện ngay <IconArrowRight size={16} />
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-primary/10" />
          </Link>
        </div>
      </section>

      {/* ============== VALUE PROP / TRUST ============== */}
      <section className="container-page py-8 md:py-12">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: <IconShield size={22} className="text-primary" />,
              title: "Phụ tùng chính hãng",
              desc: "Mọi linh kiện dùng cho sửa chữa đều là chính hãng, có bảo hành từ nhà sản xuất.",
            },
            {
              icon: <IconCheck size={22} className="text-primary" />,
              title: "Bảo hành rõ ràng",
              desc: "Bảo hành dịch vụ đến 12 tháng, cam kết minh bạch từng dòng báo giá.",
            },
            {
              icon: <IconBolt size={22} className="text-primary" />,
              title: "AI hỗ trợ tức thì",
              desc: "Phân tích ảnh hư hỏng & tư vấn kỹ thuật mọi lúc.",
            },
          ].map((b) => (
            <div
              key={b.title}
              className="bg-white border border-ink/8 rounded-2xl p-5"
            >
              <div className="w-10 h-10 rounded-xl bg-bgsoft flex items-center justify-center mb-3">
                {b.icon}
              </div>
              <h3 className="font-semibold mb-1">{b.title}</h3>
              <p className="text-sm text-ink-light">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============== CTA ============== */}
      <section className="container-page py-12 md:py-16">
        <div className="bg-bgsoft rounded-3xl p-8 md:p-12 text-center">
          <IconCar size={36} className="text-primary mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Sẵn sàng chăm sóc xe của bạn?
          </h2>
          <p className="text-ink-light max-w-xl mx-auto mb-6">
            Đặt lịch sửa chữa tại {GARAGE.name}, hoặc chụp ảnh xe để AI đánh
            giá hư hỏng và gợi ý phương án — tất cả chỉ vài thao tác.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to="/services">
              <Button size="lg">Đặt lịch ngay</Button>
            </Link>
            <Link to="/ai/damage">
              <Button size="lg" variant="outline">
                Phân tích hư hỏng
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
