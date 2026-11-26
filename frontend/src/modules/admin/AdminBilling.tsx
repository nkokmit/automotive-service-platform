import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { IconWarning } from "../../components/icons";
import { useToast } from "../../components/Toast";
import {
  billingApi,
  describeBillingError,
  paymentApi,
} from "../../api/endpoints/billing";
import { hasTokenAuthority } from "../../api/session";
import type {
  InvoiceResponse,
  InvoiceStatus,
  InvoiceSummaryResponse,
  PaymentResponse,
} from "../../api/types";
import {
  BillingFilters,
  BillingHeader,
  BillingStats,
  InvoiceTable,
} from "./billingWidgets";
import {
  DiscountModal,
  InvoiceDetailModal,
  PaymentModal,
  RefundModal,
  VoidModal,
} from "./billingModals";

/**
 * AdminBilling — Quản lý hóa đơn & thanh toán tại quầy.
 *
 * Nguồn dữ liệu:
 *  - GET   /api/invoices                (INVOICE_READ)
 *  - GET   /api/invoices/{id}           (INVOICE_READ)
 *  - PATCH /api/invoices/{id}/discount  (INVOICE_WRITE)
 *  - POST  /api/invoices/{id}/void      (INVOICE_WRITE)
 *  - POST  /api/payments                (PAYMENT_WRITE)
 *  - POST  /api/payments/{id}/refund    (PAYMENT_REFUND)
 */
export default function AdminBilling() {
  const t = useToast();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<"all" | InvoiceStatus>("all");
  const [invoices, setInvoices] = useState<InvoiceSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<InvoiceSummaryResponse | null>(null);
  const [detail, setDetail] = useState<InvoiceResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [discountOpen, setDiscountOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [refundTarget, setRefundTarget] = useState<PaymentResponse | null>(null);

  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery) setSearch(urlQuery);
  }, [urlQuery]);

  const canWrite = hasTokenAuthority("INVOICE_WRITE");
  const canPay = hasTokenAuthority("PAYMENT_WRITE");
  const canRefund = hasTokenAuthority("PAYMENT_REFUND");

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

  /** Tải lại chi tiết hóa đơn đang mở + danh sách (server là nguồn sự thật). */
  const refreshDetail = useCallback(async () => {
    if (!selected) return;
    try {
      const fresh = await billingApi.getInvoice(selected.id);
      setDetail(fresh);
      setSelected(fresh);
    } catch {
      /* giữ nguyên dữ liệu cũ nếu lần tải lại lỗi */
    }
    await load();
  }, [selected, load]);

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
      <BillingHeader
        count={stats.count}
        loading={loading}
        onRefresh={() => void load()}
      />

      <BillingStats stats={stats} />

      <BillingFilters
        search={search}
        onSearch={setSearch}
        activeStatus={activeStatus}
        onStatus={setActiveStatus}
      />

      <InvoiceTable
        loading={loading}
        error={error}
        invoices={invoices}
        filtered={filtered}
        onOpen={(i) => void openDetail(i)}
        onRetry={() => void load()}
      />

      {error && (
        <p className="text-xs text-ink-muted flex items-center gap-1">
          <IconWarning size={12} />
          Nếu bạn thấy lỗi quyền truy cập, hãy đăng nhập bằng tài khoản ADMIN /
          MANAGER / CASHIER (cần authority INVOICE_READ).
        </p>
      )}

      {selected && (
        <InvoiceDetailModal
          summary={selected}
          detail={detail}
          loading={detailLoading}
          busy={busy}
          canWrite={canWrite}
          canPay={canPay}
          canRefund={canRefund}
          onClose={() => {
            setSelected(null);
            setDetail(null);
          }}
          onDiscount={() => setDiscountOpen(true)}
          onPayment={() => setPaymentOpen(true)}
          onVoid={() => setVoidOpen(true)}
          onRefund={(p) => setRefundTarget(p)}
          onRefresh={() => void refreshDetail()}
        />
      )}

      {discountOpen && detail && (
        <DiscountModal
          invoice={detail}
          busy={busy}
          onClose={() => setDiscountOpen(false)}
          onSubmit={async (amount, note) => {
            setBusy(true);
            try {
              const updated = await billingApi.updateDiscount(
                detail.id,
                amount,
                note,
              );
              setDetail(updated);
              setSelected(updated);
              setDiscountOpen(false);
              t.success("Đã cập nhật chiết khấu hóa đơn");
              await load();
            } catch (err) {
              t.error(describeBillingError(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {paymentOpen && detail && (
        <PaymentModal
          invoice={detail}
          busy={busy}
          onClose={() => setPaymentOpen(false)}
          onSubmit={async (payload) => {
            setBusy(true);
            try {
              await paymentApi.recordPayment(payload);
              setPaymentOpen(false);
              t.success("Đã ghi nhận thanh toán");
              await refreshDetail();
            } catch (err) {
              t.error(describeBillingError(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {voidOpen && detail && (
        <VoidModal
          invoice={detail}
          busy={busy}
          onClose={() => setVoidOpen(false)}
          onSubmit={async (reason) => {
            setBusy(true);
            try {
              const updated = await billingApi.voidInvoice(detail.id, reason);
              setDetail(updated);
              setSelected(updated);
              setVoidOpen(false);
              t.success("Đã huỷ hóa đơn");
              await load();
            } catch (err) {
              t.error(describeBillingError(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      )}

      {refundTarget && (
        <RefundModal
          payment={refundTarget}
          busy={busy}
          onClose={() => setRefundTarget(null)}
          onSubmit={async (reason) => {
            setBusy(true);
            try {
              await paymentApi.refundPayment(refundTarget.id, reason);
              setRefundTarget(null);
              t.success("Đã hoàn tiền giao dịch");
              await refreshDetail();
            } catch (err) {
              t.error(describeBillingError(err));
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
