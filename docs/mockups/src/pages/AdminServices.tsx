import { Link } from "react-router-dom";
import {
  IconWrench,
  IconStar,
  IconClock,
} from "../components/icons";
import Badge from "../components/Badge";
import {
  AdminTable,
  type AdminTableColumn,
  type AdminTableFilter,
  type AdminFormProps,
} from "../components/AdminTable";
import { services, type Service } from "../data/mock";
import {
  formatCompactVND as compactVND,
} from "../data/cartStore";

// =========================
// AdminServices — quản lý dịch vụ
// =========================

const columns: AdminTableColumn<Service>[] = [
  {
    key: "name",
    label: "Dịch vụ",
    render: (s) => (
      <div className="flex items-center gap-3">
        <img
          src={s.image}
          alt={s.name}
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
        <div className="min-w-0">
          <Link
            to={`/services/${s.slug}`}
            className="font-semibold text-sm hover:text-primary line-clamp-1"
          >
            {s.name}
          </Link>
          <div className="text-xs text-ink-muted line-clamp-1">
            {s.provider.name}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "category",
    label: "Danh mục",
    hideOnMobile: true,
    render: (s) => <Badge tone="default">{s.category}</Badge>,
  },
  {
    key: "duration",
    label: "Thời lượng",
    align: "center",
    hideOnMobile: true,
    render: (s) => (
      <div className="inline-flex items-center gap-1 text-sm text-ink-muted">
        <IconClock size={12} />~{s.durationMin} phút
      </div>
    ),
  },
  {
    key: "price",
    label: "Giá",
    align: "right",
    render: (s) => (
      <div className="text-sm">
        <div className="font-semibold text-primary">
          {compactVND(s.priceFrom)}
        </div>
        {s.priceTo > s.priceFrom && (
          <div className="text-[10px] text-ink-muted">
            đến {compactVND(s.priceTo)}
          </div>
        )}
      </div>
    ),
  },
  {
    key: "stats",
    label: "Booking",
    align: "center",
    hideOnMobile: true,
    render: (s) => (
      <div className="text-xs">
        <div className="font-semibold">{s.bookingsCount.toLocaleString("vi-VN")}</div>
        <div className="inline-flex items-center gap-0.5 text-ink-muted">
          <IconStar size={9} className="text-accent-hover" />
          {s.rating}
        </div>
      </div>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    align: "center",
    render: (s) =>
      s.isPopular ? (
        <Badge tone="primary">Phổ biến</Badge>
      ) : s.isFeatured ? (
        <Badge tone="accent">Nổi bật</Badge>
      ) : (
        <Badge tone="default">Bình thường</Badge>
      ),
  },
];

const filters: AdminTableFilter<Service>[] = [
  { id: "popular", label: "Phổ biến", predicate: (s) => !!s.isPopular },
  { id: "featured", label: "Nổi bật", predicate: (s) => !!s.isFeatured },
  { id: "warranty", label: "Có BH", predicate: (s) => s.warrantyMonths > 0 },
];

const form: AdminFormProps<Service> = {
  addTitle: "Thêm dịch vụ mới",
  editTitle: "Chỉnh sửa dịch vụ",
  fields: [
    { key: "name", label: "Tên dịch vụ", type: "text", required: true, placeholder: "VD: Thay dầu động cơ" },
    { key: "category", label: "Danh mục", type: "select", required: true, options: [
      { value: "Bảo dưỡng", label: "Bảo dưỡng" },
      { value: "Sửa chữa", label: "Sửa chữa" },
      { value: "Sơn & thân vỏ", label: "Sơn & thân vỏ" },
      { value: "Điện - Điều hòa", label: "Điện - Điều hòa" },
      { value: "Lốp & phanh", label: "Lốp & phanh" },
      { value: "Khác", label: "Khác" },
    ]},
    { key: "durationMin", label: "Thời lượng (phút)", type: "number", required: true, placeholder: "30" },
    { key: "priceFrom", label: "Giá từ (VNĐ)", type: "number", required: true, placeholder: "200000" },
    { key: "priceTo", label: "Giá đến (VNĐ)", type: "number", placeholder: "500000" },
    { key: "warrantyMonths", label: "Bảo hành (tháng)", type: "number", placeholder: "3" },
    { key: "description", label: "Mô tả", type: "textarea", rows: 3, placeholder: "Mô tả dịch vụ..." },
  ],
  onSubmit: () => {},
};

export default function AdminServices() {
  return (
    <AdminTable
      title="Quản lý dịch vụ"
      subtitle={`${services.length} dịch vụ đang được cung cấp`}
      icon={<IconWrench size={20} />}
      data={services}
      columns={columns}
      searchKey="name"
      filters={filters}
      addLabel="Thêm dịch vụ"
      form={form}
    />
  );
}