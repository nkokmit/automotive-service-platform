import { useMemo, useState } from "react";
import {
  IconShoppingBag,
  IconMapPin,
  IconCheck,
  IconClose,
  IconCash,
  IconCreditCard,
  IconBank,
  IconWallet,
} from "../components/icons";
import Badge from "../components/Badge";
import Button from "../components/Button";
import {
  ConfirmModal,
} from "../components/AdminTable";
import {
  adminOrders,
  getStatusLabel,
  getStatusTone,
  type AdminOrderRow,
} from "../data/adminMock";
import {
  formatCompactVND as compactVND,
  formatFullVND as fullVND,
} from "../data/cartStore";

// =========================
// AdminOrders — quản lý đơn hàng
// =========================

const STATUS_FILTERS = [
  { id: "all", label: "Tất cả" },
  { id: "pending", label: "Chờ xác nhận" },
  { id: "confirmed", label: "Đã xác nhận" },
  { id: "shipping", label: "Đang giao" },
  { id: "completed", label: "Hoàn tất" },
  { id: "cancelled", label: "Đã huỷ" },
] as const;

const PAYMENT_ICONS = {
  COD: IconCash,
  "Thẻ tín dụng": IconCreditCard,
  "Chuyển khoản": IconBank,
  "Ví điện tử": IconWallet,
} as const;

