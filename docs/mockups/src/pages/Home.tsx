import { Link } from "react-router-dom";
import {
  IconSearch,
  IconMapPin,
  IconStar,
  IconCalendar,
  IconWrench,
  IconCamera,
  IconChat,
  IconArrowRight,
  IconSparkles,
} from "../components/icons";
import Button from "../components/Button";
import Card from "../components/Card";
import Badge from "../components/Badge";
import { featuredGarages, popularServices, articles } from "../data/mock";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + "đ";

export default function Home() {
  return (
    <>
      {/* HERO */}
      <section className="bg-bgsoft">
        <div className="container-page py-12 md:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <Badge tone="primary" className="mb-4">
              <IconSparkles size={14} /> Nền tảng chăm sóc xe toàn diện
            </Badge>
            <h1 className="text-3xl md:text-5xl font-bold leading-tight text-ink">
              Tìm garage uy tín,
              <br />
              <span className="text-primary">đặt lịch dễ dàng</span>
            </h1>
            <p className="mt-4 text-ink-light text-base md:text-lg max-w-lg">
              Kết nối bạn với hàng trăm garage chuyên nghiệp. Trợ lý AI hỗ trợ
              24/7, phân tích hư hỏng chỉ trong vài giây.
            </p>

            {/* Search */}
            <div className="mt-8 bg-white p-2 rounded-2xl shadow-card flex flex-col sm:flex-row gap-2">
              <div className="flex items-center gap-2 flex-1 px-3">
                <IconSearch size={18} className="text-ink-muted" />
                <input
                  placeholder="Bạn cần dịch vụ gì? (thay dầu, sơn xe, bảo dưỡng...)"
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
                  Tìm garage
                  <IconArrowRight size={16} />
                </Button>
              </Link>
            </div>

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
                <strong className="text-ink">500+ garage</strong> trên toàn quốc
              </span>
            </div>
          </div>

          {/* Hero illustration */}
          <div className="relative hidden lg:block">
            <div className="aspect-[5/4] rounded-3xl bg-primary overflow-hidden shadow-cardHover">
              <img
                src="https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=70"
                alt="Garage"
                className="w-full h-full object-cover opacity-90"
              />
            </div>
            {/* Floating card */}
            <div className="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-cardHover p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
                <IconStar size={22} className="text-ink" />
              </div>
              <div>
                <div className="text-sm font-semibold">4.8/5</div>
                <div className="text-xs text-ink-muted">Đánh giá trung bình</div>
              </div>
            </div>
            <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-cardHover p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <IconCalendar size={22} className="text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold">10,000+</div>
                <div className="text-xs text-ink-muted">Lượt đặt lịch</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR SERVICES */}
      <section className="container-page py-12 md:py-16">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Dịch vụ phổ biến</h2>
            <p className="text-ink-light mt-1">Khám phá nhanh các dịch vụ cần thiết</p>
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

      {/* FEATURED GARAGES */}
      <section className="container-page py-8 md:py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Garage nổi bật</h2>
            <p className="text-ink-light mt-1">
              Được khách hàng đánh giá cao nhất
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
          {featuredGarages.map((g) => (
            <Link to={`/services`} key={g.id} className="group">
              <Card>
                <div className="aspect-[4/3] overflow-hidden rounded-t-2xl bg-bgsoft">
                  <img
                    src={g.image}
                    alt={g.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-1">
                    <IconMapPin size={14} /> {g.city}
                  </div>
                  <h3 className="font-semibold leading-tight mb-2">{g.name}</h3>
                  <div className="flex items-center gap-1 text-xs mb-3">
                    <IconStar size={14} className="text-accent-hover" />
                    <span className="font-medium">{g.rating}</span>
                    <span className="text-ink-muted">
                      ({g.reviewsCount} đánh giá)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {g.services.slice(0, 2).map((s) => (
                      <Badge key={s} tone="default">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* AI WIDGETS */}
      <section className="container-page py-8 md:py-12">
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
                  <IconCamera size={24} />
                </div>
                <h3 className="text-xl font-bold">Phân tích hư hỏng</h3>
              </div>
              <p className="text-white/85 text-sm leading-relaxed">
                Upload ảnh xe, AI tự động phát hiện vết trầy xước, móp, vỡ...
                và gợi ý chi phí sửa chữa.
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
                  <IconChat size={24} className="text-white" />
                </div>
                <h3 className="text-xl font-bold">Trợ lý AI</h3>
              </div>
              <p className="text-ink-light text-sm leading-relaxed">
                Hỏi đáp về bảo dưỡng, sửa chữa, phụ tùng... Bằng ngôn ngữ
                tự nhiên, có trích dẫn nguồn.
              </p>
              <div className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Trò chuyện ngay <IconArrowRight size={16} />
              </div>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-primary/10" />
          </Link>
        </div>
      </section>

      {/* ARTICLES */}
      <section className="container-page py-8 md:py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Bài viết mới</h2>
            <p className="text-ink-light mt-1">Kiến thức hữu ích cho chủ xe</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((a) => (
            <Card key={a.id}>
              <div className="aspect-[16/10] overflow-hidden rounded-t-2xl bg-bgsoft">
                <img
                  src={a.image}
                  alt={a.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <Badge tone="primary" className="mb-2">
                  {a.category}
                </Badge>
                <h3 className="font-semibold leading-tight mb-2">{a.title}</h3>
                <p className="text-sm text-ink-light line-clamp-2">
                  {a.excerpt}
                </p>
                <div className="mt-3 text-xs text-ink-muted">
                  {a.publishedAt} · {a.readMinutes} phút đọc
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-12 md:py-16">
        <div className="bg-bgsoft rounded-3xl p-8 md:p-12 text-center">
          <IconWrench size={36} className="text-primary mx-auto mb-4" />
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            Bạn là chủ garage?
          </h2>
          <p className="text-ink-light max-w-xl mx-auto mb-6">
            Đăng ký để tiếp cận hàng nghìn khách hàng đang tìm kiếm dịch vụ.
          </p>
          <Button size="lg">Đăng ký garage miễn phí</Button>
        </div>
      </section>
    </>
  );
}