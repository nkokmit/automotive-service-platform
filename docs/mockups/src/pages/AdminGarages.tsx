import { Link } from "react-router-dom";
import {
  IconBuilding,
  IconMapPin,
  IconStar,
} from "../components/icons";
import Badge from "../components/Badge";
import {
  AdminTable,
  type AdminTableColumn,
  type AdminTableFilter,
  type AdminFormProps,
} from "../components/AdminTable";
import { featuredGarages, type Garage } from "../data/mock";
import {
  formatCompactVND as compactVND,
} from "../data/cartStore";

// =========================
// AdminGarages — quản lý garage
// =========================

const columns: AdminTableColumn<Garage>[] = [
  {
    key: "name",
    label: "Garage",
    render: (g) => (
      <div className="flex items-center gap-3">
        <img
          src={g.image}
          alt={g.name}
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
        <div className="min-w-0">
          <Link
            to={`/garage/${g.slug}`}
            className="font-semibold text-sm hover:text-primary line-clamp-1"
          >
            {g.name}
          </Link>
          <div className="text-xs text-ink-muted line-clamp-1">
            {g.services.slice(0, 2).join(" · ")}
            {g.services.length > 2 ? ` +${g.services.length - 2}` : ""}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "city",
    label: "Khu vực",
    hideOnMobile: true,
    render: (g) => (
      <div className="text-sm">
        <div className="inline-flex items-center gap-1 text-ink-muted">
          <IconMapPin size={12} />
          {g.city}
        </div>
        <div className="text-xs text-ink-muted line-clamp-1 mt-0.5">
          {g.address}
        </div>
      </div>
    ),
  },
  {
    key: "rating",
    label: "Đánh giá",
    align: "center",
    hideOnMobile: true,
    render: (g) => (
      <div className="inline-flex items-center gap-1 text-sm">
        <IconStar size={13} className="text-accent-hover" />
        <span className="font-semibold">{g.rating}</span>
        <span className="text-ink-muted text-xs">({g.reviewsCount})</span>
      </div>
    ),
  },
  {
    key: "price",
    label: "Giá từ",
    align: "right",
    render: (g) => (
      <div className="text-sm font-semibold text-primary">
        {compactVND(g.priceFrom)}
      </div>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    align: "center",
    render: (g) =>
      g.openNow ? (
        <Badge tone="accent">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
          Đang mở
        </Badge>
      ) : (
        <Badge tone="default">Đóng cửa</Badge>
      ),
  },
];

const filters: AdminTableFilter<Garage>[] = [
  {
    id: "featured",
    label: "Nổi bật",
    predicate: (g) => !!g.isFeatured,
  },
  {
    id: "open",
    label: "Đang mở",
    predicate: (g) => g.openNow,
  },
  {
    id: "top",
    label: "≥ 4.5★",
    predicate: (g) => g.rating >= 4.5,
  },
];

const form: AdminFormProps<Garage> = {
  addTitle: "Thêm garage mới",
  editTitle: "Chỉnh sửa garage",
  fields: [
    { key: "name", label: "Tên garage", type: "text", required: true, placeholder: "VD: Garage Minh Anh" },
    { key: "address", label: "Địa chỉ", type: "text", required: true, placeholder: "Số nhà, đường, quận..." },
    { key: "city", label: "Tỉnh/Thành phố", type: "select", required: true, options: [
      { value: "Hà Nội", label: "Hà Nội" },
      { value: "TP.HCM", label: "TP.HCM" },
      { value: "Đà Nẵng", label: "Đà Nẵng" },
      { value: "Hải Phòng", label: "Hải Phòng" },
      { value: "Cần Thơ", label: "Cần Thơ" },
    ]},
    { key: "phone", label: "Số điện thoại", type: "text", required: true, placeholder: "024 3876 1234" },
    { key: "priceFrom", label: "Giá dịch vụ từ (VNĐ)", type: "number", required: true, placeholder: "200000" },
    { key: "rating", label: "Đánh giá (0-5)", type: "number", placeholder: "4.5" },
    { key: "description", label: "Mô tả", type: "textarea", rows: 3, placeholder: "Mô tả ngắn về garage..." },
  ],
  onSubmit: () => {
    /* mock — không lưu */
  },
};

export default function AdminGarages() {
  return (
    <AdminTable
      title="Quản lý garage"
      subtitle={`${featuredGarages.length} garage đang hoạt động trên hệ thống`}
      icon={<IconBuilding size={20} />}
      data={featuredGarages}
      columns={columns}
      searchKey="name"
      filters={filters}
      addLabel="Thêm garage"
      form={form}
    />
  );
}