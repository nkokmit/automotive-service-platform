import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  IconCar,
  IconMapPin,
  IconStar,
  IconCalendar,
  IconWrench,
  IconBolt,
  IconPhone,
  IconChat,
  IconArrowRight,
  IconCheck,
  IconShield,
  IconClock,
  IconSparkles,
  IconClose,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import { Skeleton, FullPageSpinner } from "../components/Loading";
import { useToast } from "../components/Toast";
import { cars, type Car } from "../data/mock";

// =========================
// Helpers
// =========================
const compactVND = (n: number) => {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "tr";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
};

const fullVND = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + " đ";

const formatOdo = (km: number) => km.toLocaleString("vi-VN") + " km";

const FAVORITES_KEY = "autocare:favorites";

// =========================
// Mock data cho contact (vì seller chỉ có name + type trong data)
// =========================
// Khi backend thật, lấy từ API theo car.seller.id
const mockSellerPhones: Record<string, string> = {
  "Salon Auto Hùng Phát": "028 3876 1234",
  "Nguyễn Văn A": "0901 234 567",
  "Salon Auto Premium": "028 3987 5678",
  "Hyundai Đà Nẵng": "023 6389 4321",
  "VinFast Trần Duy Hưng": "024 7300 6686",
  "Trần Thị B": "0987 654 321",
};

// Mock reviews cho xe — vì Car chỉ có rating/reviewsCount trong data
// (sẽ wrap thành API useReviews(carId) khi backend xong)
const mockReviews = [
  {
    id: "rv1",
    author: "Phạm Văn Mua",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=70",
    rating: 5,
    date: "20/09/2026",
    content:
      "Xe đúng mô tả, chính chủ giao tiếp nhanh, giấy tờ rõ ràng. Mua xong chạy ổn định.",
  },
  {
    id: "rv2",
    author: "Hoàng Thị K.",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=70",
    rating: 4,
    date: "12/09/2026",
    content:
      "Giá hơi cao so với thị trường nhưng xe đẹp, salon hỗ trợ làm thủ tục nhanh.",
  },
  {
    id: "rv3",
    author: "Lê Quốc Bảo",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=70",
    rating: 5,
    date: "01/09/2026",
    content:
      "Đã lái thử, cảm giác lái rất tốt. Nội thất còn mới, không có dấu hiệu va chạm.",
  },
];

// =========================
// Sub-component: SpecRow
// =========================
function SpecRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-ink/8 last:border-b-0">
      <div className="w-8 h-8 rounded-lg bg-bgsoft flex items-center justify-center shrink-0 text-ink">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-ink-muted">{label}</div>
        <div className="text-sm font-medium text-ink mt-0.5">{value}</div>
      </div>
    </div>
  );
}

