import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  IconCheck,
  IconArrowRight,
  IconArrowLeft,
  IconShield,
  IconCheckCircle,
  IconCash,
  IconBank,
  IconWallet,
  IconCreditCard,
  IconNote,
  IconTruck,
  IconPackage,
  IconStar,
} from "../components/icons";
import Card from "../components/Card";
import Badge from "../components/Badge";
import Button from "../components/Button";
import Input from "../components/Input";
import { useToast } from "../components/Toast";
import RecommendationWidget from "../components/RecommendationWidget";
import { type Part } from "../data/mock";
import {
  useCartLines,
  clearCart,
  formatCompactVND as compactVND,
  formatFullVND as fullVND,
} from "../data/cartStore";
import { recommendForCheckout } from "../data/recommend";

// =========================
// Mock Vietnam provinces + districts
// (Sẽ thay bằng API tỉnh/thành thật khi có backend)
// =========================
const PROVINCES: Record<string, string[]> = {
  "TP.HCM": ["Quận 1", "Quận 3", "Quận 7", "Bình Thạnh", "Gò Vấp", "Thủ Đức", "Tân Bình"],
  "Hà Nội": ["Ba Đình", "Hoàn Kiếm", "Hai Bà Trưng", "Đống Đa", "Cầu Giấy", "Thanh Xuân", "Long Biên"],
  "Đà Nẵng": ["Hải Châu", "Thanh Khê", "Sơn Trà", "Ngũ Hành Sơn", "Liên Chiểu"],
  "Hải Phòng": ["Hồng Bàng", "Lê Chân", "Ngô Quyền", "Kiến An"],
  "Cần Thơ": ["Ninh Kiều", "Bình Thuỷ", "Cái Răng", "Ô Môn"],
  "Bình Dương": ["Thủ Dầu Một", "Dĩ An", "Thuận An", "Bến Cát"],
  "Đồng Nai": ["Biên Hoà", "Long Khánh", "Nhơn Trạch"],
};

// =========================
// Shipping fee
// =========================
const FREE_SHIP_THRESHOLD = 500_000;
const STANDARD_SHIP_FEE = 30_000;
const EXPRESS_SHIP_FEE = 50_000;

// =========================
// Stepper
// =========================
type Step = 0 | 1 | 2;
const STEPS = [
  { id: 0, label: "Thông tin", sub: "Giao hàng" },
  { id: 1, label: "Thanh toán", sub: "Phương thức" },
  { id: 2, label: "Hoàn tất", sub: "Xác nhận" },
] as const;

// =========================
// Form types
// =========================
type ShippingForm = {
  fullName: string;
  phone: string;
  email: string;
  province: string;
  district: string;
  address: string;
  note: string;
  shippingMethod: "standard" | "express";
};

type PaymentMethod = "cod" | "bank" | "wallet" | "card";

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}[] = [
  {
    id: "cod",
    label: "Thanh toán khi nhận hàng (COD)",
    description: "Trả tiền mặt cho shipper khi nhận hàng",
    icon: IconCash,
  },
  {
    id: "bank",
    label: "Chuyển khoản ngân hàng",
    description: "QR code hiển thị sau khi đặt hàng",
    icon: IconBank,
  },
  {
    id: "wallet",
    label: "Ví điện tử (MoMo, ZaloPay)",
    description: "Thanh toán qua ví MoMo hoặc ZaloPay",
    icon: IconWallet,
  },
  {
    id: "card",
    label: "Thẻ tín dụng / Ghi nợ",
    description: "Visa, MasterCard, JCB, Napas",
    icon: IconCreditCard,
  },
];

