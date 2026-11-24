import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IconCash,
  IconSearch,
  IconRefresh,
  IconClose,
  IconWarning,
  IconCreditCard,
  IconBank,
  IconWallet,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { useToast } from "../../components/Toast";
import { billingApi } from "../../api/endpoints/billing";
import type {
  InvoiceResponse,
  InvoiceStatus,
  InvoiceSummaryResponse,
  PaymentMethod,
} from "../../api/types";
import {
  formatCompactVND as compactVND,
  formatFullVND as fullVND,
} from "../../utils/format";

// =========================
// AdminInvoices — Hóa đơn
// Nguồn dữ liệu: GET /api/invoices (cần authority INVOICE_READ)
// =========================

const STATUS_FILTERS: { id: "all" | InvoiceStatus; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "UNPAID", label: "Chưa thanh toán" },
  { id: "PARTIALLY_PAID", label: "Thanh toán một phần" },
  { id: "PAID", label: "Đã thanh toán" },
  { id: "VOID", label: "Đã huỷ" },
];

const STATUS_TONE: Record<
  InvoiceStatus,
  "default" | "primary" | "warning" | "accent"
> = {
  UNPAID: "warning",
  PARTIALLY_PAID: "primary",
  PAID: "accent",
  VOID: "default",
};

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  VOID: "Đã huỷ",
};

