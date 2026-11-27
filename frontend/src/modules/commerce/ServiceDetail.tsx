import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  IconRefresh,
  IconWarning,
  IconPackage,
} from "../../components/icons";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useToast } from "../../components/Toast";
import { GARAGE } from "../../config/garage";
import { useCatalog, displayDescription } from "../../data/catalog";
import { findServiceBySlug } from "../../data/catalogTypes";
import { bookingApi } from "../../api/endpoints/booking";
import { customerVehicleApi } from "../../api/endpoints/customerVehicle";
import { inventoryApi } from "../../api/endpoints/inventory";
import type {
  AvailabilitySlotResponse,
  ServiceBomResponse,
} from "../../api/types";
import { useAuth } from "../../data/authStore";

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
      "Giá hơi cao một chút nhưng chất lượng ổn. Xưởng sạch sẽ, có phòng chờ máy lạnh.",
  },
  {
    id: "rv3",
    author: "Lê Văn C",
    avatar:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=70",
    rating: 5,
    date: "28/08/2026",
    content:
      "Đặt lịch online tiện lợi, xưởng xác nhận nhanh. Kỹ thuật viên tay nghề cao.",
  },
];

type TabId = "description" | "includes" | "policy" | "reviews";

/** Khoảng ngày mà backend booking-service cho phép tra cứu (≤ 14 ngày). */
const AVAILABILITY_WINDOW_DAYS = 7;

/**
 * Kiểm tra chuỗi có phải UUID hợp lệ hay không.
 *
 * Backend `booking-service` nhận `@RequestParam("serviceIds") List<UUID>` —
 * nếu gửi chuỗi không phải UUID (như `id` của dữ liệu mẫu: `"sv1"`), Spring
 * không bind được và trả 400 "Tham số 'serviceIds' phải là List".
 *
 * Kiểm tra ở frontend để không gửi request chắc chắn thất bại, thay vì để
 * người dùng thấy thông báo lỗi kỹ thuật.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): boolean {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

/** Sinh danh sách N ngày tới (bắt đầu từ hôm nay). */
function getNextDays(count: number) {
  const days: { iso: string; label: string; weekday: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const weekday = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"][d.getDay()];
    days.push({ iso, label: `${d.getDate()}/${d.getMonth() + 1}`, weekday });
  }
  return days;
}