// =========================
// Main component
// =========================
export default function Checkout() {
  const navigate = useNavigate();
  const t = useToast();
  const lines = useCartLines();

  // =========================
  // Guard: nếu giỏ trống → redirect về /parts
  // =========================
  useEffect(() => {
    if (lines.length === 0) {
      t.info("Giỏ hàng trống. Vui lòng chọn sản phẩm trước khi thanh toán.");
      navigate("/parts", { replace: true });
    }
  }, [lines.length, navigate, t]);

  // Step state
  const [step, setStep] = useState<Step>(0);

  // Form state
  const [form, setForm] = useState<ShippingForm>({
    fullName: "",
    phone: "",
    email: "",
    province: "",
    district: "",
    address: "",
    note: "",
    shippingMethod: "standard",
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");

  // Errors
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingForm, string>>>({});

  // Order result state (step 2)
  const [orderId, setOrderId] = useState<string | null>(null);

  // =========================
  // Derived
  // =========================
  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.lineTotal, 0),
    [lines],
  );
  const totalCount = useMemo(
    () => lines.reduce((s, l) => s + l.qty, 0),
    [lines],
  );
  const shipFee = useMemo(() => {
    if (form.shippingMethod === "express") return EXPRESS_SHIP_FEE;
    if (subtotal >= FREE_SHIP_THRESHOLD) return 0;
    return STANDARD_SHIP_FEE;
  }, [form.shippingMethod, subtotal]);
  const total = subtotal + shipFee;

  const districts = useMemo(
    () => (form.province ? PROVINCES[form.province] || [] : []),
    [form.province],
  );

  // =========================
  // Handlers
  // =========================
  const updateField = <K extends keyof ShippingForm>(
    key: K,
    value: ShippingForm[K],
  ) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    // Reset district nếu đổi province
    if (key === "province") {
      setForm((f) => ({ ...f, district: "" }));
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Partial<Record<keyof ShippingForm, string>> = {};
    if (!form.fullName.trim()) newErrors.fullName = "Vui lòng nhập họ tên";
    if (!form.phone.trim()) {
      newErrors.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^0\d{9}$/.test(form.phone.replace(/\s/g, ""))) {
      newErrors.phone = "SĐT không hợp lệ (10 số, bắt đầu bằng 0)";
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Email không hợp lệ";
    }
    if (!form.province) newErrors.province = "Vui lòng chọn Tỉnh/Thành phố";
    if (!form.district) newErrors.district = "Vui lòng chọn Quận/Huyện";
    if (!form.address.trim()) newErrors.address = "Vui lòng nhập địa chỉ chi tiết";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (step === 0) {
      if (validateStep1()) {
        setStep(1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        t.error("Vui lòng điền đầy đủ thông tin bắt buộc");
      }
    } else if (step === 1) {
      // Place order — clear cart sau một tick nhỏ để tránh guard navigate
      const newOrderId = `ORD-${Date.now().toString().slice(-8)}`;
      setOrderId(newOrderId);
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
      t.success("Đặt hàng thành công!");
      // Defer clearCart để guard `lines.length === 0 && step !== 2` không redirect
      setTimeout(() => clearCart(), 50);
    }
  };

  const handleBack = () => {
    if (step === 0) {
      navigate("/cart");
    } else if (step === 1) {
      setStep(0);
    }
  };

  // =========================
  // Render guard
  // =========================
  if (lines.length === 0 && step !== 2) {
    return null;
  }

  return (
    <div className="container-page py-6 md:py-8">
      <nav className="text-xs text-ink-muted mb-4 flex items-center gap-2">
        <Link to="/" className="hover:text-primary">
          Trang chủ
        </Link>
        <span>/</span>
        <Link to="/cart" className="hover:text-primary">
          Giỏ hàng
        </Link>
        <span>/</span>
        <span className="text-ink">Thanh toán</span>
      </nav>

      {/* ============= Header ============= */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Badge tone="primary" className="mb-2">
            <IconShield size={14} /> Thanh toán an toàn
          </Badge>
          <h1 className="text-2xl md:text-3xl font-bold">
            {step === 2 ? "Đặt hàng thành công" : "Thanh toán"}
          </h1>
        </div>
        {step < 2 && (
          <Button variant="outline" size="sm" onClick={handleBack}>
            <IconArrowLeft size={14} />
            {step === 0 ? "Về giỏ hàng" : "Quay lại"}
          </Button>
        )}
      </div>

      {/* ============= Stepper ============= */}
      <Stepper currentStep={step} />

      <div className="mt-6 grid lg:grid-cols-[1fr_360px] gap-6">
        {/* ============= LEFT: forms ============= */}
        <div>
          {step === 0 && (
            <Step1Form
              form={form}
              errors={errors}
              districts={districts}
              onUpdate={updateField}
            />
          )}
          {step === 1 && <Step2Payment
            paymentMethod={paymentMethod}
            onChange={setPaymentMethod}
            form={form}
          />}
          {step === 2 && (
            <Step3Success
              orderId={orderId || "ORD-XXXXXXXX"}
              form={form}
              paymentMethod={paymentMethod}
              total={total}
            />
          )}

          {/* ============= Upsell: gợi ý thêm phụ tùng ============= */}
          {step < 2 && <CheckoutUpsell cartLines={lines} />}

          {step < 2 && (
            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3 justify-between">
              <Button variant="outline" onClick={handleBack} size="lg">
                <IconArrowLeft size={14} />
                {step === 0 ? "Về giỏ hàng" : "Quay lại bước trước"}
              </Button>
              <Button onClick={handleContinue} size="lg">
                {step === 0 ? "Tiếp tục thanh toán" : "Đặt hàng"}
                <IconArrowRight size={14} />
              </Button>
            </div>
          )}
        </div>

        {/* ============= RIGHT: order summary (sticky) ============= */}
        <div className="lg:sticky lg:top-20 lg:self-start space-y-4">
          <OrderSummary
            lines={lines}
            totalCount={totalCount}
            subtotal={subtotal}
            shipFee={shipFee}
            total={total}
            shippingMethod={form.shippingMethod}
            showStep2Note={step === 1}
          />

          <Card hover={false} className="bg-bgsoft/40">
            <div className="p-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <IconShield size={14} className="text-primary" />
                <span className="text-ink-light">Thanh toán an toàn 256-bit SSL</span>
              </div>
              <div className="flex items-center gap-2">
                <IconPackage size={14} className="text-primary" />
                <span className="text-ink-light">Đổi trả 14 ngày miễn phí</span>
              </div>
              <div className="flex items-center gap-2">
                <IconTruck size={14} className="text-primary" />
                <span className="text-ink-light">Giao hàng toàn quốc 2-5 ngày</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// =========================
// Subcomponents
// =========================

function Stepper({ currentStep }: { currentStep: Step }) {
  return (
    <div className="bg-white border border-ink/8 rounded-2xl p-4 sm:p-5">
      <div className="flex items-center gap-2 sm:gap-4">
        {STEPS.map((s, i) => {
          const isActive = s.id === currentStep;
          const isDone = s.id < currentStep;
          return (
            <div key={s.id} className="flex items-center gap-2 sm:gap-4 flex-1">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <div
                  className={[
                    "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 transition-colors",
                    isDone
                      ? "bg-accent text-ink"
                      : isActive
                        ? "bg-primary text-white"
                        : "bg-bgsoft text-ink-muted",
                  ].join(" ")}
                >
                  {isDone ? <IconCheck size={16} /> : s.id + 1}
                </div>
                <div className="min-w-0 hidden sm:block">
                  <div
                    className={[
                      "text-sm font-semibold",
                      isActive ? "text-primary" : isDone ? "text-ink" : "text-ink-muted",
                    ].join(" ")}
                  >
                    {s.label}
                  </div>
                  <div className="text-xs text-ink-muted">{s.sub}</div>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={[
                    "h-0.5 flex-1 rounded-full",
                    isDone ? "bg-accent" : "bg-bgsoft",
                  ].join(" ")}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Step1Form({
  form,
  errors,
  districts,
  onUpdate,
}: {
  form: ShippingForm;
  errors: Partial<Record<keyof ShippingForm, string>>;
  districts: string[];
  onUpdate: <K extends keyof ShippingForm>(
    key: K,
    value: ShippingForm[K],
  ) => void;
}) {
  return (
    <div className="space-y-6">
      <Card hover={false}>
        <div className="p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <IconNote size={18} className="text-primary" />
            Thông tin người nhận
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Họ và tên *"
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChange={(e) => onUpdate("fullName", e.target.value)}
              error={errors.fullName}
            />
            <Input
              label="Số điện thoại *"
              placeholder="0901234567"
              value={form.phone}
              onChange={(e) => onUpdate("phone", e.target.value)}
              error={errors.phone}
              inputMode="tel"
            />
            <Input
              label="Email"
              placeholder="email@example.com"
              type="email"
              value={form.email}
              onChange={(e) => onUpdate("email", e.target.value)}
              error={errors.email}
              className="sm:col-span-2"
              hint="Để nhận hóa đơn điện tử và thông báo đơn hàng"
            />
          </div>
        </div>
      </Card>

      <Card hover={false}>
        <div className="p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <IconTruck size={18} className="text-primary" />
            Địa chỉ giao hàng
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">
                Tỉnh / Thành phố *
              </label>
              <select
                value={form.province}
                onChange={(e) => onUpdate("province", e.target.value)}
                className={[
                  "w-full h-11 px-3 rounded-xl border bg-white text-sm",
                  errors.province
                    ? "border-red-400"
                    : "border-ink/15 focus:border-primary",
                ].join(" ")}
              >
                <option value="">-- Chọn Tỉnh/Thành phố --</option>
                {Object.keys(PROVINCES).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {errors.province && (
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.province}
                </span>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-ink mb-1.5 block">
                Quận / Huyện *
              </label>
              <select
                value={form.district}
                onChange={(e) => onUpdate("district", e.target.value)}
                disabled={!form.province}
                className={[
                  "w-full h-11 px-3 rounded-xl border bg-white text-sm",
                  errors.district
                    ? "border-red-400"
                    : "border-ink/15 focus:border-primary",
                  !form.province ? "opacity-50 cursor-not-allowed" : "",
                ].join(" ")}
              >
                <option value="">-- Chọn Quận/Huyện --</option>
                {districts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errors.district && (
                <span className="text-xs text-red-500 mt-1 block">
                  {errors.district}
                </span>
              )}
            </div>
            <Input
              label="Địa chỉ chi tiết *"
              placeholder="Số nhà, tên đường, phường/xã..."
              value={form.address}
              onChange={(e) => onUpdate("address", e.target.value)}
              error={errors.address}
              className="sm:col-span-2"
            />
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-ink mb-1.5 block">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                value={form.note}
                onChange={(e) => onUpdate("note", e.target.value)}
                placeholder="Ví dụ: Giao giờ hành chính, gọi trước khi giao..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>
      </Card>

      <Card hover={false}>
        <div className="p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <IconTruck size={18} className="text-primary" />
            Phương thức giao hàng
          </h2>
          <div className="space-y-2">
            <ShippingOption
              selected={form.shippingMethod === "standard"}
              onSelect={() => onUpdate("shippingMethod", "standard")}
              title="Tiêu chuẩn (2-4 ngày)"
              price="Miễn phí đơn từ 500.000đ / 30.000đ cho đơn nhỏ hơn"
              note="Giao qua đơn vị vận chuyển uy tín (GHN, GHTK)"
            />
            <ShippingOption
              selected={form.shippingMethod === "express"}
              onSelect={() => onUpdate("shippingMethod", "express")}
              title="Nhanh (1-2 ngày)"
              price="50.000đ"
              note="Giao hỏa tốc nội thành 4h, ngoại thành/liên tỉnh 24-48h"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ShippingOption({
  selected,
  onSelect,
  title,
  price,
  note,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  price: string;
  note: string;
}) {
  return (
    <label
      className={[
        "block p-4 rounded-xl border-2 cursor-pointer transition-colors",
        selected
          ? "border-primary bg-primary/5"
          : "border-ink/10 hover:border-ink/30",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <input
          type="radio"
          checked={selected}
          onChange={onSelect}
          className="accent-primary mt-1 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <span className="font-semibold">{title}</span>
            <span className="text-sm font-medium text-primary">{price}</span>
          </div>
          <p className="text-xs text-ink-muted mt-1">{note}</p>
        </div>
      </div>
    </label>
  );
}

function Step2Payment({
  paymentMethod,
  onChange,
  form,
}: {
  paymentMethod: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
  form: ShippingForm;
}) {
  return (
    <div className="space-y-6">
      <Card hover={false}>
        <div className="p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <IconCash size={18} className="text-primary" />
            Phương thức thanh toán
          </h2>
          <div className="space-y-2">
            {PAYMENT_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              return (
                <label
                  key={opt.id}
                  className={[
                    "flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors",
                    paymentMethod === opt.id
                      ? "border-primary bg-primary/5"
                      : "border-ink/10 hover:border-ink/30",
                  ].join(" ")}
                >
                  <input
                    type="radio"
                    checked={paymentMethod === opt.id}
                    onChange={() => onChange(opt.id)}
                    className="accent-primary mt-1 shrink-0"
                  />
                  <div className="w-10 h-10 rounded-lg bg-bgsoft flex items-center justify-center shrink-0 text-ink">
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{opt.label}</div>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Review address */}
      <Card hover={false} className="bg-bgsoft/40">
        <div className="p-5">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <IconTruck size={16} className="text-primary" />
            Giao đến
          </h3>
          <div className="text-sm space-y-1">
            <div className="font-semibold">
              {form.fullName || "(Chưa nhập họ tên)"} · {form.phone || "(Chưa nhập SĐT)"}
            </div>
            <div className="text-ink-light">
              {form.address}, {form.district}, {form.province}
            </div>
            {form.note && (
              <div className="text-xs text-ink-muted italic mt-2">
                Ghi chú: {form.note}
              </div>
            )}
            <div className="text-xs text-primary mt-2">
              {form.shippingMethod === "express" ? "Giao nhanh 1-2 ngày" : "Giao tiêu chuẩn 2-4 ngày"}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Step3Success({
  orderId,
  form,
  paymentMethod,
  total,
}: {
  orderId: string;
  form: ShippingForm;
  paymentMethod: PaymentMethod;
  total: number;
}) {
  const method = PAYMENT_OPTIONS.find((m) => m.id === paymentMethod);
  return (
    <Card hover={false}>
      <div className="p-6 sm:p-10 text-center max-w-xl mx-auto">
        <div className="mx-auto w-20 h-20 rounded-full bg-accent flex items-center justify-center mb-5">
          <IconCheckCircle size={48} className="text-ink" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Đặt hàng thành công!</h2>
        <p className="text-ink-light mb-6">
          Cảm ơn bạn đã mua hàng. Đơn hàng của bạn đang được xử lý.
        </p>

        <div className="bg-bgsoft/50 rounded-2xl p-5 mb-6 text-left">
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-ink-muted text-xs">Mã đơn hàng</div>
              <div className="font-mono font-semibold text-base text-primary">
                {orderId}
              </div>
            </div>
            <div>
              <div className="text-ink-muted text-xs">Tổng thanh toán</div>
              <div className="font-bold text-base">{compactVND(total)}</div>
            </div>
            <div>
              <div className="text-ink-muted text-xs">Phương thức</div>
              <div className="font-medium">{method?.label}</div>
            </div>
            <div>
              <div className="text-ink-muted text-xs">Người nhận</div>
              <div className="font-medium">{form.fullName}</div>
            </div>
            <div className="sm:col-span-2">
              <div className="text-ink-muted text-xs">Địa chỉ</div>
              <div className="font-medium">
                {form.address}, {form.district}, {form.province}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-left">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <IconTruck size={16} className="text-primary" />
            Bước tiếp theo
          </h3>
          <ol className="text-sm text-ink-light space-y-1.5">
            <li>1. AutoCare xác nhận đơn trong vòng 30 phút (giờ HC).</li>
            <li>2. Đóng gói & bàn giao vận chuyển trong 24h.</li>
            <li>3. Giao hàng tận nơi 2-4 ngày (tiêu chuẩn) hoặc 1-2 ngày (nhanh).</li>
            <li>4. Liên hệ hotline 1900 6868 nếu cần hỗ trợ.</li>
          </ol>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <Link to="/">
            <Button variant="outline">
              <IconArrowLeft size={14} />
              Về trang chủ
            </Button>
          </Link>
          <Link to="/parts">
            <Button>Tiếp tục mua sắm</Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

function OrderSummary({
  lines,
  totalCount,
  subtotal,
  shipFee,
  total,
  shippingMethod,
  showStep2Note,
}: {
  lines: { part: { id: string; name: string; brand: string; image: string; priceVND: number; rating: number; reviewsCount: number; slug: string }; qty: number; lineTotal: number }[];
  totalCount: number;
  subtotal: number;
  shipFee: number;
  total: number;
  shippingMethod: "standard" | "express";
  showStep2Note: boolean;
}) {
  return (
    <Card>
      <div className="p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <IconNote size={18} className="text-primary" />
          Đơn hàng ({totalCount} sản phẩm)
        </h3>

        <ul className="space-y-3 mb-4 max-h-72 overflow-y-auto -mx-1 px-1">
          {lines.map((line) => (
            <li key={line.part.id} className="flex gap-2.5">
              <img
                src={line.part.image}
                alt={line.part.name}
                className="w-12 h-12 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-ink-muted">{line.part.brand}</div>
                <div className="text-sm font-medium leading-tight line-clamp-2">
                  {line.part.name}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  {compactVND(line.part.priceVND)} × {line.qty}
                </div>
              </div>
              <div className="text-sm font-semibold text-primary shrink-0">
                {compactVND(line.lineTotal)}
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-ink/8 pt-3 space-y-2 text-sm">
          <SummaryRow label="Tạm tính" value={compactVND(subtotal)} />
          <SummaryRow
            label="Phí vận chuyển"
            value={
              shippingMethod === "express"
                ? compactVND(EXPRESS_SHIP_FEE)
                : shipFee === 0
                  ? "Miễn phí"
                  : compactVND(shipFee)
            }
            valueClass={shipFee === 0 && shippingMethod === "standard" ? "text-accent-hover" : ""}
          />
        </div>

        <div className="my-3 border-t border-ink/8" />

        <div className="flex items-baseline justify-between">
          <span className="font-semibold">Tổng cộng</span>
          <span className="text-2xl font-bold text-primary">
            {compactVND(total)}
          </span>
        </div>
        <p className="text-xs text-ink-muted mt-1 text-right">
          ({fullVND(total)} · đã bao gồm VAT)
        </p>

        {showStep2Note && (
          <div className="mt-4 text-xs text-ink-muted text-center">
            Bằng việc đặt hàng, bạn đồng ý với{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Điều khoản sử dụng
            </Link>
            .
          </div>
        )}
      </div>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-light">{label}</span>
      <span className={`font-medium ${valueClass || "text-ink"}`}>{value}</span>
    </div>
  );
}

// Suppress unused icon warning
void IconStar;

// =========================
// Upsell widget cho Checkout
// =========================

function CheckoutUpsell({
  cartLines,
}: {
  cartLines: { part: Part; qty: number; lineTotal: number }[];
}) {
  const cartPartIds = useMemo(
    () => new Set(cartLines.map((l) => l.part.id)),
    [cartLines],
  );

  const recommendations = useMemo(
    () => recommendForCheckout(cartPartIds, 4),
    [cartPartIds],
  );

  // Tránh re-render trùng khi giỏ trống (đang guard ở parent)
  if (recommendations.length === 0) return null;

  return (
    <div className="mt-8">
      <RecommendationWidget
        items={recommendations}
        title="Thêm phụ tùng trước khi thanh toán"
        subtitle="Gợi ý phù hợp với các sản phẩm trong giỏ của bạn"
        variant="compact"
        showAddToCart
        viewAllHref="/parts"
        viewAllLabel="Xem tất cả phụ tùng"
      />
    </div>
  );
}