const PAYMENT_ICON: Record<
  PaymentMethod,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  CASH: IconWallet,
  BANK_TRANSFER: IconBank,
  CARD: IconCreditCard,
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Thẻ",
};

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminInvoices() {
  const t = useToast();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | InvoiceStatus>("all");
  const [invoices, setInvoices] = useState<InvoiceSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<InvoiceSummaryResponse | null>(null);
  const [detail, setDetail] = useState<InvoiceResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery) setSearch(urlQuery);
  }, [urlQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await billingApi.listInvoices({
        status: activeStatus === "all" ? undefined : activeStatus,
        size: 50,
      });
      setInvoices(page.items ?? []);
    } catch (err) {
      setInvoices([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách hóa đơn từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [activeStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return invoices;
    const s = search.trim().toLowerCase();
    return invoices.filter(
      (i) =>
        i.code?.toLowerCase().includes(s) ||
        i.workOrderId?.toLowerCase().includes(s) ||
        i.customerId?.toLowerCase().includes(s),
    );
  }, [invoices, search]);

  const openDetail = async (inv: InvoiceSummaryResponse) => {
    setSelected(inv);
    setDetail(null);
    setDetailLoading(true);
    try {
      setDetail(await billingApi.getInvoice(inv.id));
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không tải được chi tiết hóa đơn",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = invoices.reduce((s, i) => s + Number(i.grandTotal ?? 0), 0);
    const paid = invoices.reduce((s, i) => s + Number(i.paidAmount ?? 0), 0);
    return {
      count: invoices.length,
      total,
      paid,
      unpaid: total - paid,
    };
  }, [invoices]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconCash size={20} />
            </span>
            Hóa đơn
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Nguồn:{" "}
            <code className="text-xs bg-bgsoft px-1.5 py-0.5 rounded">
              GET /api/invoices
            </code>{" "}
            · {stats.count} hóa đơn
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      {/* Stats */}
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

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 max-w-md flex items-center gap-2 h-11 px-3 rounded-xl border border-ink/15 bg-white focus-within:border-primary">
          <IconSearch size={16} className="text-ink-muted" />
          <input
            type="text"
            placeholder="Tìm mã hóa đơn, work order, khách hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveStatus(s.id)}
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

      {/* Table */}
      <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Đang tải hóa đơn...
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="font-semibold mb-2">Không tải được danh sách hóa đơn</p>
            <p className="text-sm text-ink-light mb-5">{error}</p>
            <Button variant="outline" onClick={() => void load()}>
              <IconRefresh size={14} /> Thử lại
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Không có hóa đơn nào phù hợp.
          </div>
        ) : (
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
                  <th className="font-medium px-4 py-3 text-center">
                    Trạng thái
                  </th>
                  <th className="font-medium px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr
                    key={i.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() => void openDetail(i)}
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void openDetail(i)}
                      >
                        Chi tiết
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted">
          Hiển thị <strong className="text-ink">{filtered.length}</strong> /{" "}
          {invoices.length} hóa đơn
        </div>
      </div>

      {error && (
        <p className="text-xs text-ink-muted flex items-center gap-1">
          <IconWarning size={12} />
          Nếu bạn thấy lỗi quyền truy cập, hãy đăng nhập bằng tài khoản ADMIN /
          MANAGER / CASHIER (cần authority INVOICE_READ).
        </p>
      )}

      {/* Modal chi tiết */}
      {selected && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-ink/8 pb-4 mb-4">
              <div>
                <div className="text-xs text-ink-muted mb-1">Mã hóa đơn</div>
                <h3 className="font-mono font-bold text-lg">{selected.code}</h3>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-bgsoft"
                aria-label="Đóng"
              >
                <IconClose size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-8 text-center text-sm text-ink-muted">
                Đang tải chi tiết...
              </div>
            ) : detail ? (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-ink-muted">Trạng thái</div>
                    <div className="mt-1">
                      <Badge tone={STATUS_TONE[detail.status] ?? "default"}>
                        {STATUS_LABEL[detail.status] ?? detail.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">Phát hành</div>
                    <div className="font-semibold text-xs">
                      {fmtDate(detail.issuedAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-ink-muted">Đã thanh toán</div>
                    <div className="font-semibold text-xs">
                      {fmtDate(detail.paidAt)}
                    </div>
                  </div>
                </div>

                {detail.items.length > 0 && (
                  <div className="border border-ink/8 rounded-xl divide-y divide-ink/5">
                    {detail.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 p-3 text-sm"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-ink line-clamp-1">
                            {item.snapshotName}
                          </div>
                          <div className="text-[11px] text-ink-muted">
                            {item.itemType === "SERVICE" ? "Dịch vụ" : "Phụ tùng"} ·
                            SL {item.quantity ?? 1} ·{" "}
                            {compactVND(item.unitPrice)}
                          </div>
                        </div>
                        <div className="font-semibold text-ink shrink-0">
                          {compactVND(item.totalPrice)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-ink/8 pt-3 space-y-1.5 text-sm">
                  <Row label="Phí công" value={fullVND(detail.subtotalLabor)} />
                  <Row label="Tiền phụ tùng" value={fullVND(detail.subtotalParts)} />
                  <Row
                    label="Chiết khấu"
                    value={`-${fullVND(detail.discountAmount)}`}
                  />
                  <Row label="Thuế" value={fullVND(detail.taxAmount)} />
                  <div className="flex justify-between pt-2 border-t border-ink/8">
                    <span className="font-semibold text-ink">Tổng cộng</span>
                    <span className="font-bold text-primary text-lg">
                      {fullVND(detail.grandTotal)}
                    </span>
                  </div>
                </div>

                {detail.payments.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                      Lịch sử thanh toán
                    </h4>
                    <div className="border border-ink/8 rounded-xl divide-y divide-ink/5">
                      {detail.payments.map((p) => {
                        const PIcon = PAYMENT_ICON[p.paymentMethod] ?? IconWallet;
                        return (
                          <div
                            key={p.id}
                            className="flex items-center justify-between gap-3 p-3 text-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <PIcon size={14} className="text-primary shrink-0" />
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-ink">
                                  {PAYMENT_LABEL[p.paymentMethod] ?? p.paymentMethod}
                                </div>
                                <div className="text-[11px] text-ink-muted">
                                  {fmtDate(p.paidAt)} · {p.code}
                                </div>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="font-semibold text-ink">
                                {compactVND(p.amount)}
                              </div>
                              {p.status === "REFUNDED" && (
                                <Badge tone="warning">Đã hoàn</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-ink-muted">
                Không tải được chi tiết hóa đơn.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-light">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  );
}

function StatCard({
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
