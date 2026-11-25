import { useState } from "react";
import {
  IconClose,
  IconCreditCard,
  IconWallet,
  IconTrash,
  IconArrowUpRight,
  IconCheckCircle,
  IconTag,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import type {
  InvoiceResponse,
  PaymentMethod,
  PaymentResponse,
} from "../../api/types";
import {
  formatCompactVND as compactVND,
  formatFullVND as fullVND,
} from "../../utils/format";
import {
  PAYMENT_ICON,
  PAYMENT_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
  fmtDate,
} from "./billingShared";
import { Row } from "./billingWidgets";

/** Sinh UUID v4 cho `idempotencyKey` — backend yêu cầu UUID hợp lệ. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
  width = "max-w-lg",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl ${width} w-full max-h-[90vh] overflow-y-auto p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink/8 pb-4 mb-4">
          <div>
            <h3 className="font-bold text-lg">{title}</h3>
            {subtitle && (
              <div className="text-xs text-ink-muted mt-0.5 font-mono">
                {subtitle}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-bgsoft"
            aria-label="Đóng"
          >
            <IconClose size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// =========================
// Modal chi tiết hóa đơn
// =========================

export function InvoiceDetailModal({
  summary,
  detail,
  loading,
  busy,
  canWrite,
  canPay,
  canRefund,
  onClose,
  onDiscount,
  onPayment,
  onVoid,
  onRefund,
  onRefresh,
}: {
  summary: { code: string };
  detail: InvoiceResponse | null;
  loading: boolean;
  busy: boolean;
  canWrite: boolean;
  canPay: boolean;
  canRefund: boolean;
  onClose: () => void;
  onDiscount: () => void;
  onPayment: () => void;
  onVoid: () => void;
  onRefund: (p: PaymentResponse) => void;
  onRefresh: () => void;
}) {
  const balance = detail ? Number(detail.grandTotal) - Number(detail.paidAmount) : 0;
  // Backend chỉ cho sửa chiết khấu / huỷ khi hóa đơn UNPAID và chưa có thanh toán.
  const editable =
    detail?.status === "UNPAID" && Number(detail?.paidAmount ?? 0) === 0;
  const payable =
    detail?.status === "UNPAID" || detail?.status === "PARTIALLY_PAID";

  return (
    <Modal
      title="Chi tiết hóa đơn"
      subtitle={summary.code}
      onClose={onClose}
      width="max-w-2xl"
    >
      {loading ? (
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
              <div className="font-semibold text-xs">{fmtDate(detail.issuedAt)}</div>
            </div>
            <div>
              <div className="text-xs text-ink-muted">Đã thanh toán</div>
              <div className="font-semibold text-xs">{fmtDate(detail.paidAt)}</div>
            </div>
          </div>

          {detail.status === "VOID" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              <span className="font-semibold">Hóa đơn đã huỷ</span>
              {detail.voidedAt && (
                <span> lúc {fmtDate(detail.voidedAt)}</span>
              )}
              {detail.voidReason && (
                <div className="text-xs mt-1">Lý do: {detail.voidReason}</div>
              )}
            </div>
          )}

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
                      {item.itemType === "SERVICE" ? "Dịch vụ" : "Phụ tùng"} · SL{" "}
                      {item.quantity ?? 1} · {compactVND(item.unitPrice)}
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
            <div className="flex justify-between">
              <span className="text-ink-light">Đã thanh toán</span>
              <span className="text-ink">{fullVND(detail.paidAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-light">Còn phải thu</span>
              <span
                className={`font-semibold ${balance > 0 ? "text-red-600" : "text-emerald-600"}`}
              >
                {fullVND(Math.max(balance, 0))}
              </span>
            </div>
          </div>

          {/* Thanh toán */}
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
                            {p.transactionRef && ` · ${p.transactionRef}`}
                          </div>
                          {p.status === "REFUNDED" && p.refundReason && (
                            <div className="text-[11px] text-amber-700">
                              Đã hoàn: {p.refundReason}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <div className="font-semibold text-ink">
                            {compactVND(p.amount)}
                          </div>
                          {p.status === "REFUNDED" && (
                            <Badge tone="warning">Đã hoàn</Badge>
                          )}
                        </div>
                        {canRefund && p.status === "SUCCEEDED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-amber-700 border-amber-200 hover:bg-amber-50"
                            disabled={busy}
                            onClick={() => onRefund(p)}
                          >
                            Hoàn
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Thao tác nghiệp vụ */}
          <div className="border-t border-ink/8 pt-4 flex gap-2 flex-wrap">
            {canPay && payable && balance > 0 && (
              <Button size="sm" disabled={busy} onClick={onPayment}>
                <IconCreditCard size={14} /> Ghi nhận thanh toán
              </Button>
            )}
            {canWrite && editable && (
              <Button size="sm" variant="outline" disabled={busy} onClick={onDiscount}>
                <IconTag size={14} /> Chiết khấu
              </Button>
            )}
            {canWrite && editable && (
              <Button
                size="sm"
                variant="outline"
                className="text-red-600 border-red-200 hover:bg-red-50"
                disabled={busy}
                onClick={onVoid}
              >
                <IconTrash size={14} /> Huỷ hóa đơn
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={busy} onClick={onRefresh}>
              <IconArrowUpRight size={14} /> Làm mới
            </Button>
          </div>

          {detail.status !== "VOID" && !editable && (
            <p className="text-[11px] text-ink-muted">
              Hóa đơn đã có thanh toán nên không thể sửa chiết khấu hoặc huỷ.
              Hãy hoàn tiền trước.
            </p>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-sm text-ink-muted">
          Không tải được chi tiết hóa đơn.
        </div>
      )}
    </Modal>
  );
}

// =========================
// Modal chiết khấu
// =========================

export function DiscountModal({
  invoice,
  busy,
  onClose,
  onSubmit,
}: {
  invoice: InvoiceResponse;
  busy: boolean;
  onClose: () => void;
  onSubmit: (amount: number, note: string | null) => void;
}) {
  const maxDiscount =
    Number(invoice.subtotalLabor) +
    Number(invoice.subtotalParts) +
    Number(invoice.taxAmount);
  const [amount, setAmount] = useState(String(invoice.discountAmount ?? 0));
  const [note, setNote] = useState(invoice.note ?? "");

  const value = Number(amount.replace(/\D/g, "")) || 0;
  const invalid = value < 0 || value > maxDiscount;

  return (
    <Modal
      title="Cập nhật chiết khấu"
      subtitle={invoice.code}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="bg-bgsoft/60 rounded-lg p-3 text-sm space-y-1">
          <Row label="Phí công" value={fullVND(invoice.subtotalLabor)} />
          <Row label="Tiền phụ tùng" value={fullVND(invoice.subtotalParts)} />
          <Row label="Thuế" value={fullVND(invoice.taxAmount)} />
          <div className="flex justify-between pt-1 border-t border-ink/10">
            <span className="font-semibold text-ink">Chiết khấu tối đa</span>
            <span className="font-bold text-primary">
              {fullVND(maxDiscount)}
            </span>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink-muted">
            Số tiền chiết khấu (đ)
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-ink/15 bg-white focus:border-primary outline-none text-sm"
            placeholder="0"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink-muted">Ghi chú</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-ink/15 bg-white focus:border-primary outline-none text-sm resize-none"
            placeholder="Lý do / thông tin chiết khấu"
          />
        </label>

        {invalid && (
          <p className="text-xs text-red-600">
            Chiết khấu phải từ 0 đến {fullVND(maxDiscount)}.
          </p>
        )}

        <div className="bg-bgsoft/60 rounded-lg p-3 text-sm flex justify-between">
          <span className="text-ink-light">Tổng cộng sau chiết khấu</span>
          <span className="font-bold text-primary">
            {fullVND(Math.max(maxDiscount - value, 0))}
          </span>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            disabled={busy || invalid}
            onClick={() => onSubmit(value, note.trim() || null)}
          >
            <IconCheckCircle size={14} /> Lưu chiết khấu
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =========================
// Modal ghi nhận thanh toán
// =========================

export function PaymentModal({
  invoice,
  busy,
  onClose,
  onSubmit,
}: {
  invoice: InvoiceResponse;
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    invoiceId: string;
    idempotencyKey: string;
    paymentMethod: PaymentMethod;
    amount: number;
    transactionRef: string | null;
    note: string | null;
  }) => void;
}) {
  const balance = Number(invoice.grandTotal) - Number(invoice.paidAmount);
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [amount, setAmount] = useState(String(balance));
  const [transactionRef, setTransactionRef] = useState("");
  const [note, setNote] = useState("");

  const value = Number(amount.replace(/\D/g, "")) || 0;
  const invalid = value <= 0 || value > balance;

  const methods: PaymentMethod[] = ["CASH", "BANK_TRANSFER", "CARD"];

  return (
    <Modal
      title="Ghi nhận thanh toán"
      subtitle={invoice.code}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="bg-bgsoft/60 rounded-lg p-3 text-sm space-y-1">
          <Row label="Tổng cộng" value={fullVND(invoice.grandTotal)} />
          <Row label="Đã thanh toán" value={fullVND(invoice.paidAmount)} />
          <div className="flex justify-between pt-1 border-t border-ink/10">
            <span className="font-semibold text-ink">Còn phải thu</span>
            <span className="font-bold text-primary">{fullVND(balance)}</span>
          </div>
        </div>

        <div>
          <span className="text-xs font-medium text-ink-muted">
            Phương thức thanh toán
          </span>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {methods.map((m) => {
              const MIcon = PAYMENT_ICON[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={[
                    "flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-colors",
                    method === m
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-ink/12 text-ink-muted hover:border-primary/40",
                  ].join(" ")}
                >
                  <MIcon size={16} />
                  {PAYMENT_LABEL[m]}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink-muted">
            Số tiền thanh toán (đ)
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-ink/15 bg-white focus:border-primary outline-none text-sm"
          />
          {balance > 0 && (
            <button
              type="button"
              onClick={() => setAmount(String(balance))}
              className="mt-1 text-[11px] text-primary hover:underline"
            >
              Trả đủ số dư còn lại ({fullVND(balance)})
            </button>
          )}
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink-muted">
            Mã giao dịch / số tài khoản
          </span>
          <input
            type="text"
            value={transactionRef}
            onChange={(e) => setTransactionRef(e.target.value)}
            maxLength={100}
            className="mt-1 w-full h-11 px-3 rounded-xl border border-ink/15 bg-white focus:border-primary outline-none text-sm"
            placeholder="Không bắt buộc"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-ink-muted">Ghi chú</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-ink/15 bg-white focus:border-primary outline-none text-sm resize-none"
            placeholder="Không bắt buộc"
          />
        </label>

        {invalid && (
          <p className="text-xs text-red-600">
            Số tiền phải lớn hơn 0 và không vượt quá {fullVND(balance)}.
          </p>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button
            disabled={busy || invalid}
            onClick={() =>
              onSubmit({
                invoiceId: invoice.id,
                idempotencyKey: newIdempotencyKey(),
                paymentMethod: method,
                amount: value,
                transactionRef: transactionRef.trim() || null,
                note: note.trim() || null,
              })
            }
          >
            <IconCreditCard size={14} /> Xác nhận thanh toán
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =========================
// Modal huỷ hóa đơn
// =========================

export function VoidModal({
  invoice,
  busy,
  onClose,
  onSubmit,
}: {
  invoice: InvoiceResponse;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string | null) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal title="Huỷ hóa đơn" subtitle={invoice.code} onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          Huỷ hóa đơn <strong>{invoice.code}</strong> (
          {fullVND(invoice.grandTotal)})? Thao tác này không thể hoàn tác. Hệ thống
          sẽ gửi sự kiện <span className="font-mono">billing.invoice-voided</span>{" "}
          để đồng bộ trạng thái.
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink-muted">Lý do huỷ</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-ink/15 bg-white focus:border-primary outline-none text-sm resize-none"
            placeholder="Không bắt buộc"
          />
        </label>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Quay lại
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-200 hover:bg-red-50"
            disabled={busy}
            onClick={() => onSubmit(reason.trim() || null)}
          >
            <IconTrash size={14} /> Xác nhận huỷ
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// =========================
// Modal hoàn tiền
// =========================

export function RefundModal({
  payment,
  busy,
  onClose,
  onSubmit,
}: {
  payment: PaymentResponse;
  busy: boolean;
  onClose: () => void;
  onSubmit: (reason: string | null) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      title="Hoàn tiền giao dịch"
      subtitle={payment.code}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          Hoàn lại <strong>{fullVND(payment.amount)}</strong> của giao dịch{" "}
          {PAYMENT_LABEL[payment.paymentMethod]}? Hóa đơn sẽ trừ số tiền đã
          thanh toán và chuyển về trạng thái chưa thanh toán / thanh toán một phần.
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink-muted">Lý do hoàn tiền</span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-ink/15 bg-white focus:border-primary outline-none text-sm resize-none"
            placeholder="Không bắt buộc"
          />
        </label>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Quay lại
          </Button>
          <Button
            variant="outline"
            className="text-amber-700 border-amber-200 hover:bg-amber-50"
            disabled={busy}
            onClick={() => onSubmit(reason.trim() || null)}
          >
            <IconArrowUpRight size={14} /> Xác nhận hoàn tiền
          </Button>
        </div>
      </div>
    </Modal>
  );
}
