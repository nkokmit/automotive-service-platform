import { useState } from "react";
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
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import { featuredGarages } from "../data/mock";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + "đ";

const tabs = [
  { id: "intro", label: "Giới thiệu" },
  { id: "services", label: "Dịch vụ & bảng giá" },
  { id: "reviews", label: "Đánh giá" },
  { id: "gallery", label: "Hình ảnh" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export default function GarageDetail() {
  const { slug } = useParams();
  const garage = featuredGarages.find((g) => g.slug === slug) || featuredGarages[0];
  const [tab, setTab] = useState<TabId>("intro");
  const [showBooking, setShowBooking] = useState(false);

  return (
    <div className="container-page py-6 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">Trang chủ</Link>
        <span>/</span>
        <Link to="/garages" className="hover:text-primary">Garage</Link>
        <span>/</span>
        <span className="text-ink">{garage.name}</span>
      </nav>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <div>
          {/* Hero gallery */}
          <div className="grid grid-cols-4 gap-2 aspect-[16/9] mb-6">
            <div className="col-span-3 rounded-2xl bg-bgsoft overflow-hidden">
              <img
                src={garage.gallery[0] || garage.image}
                alt={garage.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-rows-2 gap-2">
              {(garage.gallery.slice(1, 3).length
                ? garage.gallery.slice(1, 3)
                : [garage.image, garage.image]
              ).map((src, i) => (
                <div
                  key={i}
                  className="rounded-2xl bg-bgsoft overflow-hidden"
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold">{garage.name}</h1>
              {garage.openNow && <Badge tone="primary">Đang mở</Badge>}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-ink-light">
              <div className="flex items-center gap-1">
                <IconMapPin size={16} /> {garage.address}
              </div>
              <div className="flex items-center gap-1">
                <IconPhone size={16} /> {garage.phone}
              </div>
              <div className="flex items-center gap-1">
                <IconClock size={16} /> {garage.workingHours}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <IconStar
                    key={s}
                    size={16}
                    className={
                      s <= Math.round(garage.rating)
                        ? "text-accent-hover"
                        : "text-ink/15"
                    }
                  />
                ))}
              </div>
              <span className="font-semibold">{garage.rating}</span>
              <span className="text-ink-muted text-sm">
                ({garage.reviewsCount} đánh giá)
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-ink/10 mb-6 sticky top-16 bg-white z-10">
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
          {tab === "intro" && (
            <div className="space-y-6">
              <div>
                <h2 className="font-semibold text-lg mb-3">Giới thiệu</h2>
                <p className="text-ink-light leading-relaxed">
                  {garage.description}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-3">Tiện ích</h3>
                <div className="grid grid-cols-2 gap-2">
                  {garage.amenities.map((a) => (
                    <div
                      key={a}
                      className="flex items-center gap-2 text-sm text-ink-light"
                    >
                      <span className="w-5 h-5 rounded-full bg-accent text-ink flex items-center justify-center">
                        <IconCheck size={12} />
                      </span>
                      {a}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "services" && (
            <div className="space-y-3">
              {garage.serviceMenu.map((s) => (
                <Card key={s.id} hover={false}>
                  <div className="p-5 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <IconWrench size={16} className="text-primary" />
                        <h3 className="font-semibold">{s.name}</h3>
                      </div>
                      <p className="text-sm text-ink-light mb-2">
                        {s.description}
                      </p>
                      <div className="text-xs text-ink-muted">
                        Thời gian: ~{s.durationMin} phút
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-ink-muted">Từ</div>
                      <div className="font-bold text-primary text-lg">
                        {formatVND(s.priceFrom)}
                      </div>
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowBooking(true)}
                      >
                        Chọn
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {tab === "reviews" && (
            <div className="space-y-4">
              {garage.reviews.length === 0 ? (
                <p className="text-ink-light text-sm">
                  Chưa có đánh giá nào.
                </p>
              ) : (
                garage.reviews.map((r) => (
                  <Card key={r.id} hover={false}>
                    <div className="p-5 flex gap-3">
                      <img
                        src={r.avatar}
                        alt={r.author}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{r.author}</span>
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
                ))
              )}
            </div>
          )}

          {tab === "gallery" && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(garage.gallery.length
                ? garage.gallery
                : [garage.image, garage.image, garage.image]
              ).map((src, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl bg-bgsoft overflow-hidden"
                >
                  <img src={src} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Booking widget (sticky) */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <div className="p-5">
              <h3 className="font-semibold mb-1">Đặt lịch nhanh</h3>
              <p className="text-xs text-ink-muted mb-4">
                Chọn dịch vụ, ngày và khung giờ phù hợp
              </p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Dịch vụ</label>
                  <select className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm">
                    {garage.serviceMenu.map((s) => (
                      <option key={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Ngày</label>
                  <div className="flex items-center gap-2 h-11 px-3 rounded-xl border border-ink/15 bg-white">
                    <IconCalendar size={18} className="text-ink-muted" />
                    <input
                      type="date"
                      defaultValue="2026-10-03"
                      className="flex-1 bg-transparent outline-none text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Khung giờ</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(garage.availability["2026-10-03"] || []).map((slot) => (
                      <button
                        key={slot}
                        className="py-2 text-sm border border-ink/15 rounded-lg hover:bg-bgsoft hover:border-primary transition-colors"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Biển số xe (tuỳ chọn)
                  </label>
                  <input
                    placeholder="VD: 50A-123.45"
                    className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Ghi chú</label>
                  <textarea
                    placeholder="Mô tả vấn đề của xe..."
                    rows={3}
                    className="w-full p-3 rounded-xl border border-ink/15 bg-white text-sm outline-none focus:border-primary resize-none"
                  />
                </div>
                <Button
                  size="lg"
                  fullWidth
                  onClick={() => setShowBooking(true)}
                >
                  Xác nhận đặt lịch
                  <IconArrowRight size={16} />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Booking confirmation modal */}
      {showBooking && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setShowBooking(false)}
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
            <p className="text-sm text-ink-light text-center mb-6">
              Garage sẽ xác nhận lịch trong vòng 30 phút qua email/SMS.
            </p>
            <div className="space-y-3">
              <Button fullWidth size="lg" onClick={() => setShowBooking(false)}>
                Xác nhận
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="outline"
                onClick={() => setShowBooking(false)}
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