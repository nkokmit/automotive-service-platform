import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  IconMapPin,
  IconStar,
  IconPhone,
  IconClock,
  IconCalendar,
  IconArrowRight,
  IconCheck,
  IconWrench,
  IconShield,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import RecommendationWidget from "../components/RecommendationWidget";
import { services } from "../data/mock";
import { recommendForService } from "../data/recommend";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + "đ";

// Mock reviews cho từng dịch vụ
const mockReviews = [
  {
    id: "rv1",
    author: "Nguyễn Văn A",
    avatar:
      "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=70",
    rating: 5,
    date: "12/09/2026",
    content:
      "Dịch vụ tốt, nhân viên nhiệt tình. Làm nhanh, đúng giờ. Sẽ quay lại.",
  },
  {
    id: "rv2",
    author: "Trần Thị B",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=200&q=70",
    rating: 4,
    date: "05/09/2026",
    content:
      "Giá hơi cao một chút nhưng chất lượng ổn. Garage sạch sẽ, có phòng chờ máy lạnh.",
  },
  {
    id: "rv3",
    author: "Lê Văn C",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=70",
    rating: 5,
    date: "28/08/2026",
    content:
      "Đặt lịch online tiện lợi, garage xác nhận nhanh. Kỹ thuật viên tay nghề cao.",
  },
];

// Sinh danh sách 7 ngày tới
function getNext7Days() {
  const days: { iso: string; date: Date; label: string; weekday: string }[] =
    [];
  const today = new Date("2026-10-03"); // mock today cho demo
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const weekday = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
    const label = `${d.getDate()}/${d.getMonth() + 1}`;
    days.push({ iso, date: d, label, weekday });
  }
  return days;
}

type TabId = "description" | "includes" | "policy" | "reviews";

