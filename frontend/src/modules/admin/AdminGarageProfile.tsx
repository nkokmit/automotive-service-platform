import { useState } from "react";
import {
  IconBuilding,
  IconMapPin,
  IconPhone,
  IconClock,
  IconStar,
  IconCheck,
  IconRefresh,
  IconWarning,
  IconTruck,
  IconShield,
} from "../../components/icons";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import { GARAGE } from "../../config/garage";

/**
 * AdminGarageProfile — cấu hình hồ sơ xưởng.
 *
 * Web phục vụ MỘT xưởng duy nhất (AutoCare Workshop) nên không còn bảng "danh
 * sách garage" như lúc web còn là marketplace. Trang này hiển thị & cho sửa
 * thông tin xưởng.
 *
 * Backend hiện chưa có bảng `garage` (đã kiểm tra: booking-service,
 * staff-service, inventory-service, work-order-service đều không có `garageId`),
 * vì vậy dữ liệu lấy từ `config/garage.ts` và chỉ lưu ở phiên làm việc.
 * Khi backend bổ sung API quản lý xưởng, chỉ cần thay `saveProfile` bằng API call.
 */

interface ProfileForm {
  name: string;
  brand: string;
  tagline: string;
  description: string;
  address: string;
  district: string;
  city: string;
  phone: string;
  hotline: string;
  email: string;
  workingHours: string;
  technicians: number;
  bays: number;
}

const initialForm: ProfileForm = {
  name: GARAGE.name,
  brand: GARAGE.brand,
  tagline: GARAGE.tagline,
  description: GARAGE.description,
  address: GARAGE.address,
  district: GARAGE.district,
  city: GARAGE.city,
  phone: GARAGE.phone,
  hotline: GARAGE.hotline,
  email: GARAGE.email,
  workingHours: GARAGE.workingHours,
  technicians: GARAGE.technicians,
  bays: GARAGE.bays,
};

export default function AdminGarageProfile() {
  const t = useToast();
  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
  };

  const handleSave = () => {
    setSaving(true);
    // TODO: thay bằng PUT /api/garage/profile khi backend có endpoint.
    setTimeout(() => {
      setSaving(false);
      setDirty(false);
      t.success("Đã lưu thông tin xưởng");
    }, 500);
  };

  const handleReset = () => {
    setForm(initialForm);
    setDirty(false);
    t.info("Đã khôi phục thông tin ban đầu");
  };

  return (
    <div className="space-y-6">
      {/* ============= Header ============= */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconBuilding size={20} />
            </span>
            Hồ sơ xưởng
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            AutoCare phục vụ một xưởng duy nhất — thông tin dưới đây hiển thị
            cho toàn bộ website.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={!dirty}>
            <IconRefresh size={14} />
            Khôi phục
          </Button>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            <IconCheck size={14} />
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </div>

      {/* ============= Cảnh báo backend chưa hỗ trợ ============= */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <IconWarning size={16} className="shrink-0 mt-0.5" />
        <span>
          Backend hiện chưa có bảng/API quản lý xưởng. Thay đổi ở đây chỉ có
          tác dụng trong phiên làm việc hiện tại.
        </span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ============= Cột trái: form ============= */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="p-5 space-y-4">
              <h2 className="font-semibold">Thông tin cơ bản</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Tên xưởng"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
                <Input
                  label="Thương hiệu"
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                />
              </div>
              <Input
                label="Tagline"
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
              />
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Mô tả
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 space-y-4">
              <h2 className="font-semibold">Địa chỉ & liên hệ</h2>
              <Input
                label="Địa chỉ"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Quận / Huyện"
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                />
                <Input
                  label="Tỉnh / Thành phố"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <Input
                  label="Hotline"
                  value={form.hotline}
                  onChange={(e) => set("hotline", e.target.value)}
                />
                <Input
                  label="Điện thoại"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5 space-y-4">
              <h2 className="font-semibold">Vận hành</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <Input
                  label="Giờ mở cửa"
                  value={form.workingHours}
                  onChange={(e) => set("workingHours", e.target.value)}
                />
                <Input
                  label="Số kỹ thuật viên"
                  type="number"
                  value={String(form.technicians)}
                  onChange={(e) => set("technicians", Number(e.target.value))}
                />
                <Input
                  label="Số bãi sửa chữa"
                  type="number"
                  value={String(form.bays)}
                  onChange={(e) => set("bays", Number(e.target.value))}
                />
              </div>
            </div>
          </Card>
        </div>

        {/* ============= Cột phải: xem trước ============= */}
        <div className="space-y-4">
          <Card>
            <div className="p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <IconBuilding size={16} className="text-primary" />
                Xem trước
              </h3>
              <div className="rounded-xl overflow-hidden border border-ink/8 mb-3">
                <img
                  src={GARAGE.image}
                  alt={form.name}
                  className="w-full h-32 object-cover"
                />
              </div>
              <div className="font-bold text-lg leading-tight mb-1">
                {form.name}
              </div>
              <p className="text-xs text-ink-muted mb-3">{form.tagline}</p>
              <div className="space-y-1.5 text-sm text-ink-light">
                <div className="flex items-start gap-2">
                  <IconMapPin size={14} className="shrink-0 mt-0.5" />
                  <span>
                    {form.address}, {form.district}, {form.city}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <IconPhone size={14} className="shrink-0" />
                  <span>
                    {form.hotline} · {form.phone}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <IconClock size={14} className="shrink-0" />
                  <span>{form.workingHours}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IconStar size={14} className="shrink-0 text-accent-hover" />
                  <span>
                    {GARAGE.rating} ({GARAGE.reviewsCount} đánh giá)
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge tone="accent">{form.technicians} kỹ thuật viên</Badge>
                <Badge tone="accent">{form.bays} bãi sửa chữa</Badge>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <IconShield size={16} className="text-primary" />
                Tiện ích xưởng
              </h3>
              <ul className="space-y-1.5 text-sm text-ink-light">
                {GARAGE.amenities.map((a) => (
                  <li key={a} className="flex items-center gap-2">
                    <IconCheck size={12} className="text-primary shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card>
            <div className="p-5">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <IconTruck size={16} className="text-primary" />
                Liên kết nhanh
              </h3>
              <a
                href={GARAGE.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                <IconMapPin size={14} />
                Xem trên bản đồ
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
