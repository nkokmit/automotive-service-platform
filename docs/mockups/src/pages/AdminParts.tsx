import { Link } from "react-router-dom";
import {
  IconPackage,
  IconStar,
  IconWarning,
} from "../components/icons";
import Badge from "../components/Badge";
import {
  AdminTable,
  type AdminTableColumn,
  type AdminTableFilter,
  type AdminFormProps,
} from "../components/AdminTable";
import { parts, type Part } from "../data/mock";
import {
  formatCompactVND as compactVND,
  getPartDiscountPercent,
} from "../data/cartStore";

// =========================
// AdminParts — quản lý phụ tùng (kho)
// =========================

const columns: AdminTableColumn<Part>[] = [
  {
    key: "name",
    label: "Phụ tùng",
    render: (p) => (
      <div className="flex items-center gap-3">
        <img
          src={p.image}
          alt={p.name}
          className="w-10 h-10 rounded-lg object-cover shrink-0"
        />
        <div className="min-w-0">
          <Link
            to={`/parts/${p.slug}`}
            className="font-semibold text-sm hover:text-primary line-clamp-1"
          >
            {p.name}
          </Link>
          <div className="text-xs text-ink-muted line-clamp-1">
            {p.brand} · {p.category}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "category",
    label: "Danh mục",
    hideOnMobile: true,
    render: (p) => <Badge tone="default">{p.category}</Badge>,
  },
  {
    key: "price",
    label: "Giá",
    align: "right",
    render: (p) => {
      const discount = getPartDiscountPercent(p);
      return (
        <div className="text-sm">
          <div className="font-semibold text-primary">
            {compactVND(p.priceVND)}
          </div>
          {p.originalPriceVND && discount > 0 && (
            <div className="text-[10px] text-ink-muted line-through">
              {compactVND(p.originalPriceVND)}
            </div>
          )}
        </div>
      );
    },
  },
  {
    key: "stock",
    label: "Tồn kho",
    align: "center",
    render: (p) => {
      const low = p.stockQty < 20;
      return (
        <div
          className={[
            "inline-flex items-center gap-1 text-sm font-semibold",
            low ? "text-amber-700" : "text-ink",
          ].join(" ")}
        >
          {low && <IconWarning size={12} />}
          {p.stockQty}
        </div>
      );
    },
  },
  {
    key: "rating",
    label: "Rating",
    align: "center",
    hideOnMobile: true,
    render: (p) => (
      <div className="inline-flex items-center gap-1 text-sm">
        <IconStar size={12} className="text-accent-hover" />
        <span className="font-semibold">{p.rating}</span>
        <span className="text-ink-muted text-xs">({p.reviewsCount})</span>
      </div>
    ),
  },
  {
    key: "status",
    label: "Trạng thái",
    align: "center",
    render: (p) => {
      if (p.stockQty === 0)
        return <Badge tone="warning">Hết hàng</Badge>;
      if (p.stockQty < 20)
        return <Badge tone="warning">Sắp hết</Badge>;
      if (p.isBestSeller)
        return <Badge tone="primary">Bán chạy</Badge>;
      return <Badge tone="accent">Còn hàng</Badge>;
    },
  },
];

const filters: AdminTableFilter<Part>[] = [
  { id: "low", label: "Tồn kho thấp", predicate: (p) => p.stockQty < 50 },
  { id: "discount", label: "Đang giảm giá", predicate: (p) => getPartDiscountPercent(p) > 0 },
  { id: "bestseller", label: "Bán chạy", predicate: (p) => !!p.isBestSeller },
  { id: "featured", label: "Nổi bật", predicate: (p) => !!p.isFeatured },
];

const form: AdminFormProps<Part> = {
  addTitle: "Thêm phụ tùng mới",
  editTitle: "Chỉnh sửa phụ tùng",
  fields: [
    { key: "name", label: "Tên sản phẩm", type: "text", required: true, placeholder: "VD: Lốp Michelin 205/55R16" },
    { key: "brand", label: "Thương hiệu", type: "text", required: true, placeholder: "Michelin" },
    { key: "category", label: "Danh mục", type: "select", required: true, options: [
      { value: "Lốp xe", label: "Lốp xe" },
      { value: "Ắc quy", label: "Ắc quy" },
      { value: "Lọc dầu / Lọc gió", label: "Lọc dầu / Lọc gió" },
      { value: "Đèn / Pha", label: "Đèn / Pha" },
      { value: "Nội thất", label: "Nội thất" },
      { value: "Phụ kiện ngoại thất", label: "Phụ kiện ngoại thất" },
      { value: "Dầu nhớt", label: "Dầu nhớt" },
      { value: "Phanh", label: "Phanh" },
    ]},
    { key: "priceVND", label: "Giá bán (VNĐ)", type: "number", required: true, placeholder: "500000" },
    { key: "originalPriceVND", label: "Giá gốc (VNĐ)", type: "number", placeholder: "600000" },
    { key: "stockQty", label: "Số lượng tồn kho", type: "number", required: true, placeholder: "100" },
    { key: "shortDescription", label: "Mô tả ngắn", type: "textarea", rows: 2, placeholder: "Mô tả ngắn gọn..." },
  ],
  onSubmit: () => {},
};

export default function AdminParts() {
  const lowStockCount = parts.filter((p) => p.stockQty < 50).length;
  return (
    <AdminTable
      title="Quản lý phụ tùng"
      subtitle={`${parts.length} sản phẩm trong kho${lowStockCount > 0 ? ` · ${lowStockCount} sắp hết hàng` : ""}`}
      icon={<IconPackage size={20} />}
      data={parts}
      columns={columns}
      searchKey="name"
      filters={filters}
      addLabel="Thêm phụ tùng"
      form={form}
    />
  );
}