export default function ServiceDetail() {
  const { slug } = useParams();
  const service =
    services.find((s) => s.slug === slug) || services[0];

  const [tab, setTab] = useState<TabId>("description");
  const [selectedDate, setSelectedDate] = useState<string>(
    Object.keys(service.slotsByDate)[0] || ""
  );
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [showConfirm, setShowConfirm] = useState(false);

  const days = useMemo(() => getNext7Days(), []);
  const availableDays = days.filter(
    (d) => service.slotsByDate[d.iso]?.length
  );
  const slots = service.slotsByDate[selectedDate] || [];

  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Mô tả" },
    { id: "includes", label: "Bao gồm" },
    { id: "policy", label: "Chính sách" },
    { id: "reviews", label: `Đánh giá (${mockReviews.length})` },
  ];

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <Link to="/services" className="hover:text-primary">
          Dịch vụ
        </Link>
        <span>/</span>
        <span className="text-ink line-clamp-1">{service.name}</span>
      </nav>

      <div className="grid lg:grid-cols-[1fr_380px] gap-6">
        {/* LEFT: thông tin dịch vụ */}
        <div>
          {/* Hero */}
          <Card hover={false}>
            <div className="grid sm:grid-cols-[280px_1fr] gap-0">
              <div className="aspect-square sm:aspect-auto overflow-hidden rounded-t-2xl sm:rounded-l-2xl sm:rounded-tr-none bg-bgsoft">
                <img
                  src={service.image}
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-5">
                <div className="flex items-center gap-1.5 text-xs text-ink-muted mb-2">
                  <IconWrench size={12} />
                  <span>{service.category}</span>
                  {service.isPopular && (
                    <Badge tone="primary" className="ml-1">
                      Phổ biến
                    </Badge>
                  )}
                </div>
                <h1 className="text-xl md:text-2xl font-bold leading-tight mb-3">
                  {service.name}
                </h1>

                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <IconStar
                      key={s}
                      size={16}
                      className={
                        s <= Math.round(service.rating)
                          ? "text-accent-hover"
                          : "text-ink/15"
                      }
                    />
                  ))}
                  <span className="font-semibold ml-1">{service.rating}</span>
                  <span className="text-ink-muted text-sm">
                    ({service.bookingsCount} lượt đặt)
                  </span>
                </div>

                {/* Provider info */}
                <div className="bg-bgsoft rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="font-medium text-ink">
                    Cung cấp bởi{" "}
                    <span className="text-primary">
                      {service.provider.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink-muted">
                    <IconMapPin size={12} />
                    {service.provider.address}, {service.provider.city}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-ink-light">
                      <IconStar size={12} className="text-accent-hover" />
                      <span className="font-medium">
                        {service.provider.rating}
                      </span>
                      <span className="text-ink-muted">
                        ({service.provider.reviewsCount})
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-ink-muted">
                      <IconClock size={12} />~{service.durationMin} phút
                    </div>
                    {service.warrantyMonths > 0 && (
                      <div className="flex items-center gap-1 text-primary">
                        <IconShield size={12} />
                        BH {service.warrantyMonths} tháng
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <div className="border-b border-ink/10 mt-6 mb-5 sticky top-16 bg-white z-10">
            <div className="flex gap-1 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={[
                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    tab === t.id
                      ? "border-primary text-primary"
                      : "border-transparent text-ink-muted hover:text-ink",
                  ].join(" ")}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {tab === "description" && (
            <div className="prose prose-sm max-w-none">
              <p className="text-ink-light leading-relaxed">
                {service.description}
              </p>
            </div>
          )}

          {tab === "includes" && (
            <div>
              <h3 className="font-semibold mb-3">Dịch vụ bao gồm</h3>
              <ul className="space-y-2">
                {service.includes.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-ink-light"
                  >
                    <span className="w-5 h-5 mt-0.5 rounded-full bg-accent text-ink flex items-center justify-center shrink-0">
                      <IconCheck size={12} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              {service.requirements && service.requirements.length > 0 && (
                <div className="mt-6 p-4 bg-bgsoft rounded-xl">
                  <h4 className="font-semibold text-sm mb-2">
                    Yêu cầu / Lưu ý
                  </h4>
                  <ul className="space-y-1 text-sm text-ink-light">
                    {service.requirements.map((r) => (
                      <li key={r}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === "policy" && (
            <div className="space-y-4 text-sm text-ink-light">
              <div>
                <h4 className="font-semibold text-ink mb-1">
                  Chính sách hủy lịch
                </h4>
                <p>
                  Miễn phí hủy lịch trước{" "}
                  <strong>24 giờ</strong> so với giờ hẹn. Sau thời gian này,
                  có thể áp dụng phí 30% giá trị dịch vụ.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-ink mb-1">Bảo hành</h4>
                <p>
                  Bảo hành{" "}
                  <strong>{service.warrantyMonths} tháng</strong> cho dịch vụ
                  và phụ tùng chính hãng. Áp dụng tại garage đã thực hiện.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-ink mb-1">
                  Phương thức thanh toán
                </h4>
                <p>Tiền mặt, chuyển khoản ngân hàng, ví MoMo, ZaloPay.</p>
              </div>
            </div>
          )}

          {tab === "reviews" && (
            <div className="space-y-4">
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
                        <span className="font-medium">{r.author}</span>
                        <span className="text-xs text-ink-muted">
                          {r.date}
                        </span>
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
          )}

          {/* Related parts — gợi ý phụ tùng phù hợp với dịch vụ */}
          <ServiceRelatedParts
            serviceCategory={service.category}
            serviceName={service.name}
          />
        </div>

        {/* RIGHT: booking widget sticky */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <div className="p-5">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-sm text-ink-muted">Giá từ</span>
                {service.priceTo > service.priceFrom && (
                  <span className="text-xs text-ink-muted">
                    đến {formatVND(service.priceTo)}
                  </span>
                )}
              </div>
              <div className="text-2xl font-bold text-primary mb-4">
                {formatVND(service.priceFrom)}
              </div>

              {/* Date picker */}
              <div className="mb-3">
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <IconCalendar size={14} />
                  Chọn ngày
                </label>
                {availableDays.length === 0 ? (
                  <p className="text-sm text-ink-muted p-3 bg-bgsoft rounded-lg">
                    Chưa có lịch trống trong tuần tới.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableDays.map((d) => {
                      const count = service.slotsByDate[d.iso].length;
                      const isSelected = selectedDate === d.iso;
                      return (
                        <button
                          key={d.iso}
                          onClick={() => {
                            setSelectedDate(d.iso);
                            setSelectedSlot("");
                          }}
                          className={[
                            "py-2 px-1 rounded-lg border text-center transition-colors",
                            isSelected
                              ? "bg-primary text-white border-primary"
                              : "border-ink/15 hover:border-primary/40",
                          ].join(" ")}
                        >
                          <div className="text-[10px] uppercase opacity-80">
                            {d.weekday}
                          </div>
                          <div className="text-sm font-bold">{d.label}</div>
                          <div
                            className={[
                              "text-[10px]",
                              isSelected
                                ? "text-white/80"
                                : "text-ink-muted",
                            ].join(" ")}
                          >
                            {count} slot
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Slot picker */}
              {slots.length > 0 && (
                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                    <IconClock size={14} />
                    Chọn khung giờ
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={[
                            "py-2 text-sm rounded-lg border transition-colors",
                            isSelected
                              ? "bg-primary text-white border-primary"
                              : "border-ink/15 hover:border-primary/40",
                          ].join(" ")}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Optional fields */}
              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  placeholder="Biển số xe (VD: 50A-123.45)"
                  className="w-full h-10 px-3 rounded-lg border border-ink/15 bg-white text-sm outline-none focus:border-primary"
                />
                <input
                  type="text"
                  placeholder="Hãng xe / Dòng xe (VD: Toyota Vios)"
                  className="w-full h-10 px-3 rounded-lg border border-ink/15 bg-white text-sm outline-none focus:border-primary"
                />
              </div>

              <Button
                size="lg"
                fullWidth
                disabled={!selectedSlot}
                onClick={() => setShowConfirm(true)}
              >
                {selectedSlot ? "Xác nhận đặt lịch" : "Chọn ngày & giờ"}
                <IconArrowRight size={16} />
              </Button>

              <p className="text-xs text-ink-muted text-center mt-3">
                Garage sẽ xác nhận trong vòng 30 phút qua SMS/email
              </p>
            </div>
          </Card>

          {/* Contact card */}
          <Card className="mt-4" hover={false}>
            <div className="p-4">
              <h4 className="font-semibold text-sm mb-2">Liên hệ garage</h4>
              <a
                href="tel:02438761234"
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <IconPhone size={16} />
                024 3876 1234
              </a>
              <p className="text-xs text-ink-muted mt-2">
                Giờ mở cửa: 08:00 - 19:00 (T2 - CN)
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mb-4 mx-auto">
              <IconCheck size={24} className="text-ink" />
            </div>
            <h3 className="font-bold text-lg text-center mb-2">
              Xác nhận đặt lịch?
            </h3>
            <div className="bg-bgsoft rounded-xl p-3 mb-4 text-sm space-y-1.5">
              <div className="font-semibold">{service.name}</div>
              <div className="text-ink-light">
                📍 {service.provider.name}
              </div>
              <div className="text-ink-light">
                📅 {selectedDate} · 🕐 {selectedSlot}
              </div>
              <div className="text-primary font-bold">
                {formatVND(service.priceFrom)}
              </div>
            </div>
            <p className="text-sm text-ink-light text-center mb-6">
              Bạn có thể hủy miễn phí trong vòng 24h trước giờ hẹn.
            </p>
            <div className="space-y-2">
              <Button
                fullWidth
                size="lg"
                onClick={() => {
                  setShowConfirm(false);
                  alert("Đặt lịch thành công! (mock)");
                }}
              >
                Xác nhận đặt lịch
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="outline"
                onClick={() => setShowConfirm(false)}
              >
                Huỷ
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =========================
// Related parts cho ServiceDetail
// =========================

function ServiceRelatedParts({
  serviceCategory,
  serviceName,
}: {
  serviceCategory: string;
  serviceName: string;
}) {
  const recommendations = useMemo(
    () => recommendForService(serviceCategory, 4),
    [serviceCategory],
  );

  if (recommendations.length === 0) return null;

  return (
    <RecommendationWidget
      items={recommendations}
      title="Phụ tùng liên quan"
      subtitle={`Phụ tùng phù hợp với dịch vụ "${serviceName}"`}
      viewAllHref="/parts"
      viewAllLabel="Xem thêm phụ tùng"
    />
  );
}