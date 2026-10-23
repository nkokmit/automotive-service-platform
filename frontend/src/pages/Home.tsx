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
  IconShoppingBag,
  IconShield,
  IconCheck,
} from "../components/icons";
import Button from "../components/Button";
import Card from "../components/Card";
import Badge from "../components/Badge";
import {
  popularServices,
  cars,
  parts,
  articles,
  services,
} from "../data/mock";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + "đ";

const compactVND = (n: number) => {
  // 489.000.000 -> "489tr", 1.450.000 -> "1,4tr"
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "tr";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
};

export default function Home() {
  // Top 4 dịch vụ nổi bật (theo bookingsCount)
  const featuredServices = [...services]
    .filter((s) => s.isFeatured)
    .sort((a, b) => b.bookingsCount - a.bookingsCount)
    .slice(0, 4);

  // Top 4 xe nổi bật
  const featuredCars = cars.filter((c) => c.isFeatured).slice(0, 4);

  // Top 8 phụ kiện bán chạy
  const topParts = parts
    .filter((p) => p.isBestSeller || p.isFeatured)
    .slice(0, 8);

  return (
    <>
      {/* ============== HERO ============== */}
      <section className="bg-bgsoft">
        <div className="container-page py-12 md:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge tone="primary" className="mb-4">
              <IconSparkles size={14} /> Nền tảng chăm sóc xe toàn diện
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-ink">
              Mua bán xe, phụ kiện &amp;
              <br />
              <span className="text-primary">đặt lịch sửa chữa dễ dàng</span>
            </h1>
            <p className="mt-4 text-ink-light text-base md:text-lg max-w-lg">
              Hệ sinh thái ô tô: tìm xe phù hợp, mua phụ kiện chính hãng,
              đặt lịch dịch vụ tại garage uy tín — tất cả ở một nơi, có AI
              hỗ trợ 24/7.
            </p>

            {/* Quick search bar — bám sát use-case 4.4 */}
            <div className="mt-8 bg-white p-2 rounded-2xl shadow-card flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1 px-3">
                <IconSearch size={18} className="text-ink-muted" />
                <input
                  placeholder="Tìm xe, phụ kiện, dịch vụ..."
                  className="flex-1 outline-none text-sm bg-transparent"
                />
              </div>
              <div className="flex items-center gap-2 px-3 sm:border-l border-ink/10">
                <IconMapPin size={18} className="text-ink-muted" />
                <input
                  placeholder="TP.HCM"
                  className="flex-1 outline-none text-sm bg-transparent sm:w-28"
                />
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
                { label: "Mua xe", to: "/cars" },
                { label: "Phụ kiện", to: "/parts" },
                { label: "Đặt lịch sửa chữa", to: "/services" },
                { label: "Tin tức ô tô", to: "/news" },
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
                src="https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=70"
                alt="Ô tô"
                className="w-full h-full object-cover opacity-90"
              />
            </div>
            {/* Floating cards — gắn với 3 nghiệp vụ chính (mua xe / phụ kiện / dịch vụ) */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-cardHover p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <IconCar size={22} className="text-ink" />
              </div>
              <div>
                <div className="text-sm font-semibold">200+ xe</div>
                <div className="text-xs text-ink-muted">Đang bán</div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-cardHover p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <IconWrench size={22} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold">500+ garage</div>
                <div className="text-xs text-ink-muted">Liên kết toàn quốc</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============== DỊCH VỤ PHỔ BIẾN (category chips) ============== */}
      <section className="container-page py-12 md:py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">
              Dịch vụ phổ biến
            </h2>
            <p className="text-ink-light mt-1">
              Khám phá nhanh các dịch vụ cần thiết
            </p>
          </div>
          <Link
            to="/services"
            className="text-sm text-primary font-medium hover:underline hidden sm:inline-flex items-center gap-1"
          >
            Xem tất cả <IconArrowRight size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {popularServices.map((s) => (
            <Link
              to={`/services?category=${encodeURIComponent(s.name)}`}
              key={s.id}
              className="group bg-white border border-ink/8 rounded-2xl p-4 text-center hover:bg-bgsoft transition-colors"
            >
              <div className="text-3xl mb-2">{s.icon}</div>
              <div className="text-xs sm:text-sm font-medium">{s.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============== XE NỔI BẬT (thay cho "Garage nổi bật") ============== */}
      <section className="container-page py-8 md:py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <Badge tone="accent" className="mb-2">
              <IconCar size={14} /> Mua bán xe
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold">Xe nổi bật</h2>
            <p className="text-ink-light mt-1">
              Xe đã qua sử dụng chất lượng, giá tốt từ salon &amp; cá nhân
            </p>
          </div>
          <Link
            to="/cars"
            className="text-sm text-primary font-medium hover:underline hidden sm:inline-flex items-center gap-1"
          >
            Xem tất cả <IconArrowRight size={14} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredCars.map((car) => (
            <Link to="/cars" key={car.id} className="group">
              <Card>
                <div className="aspect-[4/3] overflow-hidden rounded-t-2xl bg-bgsoft relative">
                  <img
                    src={car.image}
                    alt={car.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {car.isNew && (
                    <Badge tone="accent" className="absolute top-3 left-3">
                      Mới
                    </Badge>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                    <IconMapPin size={14} /> {car.city} · {car.year} ·{" "}
                    {car.odoKm.toLocaleString("vi-VN")} km
                  </div>
                  <h3 className="font-semibold leading-tight mb-2 line-clamp-2">
                    {car.title}
                  </h3>
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-primary font-bold text-lg">
                        {compactVND(car.priceVND)}
                      </div>
                      <div className="text-xs text-ink-muted">
                        {car.seller.name}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-ink-muted">
                      <IconStar size={14} className="text-accent-hover" />
                      <span className="font-medium text-ink">
                        {car.rating}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ============== DỊCH VỤ GARA NỔI BẬT ============== */}
      <section className="container-page py-8 md:py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <Badge tone="primary" className="mb-2">
              <IconWrench size={14} /> Đặt lịch sửa chữa
            </Badge>
            <h2 className="text-2xl md:text-3xl font-bold">
              Dịch vụ gara nổi bật
            </h2>
            <p className="text-ink-light mt-1">
              Đặt lịch nhanh với garage uy tín — có xác nhận trong vài phút
            </p>
          </div>
          <Link
            to="/services"
            className="text-sm text-primary font-medium hover:underline hidden sm:inline-flex items-center gap-1"
          >
            Xem tất cả <IconArrowRight size={14} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featuredServices.map((s) => (
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
                    {s.provider.name} · {s.provider.city}
                  </div>
                  <div className="flex items-end justify-between">
                    <div className="text-primary font-bold text-sm">
                      {compactVND(s.priceFrom)}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <IconStar
                        size={14}
                        className="text-accent-hover"
                      />
                      <span className="font-medium">{s.rating}</span>
                      <span className="text-ink-muted">
                        ({s.bookingsCount})
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ============== PHỤ KIỆN NỔI BẬT ============== */}
      <section className="bg-bgsoft/40">
        <div className="container-page py-12 md:py-16">
          <div className="flex items-end justify-between mb-6">
            <div>
              <Badge tone="primary" className="mb-2">
                <IconShoppingBag size={14} /> Phụ kiện &amp; phụ tùng
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold">
                Phụ kiện bán chạy
              </h2>
              <p className="text-ink-light mt-1">
                Chính hãng · Giao nhanh toàn quốc · Đổi trả 14 ngày
              </p>
            </div>
            <Link
              to="/parts"
              className="text-sm text-primary font-medium hover:underline hidden sm:inline-flex items-center gap-1"
            >
              Xem tất cả <IconArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {topParts.map((p) => {
              const discount = p.originalPriceVND
                ? Math.round(
                    ((p.originalPriceVND - p.priceVND) / p.originalPriceVND) *
                      100,
                  )
                : 0;
              return (
                <Link to={`/parts/${p.slug}`} key={p.id} className="group">
                  <Card>
                    <div className="aspect-square overflow-hidden rounded-t-2xl bg-white relative">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {discount > 0 && (
                        <Badge
                          tone="accent"
                          className="absolute top-2 left-2"
                        >
                          -{discount}%
                        </Badge>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="text-[11px] uppercase tracking-wide text-ink-muted mb-1">
                        {p.brand} · {p.category}
                      </div>
                      <h3 className="text-sm font-medium leading-snug mb-2 line-clamp-2">
                        {p.name}
                      </h3>
                      <div className="flex items-end justify-between">
                        <div>
                          <div className="text-primary font-bold text-sm">
                            {compactVND(p.priceVND)}
                          </div>
                          {p.originalPriceVND && (
                            <div className="text-xs text-ink-muted line-through">
                              {compactVND(p.originalPriceVND)}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-ink-muted">
                          <IconStar
                            size={12}
                            className="text-accent-hover"
                          />
                          <span>{p.rating}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
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
                và gợi ý chi phí sửa chữa + garage phù hợp.
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
                Hỏi đáp về bảo dưỡng, sửa chữa, phụ tùng... Bằng ngôn ngữ
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

      {/* ============== TIN TỨC ============== */}
      <section className="container-page py-8 md:py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Bài viết mới</h2>
            <p className="text-ink-light mt-1">
              Kiến thức hữu ích cho chủ xe
            </p>
          </div>
          <Link
            to="/news"
            className="text-sm text-primary font-medium hover:underline hidden sm:inline-flex items-center gap-1"
          >
            Xem tất cả <IconArrowRight size={14} />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.slice(0, 3).map((a) => (
            <Link to={`/news/${a.slug}`} key={a.id} className="group">
              <Card>
                <div className="aspect-[16/10] overflow-hidden rounded-t-2xl bg-bgsoft">
                  <img
                    src={a.image}
                    alt={a.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-5">
                  <Badge tone="primary" className="mb-2">
                    {a.category}
                  </Badge>
                  <h3 className="font-semibold leading-tight mb-2 group-hover:text-primary transition-colors">
                    {a.title}
                  </h3>
                  <p className="text-sm text-ink-light line-clamp-2">
                    {a.excerpt}
                  </p>
                  <div className="mt-3 text-xs text-ink-muted">
                    {a.publishedAt} · {a.readMinutes} phút đọc
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ============== VALUE PROP / TRUST ============== */}
      <section className="container-page py-8 md:py-12">
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              icon: <IconShield size={22} className="text-primary" />,
              title: "Garage & sản phẩm xác minh",
              desc: "Mọi garage đối tác và sản phẩm đều qua kiểm duyệt.",
            },
            {
              icon: <IconCheck size={22} className="text-primary" />,
              title: "Bảo hành rõ ràng",
              desc: "Bảo hành dịch vụ đến 12 tháng, phụ kiện chính hãng.",
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
            Bạn là chủ xe hoặc garage?
          </h2>
          <p className="text-ink-light max-w-xl mx-auto mb-6">
            Đăng ký để đăng bán xe, bán phụ kiện, hoặc tiếp cận hàng nghìn
            khách hàng đang tìm kiếm dịch vụ.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button size="lg">Đăng ký miễn phí</Button>
            <Link to="/services">
              <Button size="lg" variant="outline">
                Khám phá dịch vụ
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}