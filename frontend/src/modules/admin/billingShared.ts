import {
  IconBank,
  IconCreditCard,
  IconWallet,
} from "../../components/icons";
import type { InvoiceStatus, PaymentMethod } from "../../api/types";

export const STATUS_TONE: Record<
  InvoiceStatus,
  "default" | "primary" | "warning" | "accent"
> = {
  UNPAID: "warning",
  PARTIALLY_PAID: "primary",
  PAID: "accent",
  VOID: "default",
};

export const STATUS_LABEL: Record<InvoiceStatus, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  VOID: "Đã huỷ",
};

export const PAYMENT_ICON: Record<
  PaymentMethod,
  React.ComponentType<{ size?: number; className?: string }>
> = {
  CASH: IconWallet,
  BANK_TRANSFER: IconBank,
  CARD: IconCreditCard,
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  CARD: "Thẻ",
};

/** Định dạng ISO-8601 sang ngày giờ kiểu Việt Nam; trả về "—" nếu thiếu. */
export function fmtDate(iso?: string | null) {
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