// =========================
// Sub-component: Gallery
// =========================
function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);

  // Keyboard nav
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        setActive((i) => (i - 1 + images.length) % images.length);
      } else if (e.key === "ArrowRight") {
        setActive((i) => (i + 1) % images.length);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length]);

  if (images.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-2xl bg-bgsoft flex items-center justify-center">
        <IconCar size={48} className="text-ink-muted" />
      </div>
    );
  }

  return (
    <div>
      {/* Main image */}
      <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-bgsoft group">
        <img
          src={images[active]}
          alt={`${alt} - ảnh ${active + 1}`}
          className="w-full h-full object-cover"
        />

        {/* Counter */}
        <div className="absolute top-3 right-3 bg-ink/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur">
          {active + 1} / {images.length}
        </div>

        {/* Prev/Next */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setActive((i) => (i - 1 + images.length) % images.length)
              }
              aria-label="Ảnh trước"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-card flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <IconArrowRight
                size={20}
                className="rotate-180 text-ink"
              />
            </button>
            <button
              type="button"
              onClick={() => setActive((i) => (i + 1) % images.length)}
              aria-label="Ảnh sau"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-card flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <IconArrowRight size={20} className="text-ink" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              className={[
                "shrink-0 w-20 h-16 rounded-lg border-2 overflow-hidden transition-all",
                i === active
                  ? "border-primary opacity-100"
                  : "border-transparent opacity-70 hover:opacity-100",
              ].join(" ")}
              aria-label={`Xem ảnh ${i + 1}`}
            >
              <img
                src={src}
                alt={`Thumb ${i + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// =========================
// Sub-component: SimilarCarCard
// =========================
function SimilarCarCard({ car }: { car: Car }) {
  return (
    <Link to={`/cars/${car.slug}`} className="group block h-full">
      <Card className="h-full flex flex-col">
        <div className="relative aspect-[4/3] overflow-hidden rounded-t-2xl bg-bgsoft">
          <img
            src={car.image}
            alt={car.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {car.isNew && (
            <Badge tone="primary" className="absolute top-2 left-2">
              Mới
            </Badge>
          )}
        </div>
        <div className="p-3 flex-1 flex flex-col">
          <h4 className="font-semibold text-sm leading-tight mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">
            {car.title}
          </h4>
          <div className="text-xs text-ink-muted mb-2">
            {car.year} · {formatOdo(car.odoKm)}
          </div>
          <div className="mt-auto flex items-end justify-between">
            <div className="text-primary font-bold text-sm">
              {compactVND(car.priceVND)}
            </div>
            <div className="flex items-center gap-1 text-xs text-ink-muted">
              <IconStar size={12} className="text-accent-hover" />
              <span className="font-medium text-ink">{car.rating}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// =========================
// Main component
// =========================
export default function CarDetail() {
  const { slug } = useParams();
  const t = useToast();

  // Loading giả lập (mô phỏng API call)
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const id = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(id);
  }, [slug]);

  // Tìm xe theo slug; fallback null để render NotFoundPage
  // (Tính lại sau khi loading xong để có cùng thời điểm)
  const car = useMemo(
    () => (loading ? null : cars.find((c) => c.slug === slug) ?? null),
    [slug, loading],
  );

  // Favorites state (localStorage)
  const [favorited, setFavorited] = useState(false);
  useEffect(() => {
    if (!car) return;
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      const set = raw ? (JSON.parse(raw) as string[]) : [];
      setFavorited(set.includes(car.id));
    } catch {
      setFavorited(false);
    }
  }, [car]);

  const toggleFavorite = () => {
    if (!car) return;
    try {
      const raw = localStorage.getItem(FAVORITES_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = list.includes(car.id)
        ? list.filter((id) => id !== car.id)
        : [...list, car.id];
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
      setFavorited(!favorited);
      t.success(
        favorited
          ? `Đã bỏ yêu thích "${car.title}"`
          : `Đã thêm "${car.title}" vào yêu thích`,
      );
    } catch {
      t.error("Không thể lưu yêu thích (localStorage bị chặn)");
    }
  };

  // Contact modal
  const [showContact, setShowContact] = useState(false);

  // Booking modal (đặt lịch xem xe)
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingSlot, setBookingSlot] = useState("");
  const [bookingName, setBookingName] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");

  // =========================
  // RENDER BRANCHES
  // =========================

  // 1. Loading
  if (loading) {
    return (
      <div className="container-page py-6 md:py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-6">
          <div>
            <Skeleton className="h-6 w-32 mb-4" />
            <Skeleton className="aspect-[4/3] w-full rounded-2xl" />
            <div className="mt-6 space-y-3">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          </div>
          <div>
            <Skeleton className="h-72 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Nếu slug không tồn tại → render NotFoundPage trong container
  if (!car) {
    return (
      <div className="container-page py-12">
        <div className="bg-white border border-ink/10 rounded-2xl p-10 text-center max-w-md mx-auto">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
            <IconCar size={32} className="text-ink-muted" />
          </div>
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            404 — Không tìm thấy xe
          </p>
          <h1 className="text-xl font-bold mb-2">Xe không tồn tại hoặc đã bán</h1>
          <p className="text-sm text-ink-light mb-6">
            Slug <code className="bg-bgsoft px-1.5 py-0.5 rounded">{slug}</code>{" "}
            không có trong hệ thống.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link to="/cars">
              <Button>Xem xe khác</Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Từ đây `car` chắc chắn không null (đã return 2 nhánh ở trên)
  const phone = mockSellerPhones[car.seller.name] ?? "1900 6868";

  // Similar cars:
  // Ưu tiên 1: cùng brand, loại trừ chính nó
  // Ưu tiên 2: cùng bodyType (nếu brand chỉ có 1 xe)
  // Max 4 xe
  const sameBrand = cars.filter(
    (c) => c.brand === car.brand && c.id !== car.id,
  );
  const similarCandidates =
    sameBrand.length > 0
      ? sameBrand
      : cars.filter(
          (c) => c.bodyType === car.bodyType && c.id !== car.id,
        );
  const similar = similarCandidates.slice(0, 4);

  // Mock slots cho booking (đặt lịch xem xe)
  const bookingSlots = ["09:00", "10:30", "13:00", "14:30", "16:00"];
  const today = new Date("2026-10-03");
  const bookingDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      iso: d.toISOString().slice(0, 10),
      label: `${d.getDate()}/${d.getMonth() + 1}`,
      weekday: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()],
    };
  });

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <Link to="/cars" className="hover:text-primary">
          Mua bán xe
        </Link>
        <span>/</span>
        <span className="text-ink line-clamp-1">{car.title}</span>
      </nav>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* ============= LEFT COLUMN ============= */}
        <div>
          {/* Gallery */}
          <Gallery images={car.gallery} alt={car.title} />

          {/* Title + meta */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <Badge tone="primary">{car.brand}</Badge>
              <Badge tone="default">{car.bodyType}</Badge>
              {car.isNew && <Badge tone="accent">Mới</Badge>}
              {car.isFeatured && <Badge tone="accent">Nổi bật</Badge>}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-3">
              {car.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-light">
              <div className="flex items-center gap-1">
                <IconStar size={16} className="text-accent-hover" />
                <span className="font-semibold text-ink">{car.rating}</span>
                <span className="text-ink-muted">({car.reviewsCount} đánh giá)</span>
              </div>
              <div className="flex items-center gap-1">
                <IconMapPin size={14} />
                {car.city}
              </div>
              <div className="flex items-center gap-1">
                <IconCalendar size={14} />
                Đăng {new Date("2026-09-25").toLocaleDateString("vi-VN")}
              </div>
            </div>
          </div>

          {/* Specs */}
          <Card hover={false} className="mt-6">
            <div className="p-5">
              <h2 className="font-semibold mb-2 flex items-center gap-2">
                <IconWrench size={18} className="text-primary" />
                Thông số kỹ thuật
              </h2>
              <div className="grid sm:grid-cols-2 gap-x-6">
                <SpecRow
                  icon={<IconCar size={16} />}
                  label="Hãng xe"
                  value={car.brand}
                />
                <SpecRow
                  icon={<IconCar size={16} />}
                  label="Dòng xe"
                  value={car.model}
                />
                <SpecRow
                  icon={<IconCalendar size={16} />}
                  label="Năm sản xuất"
                  value={car.year}
                />
                <SpecRow
                  icon={<IconClock size={16} />}
                  label="Số ODO"
                  value={formatOdo(car.odoKm)}
                />
                <SpecRow
                  icon={<IconBolt size={16} />}
                  label="Nhiên liệu"
                  value={car.fuelType}
                />
                <SpecRow
                  icon={<IconWrench size={16} />}
                  label="Hộp số"
                  value={car.transmission}
                />
                <SpecRow
                  icon={<IconCar size={16} />}
                  label="Kiểu dáng"
                  value={car.bodyType}
                />
                <SpecRow
                  icon={<IconMapPin size={16} />}
                  label="Khu vực"
                  value={car.city}
                />
              </div>
            </div>
          </Card>

          {/* Description */}
          <div className="mt-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <IconSparkles size={18} className="text-primary" />
              Mô tả chi tiết
            </h2>
            <div className="prose prose-sm max-w-none">
              <p className="text-ink-light leading-relaxed">{car.description}</p>
              <p className="text-ink-light leading-relaxed mt-3">
                Xe được bảo dưỡng định kỳ đầy đủ, sổ bảo dưỡng rõ ràng.
                Khách hàng có thể đến xem và lái thử tại {car.city}.
                Liên hệ trực tiếp với người bán qua số điện thoại ở cột bên
                phải để được tư vấn chi tiết.
              </p>
            </div>
          </div>

          {/* Features */}
          <Card hover={false} className="mt-6">
            <div className="p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <IconCheck size={18} className="text-primary" />
                Tính năng nổi bật
              </h2>
              <ul className="grid sm:grid-cols-2 gap-2">
                {car.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-sm text-ink-light"
                  >
                    <span className="w-5 h-5 rounded-full bg-accent text-ink flex items-center justify-center shrink-0">
                      <IconCheck size={12} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Trust / policy */}
          <Card hover={false} className="mt-6 bg-bgsoft/40">
            <div className="p-5">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <IconShield size={18} className="text-primary" />
                Cam kết từ AutoCare
              </h2>
              <ul className="space-y-2 text-sm text-ink-light">
                <li className="flex items-start gap-2">
                  <IconCheck size={16} className="text-primary shrink-0 mt-0.5" />
                  Thông tin xe đã được xác minh bởi AutoCare.
                </li>
                <li className="flex items-start gap-2">
                  <IconCheck size={16} className="text-primary shrink-0 mt-0.5" />
                  Hỗ trợ làm thủ tục sang tên, chuyển nhượng qua đội ngũ
                  AutoCare.
                </li>
                <li className="flex items-start gap-2">
                  <IconCheck size={16} className="text-primary shrink-0 mt-0.5" />
                  Hoàn cơ sở phí 11.000.000đ nếu phát hiện sai sót về giấy tờ.
                </li>
              </ul>
            </div>
          </Card>

          {/* Reviews */}
          <div className="mt-6">
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <IconStar size={18} className="text-primary" />
              Đánh giá từ người mua ({mockReviews.length})
            </h2>
            <div className="space-y-3">
              {mockReviews.map((r) => (
                <Card key={r.id} hover={false}>
                  <div className="p-4 flex gap-3">
                    <img
                      src={r.avatar}
                      alt={r.author}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{r.author}</span>
                        <span className="text-xs text-ink-muted">{r.date}</span>
                      </div>
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <IconStar
                            key={s}
                            size={14}
                            className={
                              s <= r.rating
                                ? "text-accent-hover"
                                : "text-ink/15"
                            }
                          />
                        ))}
                      </div>
                      <p className="text-sm text-ink-light">{r.content}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* Similar cars */}
          {similar.length > 0 && (
            <div className="mt-8">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold">
                    {sameBrand.length > 0
                      ? `Xe cùng hãng ${car.brand}`
                      : `Xe cùng kiểu dáng ${car.bodyType}`}
                  </h2>
                  <p className="text-sm text-ink-light mt-1">
                    Có thể bạn cũng quan tâm
                  </p>
                </div>
                <Link
                  to="/cars"
                  className="text-sm text-primary font-medium hover:underline hidden sm:inline-flex items-center gap-1"
                >
                  Xem tất cả <IconArrowRight size={14} />
                </Link>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {similar.map((c) => (
                  <SimilarCarCard key={c.id} car={c} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ============= RIGHT: sticky contact card ============= */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
          {/* Price + main CTA */}
          <Card>
            <div className="p-5">
              <div className="text-xs text-ink-muted mb-1">Giá bán</div>
              <div className="text-3xl font-bold text-primary mb-1">
                {compactVND(car.priceVND)}
              </div>
              <div className="text-sm text-ink-muted">
                ({fullVND(car.priceVND)})
              </div>

              <div className="my-4 border-t border-ink/8" />

              {/* Seller mini card */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-ink font-bold">
                  {car.seller.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {car.seller.name}
                  </div>
                  <div className="text-xs text-ink-muted">
                    {car.seller.type === "Salon" ? "Salon chuyên nghiệp" : "Cá nhân"}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  size="lg"
                  fullWidth
                  onClick={() => setShowContact(true)}
                >
                  <IconPhone size={16} />
                  Liên hệ người bán
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  fullWidth
                  onClick={() => setShowBooking(true)}
                >
                  <IconCalendar size={16} />
                  Đặt lịch xem xe
                </Button>
                <Button
                  size="md"
                  variant="ghost"
                  fullWidth
                  onClick={toggleFavorite}
                  aria-label={
                    favorited ? "Bỏ yêu thích" : "Thêm vào yêu thích"
                  }
                >
                  <IconSparkles size={16} />
                  {favorited ? "Đã yêu thích" : "Yêu thích"}
                </Button>
              </div>

              <p className="text-xs text-ink-muted text-center mt-3">
                Liên hệ miễn phí · Phản hồi trong vài phút
              </p>
            </div>
          </Card>

          {/* Quick reassurance card */}
          <Card hover={false} className="bg-bgsoft/40">
            <div className="p-4 space-y-2.5 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <IconShield size={14} />
                </div>
                <span className="text-ink-light">
                  Thông tin đã xác minh
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <IconCheck size={14} />
                </div>
                <span className="text-ink-light">
                  Hỗ trợ sang tên miễn phí
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <IconChat size={14} />
                </div>
                <span className="text-ink-light">
                  Chat trực tiếp với người bán
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ============= MODAL: Contact ============= */}
      {showContact && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setShowContact(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-bold text-lg">Liên hệ người bán</h3>
              <button
                type="button"
                onClick={() => setShowContact(false)}
                aria-label="Đóng"
                className="p-1 rounded-md hover:bg-bgsoft text-ink-muted"
              >
                <IconClose size={20} />
              </button>
            </div>

            <div className="bg-bgsoft rounded-xl p-3 mb-4">
              <div className="font-medium text-sm mb-1">{car.title}</div>
              <div className="text-xs text-ink-muted">
                {car.year} · {formatOdo(car.odoKm)} · {car.city}
              </div>
              <div className="text-primary font-bold text-sm mt-2">
                {compactVND(car.priceVND)}
              </div>
            </div>

            {/* Seller info */}
            <div className="space-y-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-ink font-bold">
                  {car.seller.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{car.seller.name}</div>
                  <div className="text-xs text-ink-muted">
                    {car.seller.type === "Salon" ? "Salon chuyên nghiệp" : "Người bán cá nhân"}
                  </div>
                </div>
              </div>
              <a
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="flex items-center justify-between p-3 rounded-xl border border-primary bg-primary/5 hover:bg-primary/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IconPhone size={18} className="text-primary" />
                  <span className="font-semibold text-ink">{phone}</span>
                </div>
                <span className="text-xs font-medium text-primary">
                  Gọi ngay →
                </span>
              </a>
              <a
                href={`sms:${phone.replace(/\s/g, "")}?body=${encodeURIComponent(`Tôi quan tâm đến xe ${car.title} trên AutoCare`)}`}
                className="flex items-center justify-between p-3 rounded-xl border border-ink/15 hover:bg-bgsoft transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IconChat size={18} className="text-ink" />
                  <span className="font-medium text-ink">Gửi tin nhắn</span>
                </div>
                <span className="text-xs text-ink-muted">SMS</span>
              </a>
            </div>

            <p className="text-xs text-ink-muted text-center">
              AutoCare chỉ kết nối — không thu phí.
            </p>
          </div>
        </div>
      )}

      {/* ============= MODAL: Booking ============= */}
      {showBooking && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center"
          onClick={() => setShowBooking(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 m-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg">Đặt lịch xem xe</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {car.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBooking(false)}
                aria-label="Đóng"
                className="p-1 rounded-md hover:bg-bgsoft text-ink-muted"
              >
                <IconClose size={20} />
              </button>
            </div>

            {/* Date picker */}
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">
                Chọn ngày
              </label>
              <div className="grid grid-cols-4 gap-2">
                {bookingDays.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => {
                      setBookingDate(d.iso);
                      setBookingSlot("");
                    }}
                    className={[
                      "py-2 px-1 rounded-lg border text-center transition-colors",
                      bookingDate === d.iso
                        ? "bg-primary text-white border-primary"
                        : "border-ink/15 hover:border-primary/40",
                    ].join(" ")}
                  >
                    <div className="text-[10px] uppercase opacity-80">
                      {d.weekday}
                    </div>
                    <div className="text-sm font-bold">{d.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Slot picker */}
            {bookingDate && (
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block">
                  Chọn khung giờ
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {bookingSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setBookingSlot(slot)}
                      className={[
                        "py-2 text-sm rounded-lg border transition-colors",
                        bookingSlot === slot
                          ? "bg-primary text-white border-primary"
                          : "border-ink/15 hover:border-primary/40",
                      ].join(" ")}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-3 mb-4">
              <input
                type="text"
                placeholder="Họ tên của bạn *"
                value={bookingName}
                onChange={(e) => setBookingName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink/15 bg-white text-sm outline-none focus:border-primary"
              />
              <input
                type="tel"
                placeholder="Số điện thoại *"
                value={bookingPhone}
                onChange={(e) => setBookingPhone(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-ink/15 bg-white text-sm outline-none focus:border-primary"
              />
            </div>

            <Button
              size="lg"
              fullWidth
              disabled={!bookingDate || !bookingSlot || !bookingName || !bookingPhone}
              onClick={() => {
                setShowBooking(false);
                t.success(
                  `Đã đặt lịch xem xe ${car.title} lúc ${bookingSlot} ngày ${bookingDate}. ${car.seller.name} sẽ liên hệ bạn.`,
                );
                setBookingDate("");
                setBookingSlot("");
                setBookingName("");
                setBookingPhone("");
              }}
            >
              <IconCheck size={16} />
              Xác nhận đặt lịch
            </Button>
            <Button
              size="md"
              variant="ghost"
              fullWidth
              className="mt-2"
              onClick={() => setShowBooking(false)}
            >
              Huỷ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}