export default function ServiceDetail() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const t = useToast();
  const { user } = useAuth();
  const { services, loading: catalogLoading, usingFallback } = useCatalog();

  /**
   * Tìm dịch vụ theo slug trong URL.
   *
   * <p>Dùng `findServiceBySlug` để chịu được việc slug mẫu (khi chưa đăng
   * nhập) khác slug thật (sau khi đăng nhập) — xem giải thích trong
   * `data/catalogTypes.ts`.
   */
  const service = useMemo(
    () => (slug ? findServiceBySlug(services, slug) : null),
    [services, slug],
  );

  const [tab, setTab] = useState<TabId>("description");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [licensePlate, setLicensePlate] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const days = useMemo(() => getNextDays(AVAILABILITY_WINDOW_DAYS), []);
  const [slots, setSlots] = useState<AvailabilitySlotResponse[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  // BOM — định mức phụ tùng đi kèm dịch vụ (`GET /api/services/{id}/bom`).
  const [bom, setBom] = useState<ServiceBomResponse[]>([]);
  const [bomLoading, setBomLoading] = useState(false);
  const [bomError, setBomError] = useState<string | null>(null);

  useEffect(() => {
    // Catalog rơi về dữ liệu mẫu → id không phải UUID thật, gọi API vô nghĩa.
    if (!service || usingFallback) return;
    let cancelled = false;
    setBomLoading(true);
    setBomError(null);
    inventoryApi
      .getServiceBom(service.id)
      .then((data) => {
        if (cancelled) return;
        setBom(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (cancelled) return;
        setBom([]);
        setBomError(
          err instanceof Error
            ? err.message
            : "Không tải được định mức phụ tùng",
        );
      })
      .finally(() => {
        if (!cancelled) setBomLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [service, usingFallback]);

  // Chọn ngày đầu tiên khi có dịch vụ
  useEffect(() => {
    if (!selectedDate && days.length > 0) setSelectedDate(days[0].iso);
  }, [days, selectedDate]);

  // Nạp lịch trống thật từ booking-service
  const loadSlots = useCallback(
    async (date: string) => {
      if (!service || !date) return;
      // Chưa đăng nhập → endpoint `GET /api/bookings/availability` cần token
      // (gateway chặn 401) → trả về lỗi kỹ thuật "Chưa đăng nhập hoặc token
      // không hợp lệ" cho khách. Bỏ qua request và hiển thị lời nhắc đăng
      // nhập kèm nút bấm thay vì để lỗi kỹ thuật lộ ra.
      if (!user) {
        setSlots([]);
        setSlotsError(null);
        setSlotsLoading(false);
        return;
      }
      // `service.id` phải là UUID mới gọi được API: backend nhận
      // `@RequestParam("serviceIds") List<UUID>`, và khi catalog rơi về dữ liệu
      // mẫu thì `service.id` là chuỗi kiểu "sv1" — Spring không bind được và
      // trả 400 "Tham số 'serviceIds' phải là List" (lỗi kỹ thuật lộ ra
      // nguyên văn cho người dùng). Kiểm tra `isUuid` chính xác hơn cờ
      // `usingFallback` — cờ đó còn bật khi chỉ phụ tùng rơi về dữ liệu mẫu,
      // trong khi dịch vụ vẫn thật và đặt lịch vẫn hợp lệ.
      if (!isUuid(service.id)) {
        setSlots([]);
        setSlotsError(null);
        setSlotsLoading(false);
        return;
      }
      setSlotsLoading(true);
      setSlotsError(null);
      try {
        const data = await bookingApi.getAvailability({
          from: date,
          to: date,
          serviceIds: [service.id],
        });
        setSlots(data);
      } catch (err) {
        setSlots([]);
        setSlotsError(
          err instanceof Error
            ? err.message
            : "Không tải được lịch trống từ máy chủ",
        );
      } finally {
        setSlotsLoading(false);
      }
    },
    [service, usingFallback, user],
  );

  useEffect(() => {
    if (!selectedDate) return;
    setSelectedSlot("");
    void loadSlots(selectedDate);
  }, [selectedDate, loadSlots]);

  // Gợi ý biển số từ hồ sơ xe của khách
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    customerVehicleApi
      .listVehicles({ isActive: true, size: 20 })
      .then((page) => {
        if (cancelled) return;
        const first = page.items?.[0];
        if (first?.licensePlate) setLicensePlate(first.licensePlate);
      })
      .catch(() => {
        /* không có xe — để user nhập tay */
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const tabs: { id: TabId; label: string }[] = [
    { id: "description", label: "Mô tả" },
    { id: "includes", label: "Bao gồm" },
    { id: "policy", label: "Chính sách" },
    { id: "reviews", label: `Đánh giá (${mockReviews.length})` },
  ];

  // =========================
  // RENDER: không tìm thấy
  // =========================
  if (!catalogLoading && !service) {
    return (
      <div className="container-page py-12">
        <div className="bg-white border border-ink/10 rounded-2xl p-10 text-center max-w-md mx-auto">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
            <IconWrench size={32} className="text-ink-muted" />
          </div>
          <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
            404 — Không tìm thấy dịch vụ
          </p>
          <h1 className="text-xl font-bold mb-2">
            Dịch vụ không tồn tại hoặc đã ngừng cung cấp
          </h1>
          <p className="text-sm text-ink-light mb-6">
            Slug <code className="bg-bgsoft px-1.5 py-0.5 rounded">{slug}</code>{" "}
            không có trong danh mục.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link to="/services">
              <Button>Xem dịch vụ khác</Button>
            </Link>
            <Link to="/">
              <Button variant="outline">Về trang chủ</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="container-page py-12">
        <div className="h-64 bg-bgsoft rounded-2xl animate-pulse" />
      </div>
    );
  }

  // =========================
  // Đặt lịch
  // =========================
  const handleConfirmBooking = async () => {
    if (!user) {
      t.info("Vui lòng đăng nhập để đặt lịch");
      navigate("/login", { state: { from: `/services/${slug}` } });
      return;
    }
    // `service.id` phải là UUID mới đặt lịch được (backend nhận
    // `List<UUID>`). Khi catalog rơi về dữ liệu mẫu thì id là "sv1" — chặn
    // ở đây để không gửi request chắc chắn thất bại.
    if (!isUuid(service.id)) {
      t.error(
        "Chưa tải được thông tin dịch vụ từ máy chủ, không thể đặt lịch. Vui lòng tải lại trang.",
      );
      return;
    }
    if (!selectedSlot) {
      t.info("Vui lòng chọn khung giờ");
      return;
    }
    if (!licensePlate.trim()) {
      t.info("Vui lòng nhập biển số xe");
      return;
    }

    setSubmitting(true);
    try {
      await bookingApi.createBooking({
        startAt: selectedSlot,
        serviceIds: [service.id],
        licensePlate: licensePlate.trim(),
        customerNote: customerNote.trim() || undefined,
      });
      setShowConfirm(false);
      t.success("Đặt lịch thành công! Chúng tôi sẽ xác nhận trong 30 phút.");
      navigate("/profile?tab=bookings");
    } catch (err) {
      t.error(
        err instanceof Error
          ? err.message
          : "Không đặt được lịch. Vui lòng thử lại.",
      );
    } finally {
      setSubmitting(false);
    }
  };

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

      {usingFallback && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {isUuid(service.id)
            ? "Máy chủ chưa có dữ liệu phụ tùng — đang hiển thị dữ liệu mẫu."
            : "Đang hiển thị dịch vụ mẫu. Đặt lịch sẽ được ghi nhận khi hệ thống kết nối được máy chủ."}
        </div>
      )}

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
                  {service.bookingsCount > 0 && (
                    <span className="text-ink-muted text-sm">
                      ({service.bookingsCount} lượt đặt)
                    </span>
                  )}
                </div>

                {/* Thông tin xưởng — dùng chung hồ sơ GARAGE */}
                <div className="bg-bgsoft rounded-xl p-3 space-y-1.5 text-sm">
                  <div className="font-medium text-ink">
                    Thực hiện tại{" "}
                    <span className="text-primary">{GARAGE.name}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-ink-muted">
                    <IconMapPin size={12} />
                    {GARAGE.address}, {GARAGE.district}, {GARAGE.city}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1 text-ink-light">
                      <IconStar size={12} className="text-accent-hover" />
                      <span className="font-medium">{GARAGE.rating}</span>
                      <span className="text-ink-muted">
                        ({GARAGE.reviewsCount})
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
              {tabs.map((t2) => (
                <button
                  key={t2.id}
                  onClick={() => setTab(t2.id)}
                  className={[
                    "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    tab === t2.id
                      ? "border-primary text-primary"
                      : "border-transparent text-ink-muted hover:text-ink",
                  ].join(" ")}
                >
                  {t2.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          {tab === "description" && (
            <div className="prose prose-sm max-w-none">
              <p className="text-ink-light leading-relaxed whitespace-pre-line">
                {displayDescription(service)}
              </p>
            </div>
          )}

          {tab === "includes" && (
            <div>
              <h3 className="font-semibold mb-3">Dịch vụ bao gồm</h3>
              {service.includes.length > 0 ? (
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
              ) : (
                <p className="text-sm text-ink-light">
                  Danh mục chưa có mô tả chi tiết. Vui lòng liên hệ{" "}
                  {GARAGE.name} qua hotline {GARAGE.hotline} để được tư vấn.
                </p>
              )}

              {/* Định mức phụ tùng thật — GET /api/services/{id}/bom */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5">
                    <IconPackage size={15} className="text-primary" />
                    Định mức phụ tùng đi kèm
                  </h4>
                </div>

                {bomLoading ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-11 bg-bgsoft rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : bomError ? (
                  <div className="text-sm text-ink-muted p-3 bg-bgsoft rounded-lg flex items-start gap-2">
                    <IconWarning size={14} className="shrink-0 mt-0.5" />
                    <span>
                      Không tải được định mức phụ tùng từ máy chủ.
                      <button
                        onClick={() => setBomError(null)}
                        className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <IconRefresh size={12} /> Bỏ qua
                      </button>
                    </span>
                  </div>
                ) : bom.length === 0 ? (
                  <p className="text-sm text-ink-muted p-3 bg-bgsoft rounded-lg">
                    Dịch vụ này không có định mức phụ tùng cố định — xưởng sẽ
                    tư vấn linh kiện phù hợp khi tiếp nhận xe.
                  </p>
                ) : (
                  <div className="border border-ink/8 rounded-xl divide-y divide-ink/5 overflow-hidden">
                    {bom.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-ink line-clamp-1">
                            {b.partName}
                          </div>
                          <div className="text-[11px] text-ink-muted font-mono">
                            {b.partSku}
                            {b.note ? ` · ${b.note}` : ""}
                          </div>
                        </div>
                        <div className="text-xs text-ink-muted shrink-0">
                          {b.default_quantity} {b.partUnit}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {service.requirements.length > 0 && (
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
                  Miễn phí hủy lịch trước <strong>24 giờ</strong> so với giờ
                  hẹn. Sau thời gian này, có thể áp dụng phí 30% giá trị dịch
                  vụ.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-ink mb-1">Bảo hành</h4>
                <p>
                  Bảo hành <strong>{service.warrantyMonths} tháng</strong> cho
                  dịch vụ và phụ tùng chính hãng. Áp dụng tại {GARAGE.name}.
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
          )}
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
                <div className="grid grid-cols-4 gap-2">
                  {days.map((d) => {
                    const isSelected = selectedDate === d.iso;
                    return (
                      <button
                        key={d.iso}
                        onClick={() => setSelectedDate(d.iso)}
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
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Slot picker — dữ liệu thật từ booking-service */}
              <div className="mb-4">
                <label className="text-sm font-medium mb-2 block flex items-center gap-1">
                  <IconClock size={14} />
                  Chọn khung giờ
                </label>
                {slotsLoading ? (
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="py-2 rounded-lg bg-bgsoft animate-pulse h-9"
                      />
                    ))}
                  </div>
                ) : !user ? (
                  /* Chưa đăng nhập → không gọi được API lịch trống.
                     Hiện lời nhắc + nút đăng nhập thay vì lỗi kỹ thuật. */
                  <div className="p-3 bg-bgsoft rounded-lg flex items-center justify-between gap-3">
                    <span className="text-sm text-ink-muted">
                      Hãy đăng nhập để xem khung giờ trống và đặt lịch.
                    </span>
                    <Button
                      size="sm"
                      onClick={() =>
                        navigate("/login", {
                          state: { from: `/services/${slug}` },
                        })
                      }
                    >
                      Đăng nhập
                    </Button>
                  </div>
                ) : slotsError ? (
                  <div className="text-sm text-ink-muted p-3 bg-bgsoft rounded-lg flex items-start gap-2">
                    <IconWarning size={14} className="shrink-0 mt-0.5" />
                    <span>
                      {slotsError}
                      <button
                        onClick={() => void loadSlots(selectedDate)}
                        className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
                      >
                        <IconRefresh size={12} /> Thử lại
                      </button>
                    </span>
                  </div>
                ) : !isUuid(service.id) ? (
                  <p className="text-sm text-ink-muted p-3 bg-bgsoft rounded-lg">
                    Chưa tải được danh mục dịch vụ từ máy chủ nên chưa hiển thị
                    lịch trống. Vui lòng tải lại trang.
                  </p>
                ) : slots.length === 0 ? (
                  <p className="text-sm text-ink-muted p-3 bg-bgsoft rounded-lg">
                    Ngày này đã kín lịch. Vui lòng chọn ngày khác.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const isSelected = selectedSlot === slot.startAt;
                      const time = new Date(slot.startAt).toLocaleTimeString(
                        "vi-VN",
                        { hour: "2-digit", minute: "2-digit" },
                      );
                      return (
                        <button
                          key={slot.startAt}
                          onClick={() => setSelectedSlot(slot.startAt)}
                          className={[
                            "py-2 text-sm rounded-lg border transition-colors",
                            isSelected
                              ? "bg-primary text-white border-primary"
                              : "border-ink/15 hover:border-primary/40",
                          ].join(" ")}
                        >
                          {time}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Optional fields */}
              <div className="space-y-2 mb-4">
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="Biển số xe (VD: 30A-123.45)"
                  className="w-full h-10 px-3 rounded-lg border border-ink/15 bg-white text-sm outline-none focus:border-primary"
                />
                <input
                  type="text"
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Ghi chú cho kỹ thuật viên (tuỳ chọn)"
                  className="w-full h-10 px-3 rounded-lg border border-ink/15 bg-white text-sm outline-none focus:border-primary"
                />
              </div>

              <Button
                size="lg"
                fullWidth
                disabled={!selectedSlot || submitting}
                onClick={() => setShowConfirm(true)}
              >
                {selectedSlot ? "Xác nhận đặt lịch" : "Chọn ngày & giờ"}
                <IconArrowRight size={16} />
              </Button>

              <p className="text-xs text-ink-muted text-center mt-3">
                {GARAGE.name} sẽ xác nhận trong vòng 30 phút qua SMS/email
              </p>
            </div>
          </Card>

          {/* Contact card */}
          <Card className="mt-4" hover={false}>
            <div className="p-4">
              <h4 className="font-semibold text-sm mb-2">Liên hệ xưởng</h4>
              <a
                href={GARAGE.telHref}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <IconPhone size={16} />
                {GARAGE.phone}
              </a>
              <p className="text-xs text-ink-muted mt-2">
                Giờ mở cửa: {GARAGE.workingHours}
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
              <div className="text-ink-light">📍 {GARAGE.name}</div>
              <div className="text-ink-light">
                📅 {selectedDate} ·{" "}
                {selectedSlot
                  ? new Date(selectedSlot).toLocaleString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })
                  : ""}
              </div>
              <div className="text-ink-light">
                🚗 Biển số: {licensePlate || "(chưa nhập)"}
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
                disabled={submitting}
                onClick={handleConfirmBooking}
              >
                {submitting ? "Đang đặt lịch..." : "Xác nhận đặt lịch"}
              </Button>
              <Button
                fullWidth
                size="lg"
                variant="outline"
                disabled={submitting}
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