export default function AdminOrders() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<AdminOrderRow | null>(null);
  const [actionConfirm, setActionConfirm] = useState<{
    order: AdminOrderRow;
    action: "confirm" | "cancel";
  } | null>(null);

  const filtered = useMemo(() => {
    return adminOrders.filter((o) => {
      if (activeFilter !== "all" && o.status !== activeFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !o.id.toLowerCase().includes(s) &&
          !o.customer.toLowerCase().includes(s) &&
          !o.customerEmail.toLowerCase().includes(s)
        )
          return false;
      }
      return true;
    });
  }, [activeFilter, search]);

  // Count theo status
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("all", adminOrders.length);
    for (const o of adminOrders) {
      map.set(o.status, (map.get(o.status) ?? 0) + 1);
    }
    return map;
  }, []);

  const totalRevenue = adminOrders
    .filter((o) => o.status === "completed" || o.status === "shipping")
    .reduce((s, o) => s + o.totalVND, 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconShoppingBag size={20} />
            </span>
            Quản lý đơn hàng
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {adminOrders.length} đơn · Doanh thu:{" "}
            <span className="font-semibold text-primary">
              {compactVND(totalRevenue)}
            </span>
          </p>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveFilter(s.id)}
            className={[
              "text-sm font-medium px-3 py-1.5 rounded-full transition-colors inline-flex items-center gap-1.5",
              activeFilter === s.id
                ? "bg-primary text-white"
                : "bg-white border border-ink/10 text-ink-muted hover:border-primary/40",
            ].join(" ")}
          >
            {s.label}
            <span
              className={[
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                activeFilter === s.id
                  ? "bg-white/20 text-white"
                  : "bg-bgsoft text-ink-muted",
              ].join(" ")}
            >
              {counts.get(s.id) ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <input
          type="text"
          placeholder="Tìm theo mã đơn, tên, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 h-11 px-4 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Không có đơn hàng nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/30">
                  <th className="font-medium px-4 py-3">Mã đơn</th>
                  <th className="font-medium px-4 py-3">Khách hàng</th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">Ngày</th>
                  <th className="font-medium px-4 py-3 text-right">Tổng</th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">Thanh toán</th>
                  <th className="font-medium px-4 py-3 text-center">Trạng thái</th>
                  <th className="font-medium px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold">
                      <button
                        onClick={() => setSelected(o)}
                        className="text-primary hover:underline"
                      >
                        {o.id}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ink line-clamp-1">
                        {o.customer}
                      </div>
                      <div className="text-xs text-ink-muted line-clamp-1">
                        {o.customerEmail}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted text-xs hidden md:table-cell">
                      <div className="inline-flex items-center gap-1">
                        <IconMapPin size={11} />{o.city}
                      </div>
                      <div>{o.date}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-primary whitespace-nowrap">
                      {compactVND(o.totalVND)}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge tone="default">{o.paymentMethod}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelected(o)}
                        >
                          Chi tiết
                        </Button>
                        {o.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() =>
                              setActionConfirm({ order: o, action: "confirm" })
                            }
                          >
                            <IconCheck size={12} />
                            Duyệt
                          </Button>
                        )}
                        {(o.status === "pending" || o.status === "confirmed") && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50"
                            onClick={() =>
                              setActionConfirm({ order: o, action: "cancel" })
                            }
                          >
                            <IconClose size={12} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted">
          Hiển thị <strong className="text-ink">{filtered.length}</strong> / {adminOrders.length} đơn
        </div>
      </div>

      {/* Order detail modal */}
      {selected && (
        <OrderDetailModal
          order={selected}
          onClose={() => setSelected(null)}
        />
      )}

      {/* Action confirm */}
      {actionConfirm && (
        <ConfirmModal
          title={actionConfirm.action === "confirm" ? "Duyệt đơn hàng?" : "Huỷ đơn hàng?"}
          description={
            <>
              {actionConfirm.action === "confirm"
                ? `Xác nhận duyệt đơn ${actionConfirm.order.id} của ${actionConfirm.order.customer}?`
                : `Bạn có chắc muốn huỷ đơn ${actionConfirm.order.id}? Khách hàng sẽ nhận được thông báo.`}
            </>
          }
          confirmLabel={actionConfirm.action === "confirm" ? "Duyệt" : "Huỷ đơn"}
          confirmTone={actionConfirm.action === "confirm" ? "primary" : "danger"}
          onClose={() => setActionConfirm(null)}
          onConfirm={() => {
            setActionConfirm(null);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: AdminOrderRow["status"] }) {
  const tone = getStatusTone(status);
  const toneMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-amber-100 text-amber-700",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-orange-100 text-orange-700",
    danger: "bg-red-100 text-red-700",
  } as const;
  return (
    <span
      className={[
        "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap",
        toneMap[tone],
      ].join(" ")}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function OrderDetailModal({
  order,
  onClose,
}: {
  order: AdminOrderRow;
  onClose: () => void;
}) {
  const PayIcon = PAYMENT_ICONS[order.paymentMethod];
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-ink/8 sticky top-0 bg-white">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-ink-muted">Mã đơn</span>
              <StatusBadge status={order.status} />
            </div>
            <h3 className="font-mono font-bold text-lg">{order.id}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
          >
            <IconClose size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Customer */}
          <section>
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
              Khách hàng
            </h4>
            <div className="bg-bgsoft/40 rounded-xl p-4 grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs text-ink-muted">Họ tên</div>
                <div className="font-semibold">{order.customer}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Email</div>
                <div className="font-semibold">{order.customerEmail}</div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Khu vực</div>
                <div className="font-semibold inline-flex items-center gap-1">
                  <IconMapPin size={12} />
                  {order.city}
                </div>
              </div>
              <div>
                <div className="text-xs text-ink-muted">Ngày đặt</div>
                <div className="font-semibold">{order.date}</div>
              </div>
            </div>
          </section>

          {/* Items (mock) */}
          <section>
            <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
              Sản phẩm ({order.itemsCount})
            </h4>
            <div className="border border-ink/8 rounded-xl divide-y divide-ink/5">
              {Array.from({ length: order.itemsCount }).map((_, i) => {
                const sampleNames = [
                  "Lốp Michelin Primacy 4 205/55R16",
                  "Dầu nhớt Castrol Magnatec 10W-30",
                  "Bộ lọc dầu Mahle OC195",
                  "Bộ má phanh Brembo trước",
                ];
                const prices = [2_450_000, 520_000, 95_000, 2_890_000];
                const name = sampleNames[(i + parseInt(order.id.slice(-3))) % 4];
                const price = prices[(i + parseInt(order.id.slice(-3))) % 4];
                return (
                  <div
                    key={i}
                    className="p-3 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="font-medium">{name}</div>
                    <div className="text-ink-muted text-xs">× 1</div>
                    <div className="font-semibold text-primary whitespace-nowrap">
                      {compactVND(price)}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Payment + Total */}
          <section className="grid sm:grid-cols-2 gap-3">
            <div className="bg-bgsoft/40 rounded-xl p-4">
              <div className="text-xs text-ink-muted mb-1.5">Thanh toán</div>
              <div className="flex items-center gap-2 font-semibold">
                <PayIcon size={16} />
                {order.paymentMethod}
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="text-xs text-ink-muted mb-1.5">Tổng thanh toán</div>
              <div className="font-bold text-xl text-primary">
                {compactVND(order.totalVND)}
              </div>
              <div className="text-xs text-ink-muted">
                ({fullVND(order.totalVND)})
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}