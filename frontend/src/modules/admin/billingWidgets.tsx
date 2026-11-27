import {
  IconCash,
  IconSearch,
  IconRefresh,
  IconClose,
  IconCreditCard,
  IconWallet,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import type {
  InvoiceStatus,
  InvoiceSummaryResponse,
} from "../../api/types";
import {
  formatCompactVND as compactVND,
} from "../../utils/format";
import { STATUS_LABEL, STATUS_TONE, fmtDate } from "./billingShared";

// =========================
// Header / Stats / Filters
// =========================

export function BillingHeader({
  count,
  loading,
  onRefresh,
}: {
  count: number;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-3">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <IconCash size={20} />
          </span>
          Hóa đơn & Thanh toán
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          {count} hóa đơn
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
        <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
        Làm mới
      </Button>
    </div>
  );
}

export function BillingStats({
  stats,
}: {
  stats: { count: number; total: number; paid: number; unpaid: number };
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        icon={<IconCash size={16} className="text-white" />}
        label="Tổng hóa đơn"
        value={stats.count}
        color="bg-primary"
      />
      <StatCard
        icon={<IconCreditCard size={16} className="text-white" />}
        label="Tổng doanh thu"
        value={compactVND(stats.total)}
        color="bg-emerald-500"
        isText
      />
      <StatCard
        icon={<IconWallet size={16} className="text-white" />}
        label="Đã thu"
        value={compactVND(stats.paid)}
        color="bg-amber-500"
        isText
      />
      <StatCard
        icon={<IconClose size={16} className="text-white" />}
        label="Còn phải thu"
        value={compactVND(stats.unpaid)}
        color="bg-red-500"
        isText
      />
    </div>
  );
}

export function BillingFilters({
  search,
  onSearch,
  activeStatus,
  onStatus,
}: {
  search: string;
  onSearch: (v: string) => void;
  activeStatus: "all" | InvoiceStatus;
  onStatus: (v: "all" | InvoiceStatus) => void;
}) {
  const filters: { id: "all" | InvoiceStatus; label: string }[] = [
    { id: "all", label: "Tất cả" },
    { id: "UNPAID", label: "Chưa thanh toán" },
    { id: "PARTIALLY_PAID", label: "Thanh toán một phần" },
    { id: "PAID", label: "Đã thanh toán" },
    { id: "VOID", label: "Đã huỷ" },
  ];
  return (
    <div className="flex flex-col md:flex-row gap-2">
      <div className="flex-1 max-w-md flex items-center gap-2 h-11 px-3 rounded-xl border border-ink/15 bg-white focus-within:border-primary">
        <IconSearch size={16} className="text-ink-muted" />
        <input
          type="text"
          placeholder="Tìm mã hóa đơn, work order, khách hàng..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="flex-1 bg-transparent outline-none text-sm"
        />
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {filters.map((s) => (
          <button
            key={s.id}
            onClick={() => onStatus(s.id)}
            className={[
              "text-sm font-medium px-3 py-2 rounded-xl transition-colors",
              activeStatus === s.id
                ? "bg-primary text-white"
                : "bg-white border border-ink/10 text-ink-muted hover:border-primary/40",
            ].join(" ")}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function InvoiceTable({
  loading,
  error,
  invoices,
  filtered,
  onOpen,
  onRetry,
}: {
  loading: boolean;
  error: string | null;
  invoices: InvoiceSummaryResponse[];
  filtered: InvoiceSummaryResponse[];
  onOpen: (i: InvoiceSummaryResponse) => void;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div className="bg-white border border-ink/8 rounded-2xl p-10 text-center text-sm text-ink-muted">
        Đang tải hóa đơn...
      </div>
    );
  }
  if (error) {
    return (
      <div className="bg-white border border-ink/8 rounded-2xl p-10 text-center">
        <p className="font-semibold mb-2">Không tải được danh sách hóa đơn</p>
        <p className="text-sm text-ink-light mb-5">{error}</p>
        <Button variant="outline" onClick={onRetry}>
          <IconRefresh size={14} /> Thử lại
        </Button>
      </div>
    );
  }
  if (filtered.length === 0) {
    return (
      <div className="bg-white border border-ink/8 rounded-2xl p-10 text-center text-sm text-ink-muted">
        Không có hóa đơn nào phù hợp.
      </div>
    );
  }
  return (
    <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/30">
              <th className="font-medium px-4 py-3">Mã hóa đơn</th>
              <th className="font-medium px-4 py-3 hidden md:table-cell">
                Ngày phát hành
              </th>
              <th className="font-medium px-4 py-3 text-right">Công</th>
              <th className="font-medium px-4 py-3 text-right hidden lg:table-cell">
                Phụ tùng
              </th>
              <th className="font-medium px-4 py-3 text-right">Tổng</th>
              <th className="font-medium px-4 py-3 text-center">Trạng thái</th>
              <th className="font-medium px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-b border-ink/5 hover:bg-bgsoft/40">
                <td className="px-4 py-3">
                  <button
                    onClick={() => onOpen(i)}
                    className="font-mono font-bold text-primary hover:underline"
                  >
                    {i.code}
                  </button>
                  {i.workOrderId && (
                    <div className="text-[11px] text-ink-muted font-mono mt-0.5">
                      WO: {i.workOrderId.slice(0, 8)}…
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-xs text-ink-muted">
                  {fmtDate(i.issuedAt)}
                </td>
                <td className="px-4 py-3 text-right text-xs whitespace-nowrap">
                  {compactVND(i.subtotalLabor)}
                </td>
                <td className="px-4 py-3 text-right text-xs whitespace-nowrap hidden lg:table-cell">
                  {compactVND(i.subtotalParts)}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-primary whitespace-nowrap">
                  {compactVND(i.grandTotal)}
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge tone={STATUS_TONE[i.status] ?? "default"}>
                    {STATUS_LABEL[i.status] ?? i.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => onOpen(i)}>
                    Chi tiết
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted">
        Hiển thị <strong className="text-ink">{filtered.length}</strong> /{" "}
        {invoices.length} hóa đơn
      </div>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  color,
  isText = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
  isText?: boolean;
}) {
  return (
    <div className="bg-white border border-ink/8 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}
        >
          {icon}
        </div>
        <div className="text-xs text-ink-muted">{label}</div>
      </div>
      <div className={`text-2xl font-bold mt-2 ${isText ? "text-lg" : ""}`}>
        {value}
      </div>
    </div>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-light">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}
