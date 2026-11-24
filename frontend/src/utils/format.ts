/**
 * Helper format dùng chung cho toàn bộ web.
 *
 * Tách ra khỏi `data/cartStore.ts` vì giỏ hàng đã bị gỡ (backend không có
 * `/api/cart` / `/api/orders`) nhưng phần format tiền tệ vẫn cần ở khắp nơi.
 */
import type { CatalogPart } from "../data/catalogTypes";

/** 489.000.000 → "489tr"; 1.450.000 → "1,4tr"; còn lại → "12.000đ". */
export function formatCompactVND(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "tr";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

/** 4890000 → "4.890.000 đ". */
export function formatFullVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

/** % giảm giá của một phụ tùng (0 nếu không có giá gốc hoặc không giảm). */
export function getPartDiscountPercent(p: CatalogPart): number {
  if (!p.originalPriceVND || p.originalPriceVND <= p.priceVND) return 0;
  return Math.round(
    ((p.originalPriceVND - p.priceVND) / p.originalPriceVND) * 100,
  );
}
