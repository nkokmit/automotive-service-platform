/**
 * Shared cart helpers — sử dụng tạm thời cho đến khi có backend.
 * Sẽ được thay thế bằng CartProvider + useCart() hook.
 *
 * Luật:
 * - 1 item / partId
 * - qty clamp 1..99
 * - Lưu localStorage key "autocare:cart"
 * - Mỗi thao tác write đều dispatch event "autocare:cart:changed" để
 *   các component có thể subscribe (đỡ phải prop-drill).
 */
import { mockParts } from "./mock";
import type { CatalogPart } from "./catalogTypes";

export const CART_KEY = "autocare:cart";

// =========================
// Registry phụ tùng của catalog đang hiển thị
// =========================
// Giỏ hàng lưu trong localStorage chỉ partId + qty. Để tra cứu được tên/giá
// khi catalog là dữ liệu THẬT từ inventory-service (id khác với dữ liệu mẫu),
// `CatalogProvider` đăng ký danh sách phụ tùng hiện tại vào đây.
let catalogParts: CatalogPart[] = mockParts;

/** Đăng ký catalog phụ tùng đang hiển thị (gọi từ CatalogProvider). */
export function registerCatalogParts(parts: CatalogPart[]) {
  catalogParts = parts.length > 0 ? parts : mockParts;
}

/** Tìm phụ tùng theo id trong catalog đang hiển thị, fallback về dữ liệu mẫu. */
export function findPart(partId: string): CatalogPart | undefined {
  return catalogParts.find((p) => p.id === partId) ?? mockParts.find((p) => p.id === partId);
}
export const CART_EVENT = "autocare:cart:changed";

export type CartItem = {
  partId: string;
  qty: number;
};

// =========================
// Read / write
// =========================
export function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    // Sanitize: ép qty về [1,99], bỏ item không hợp lệ
    return parsed
      .filter(
        (i): i is CartItem =>
          !!i &&
          typeof i.partId === "string" &&
          Number.isFinite(i.qty) &&
          i.qty > 0,
      )
      .map((i) => ({ partId: i.partId, qty: Math.min(99, Math.max(1, i.qty)) }));
  } catch {
    return [];
  }
}

export function writeCart(list: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(list));
  window.dispatchEvent(new CustomEvent(CART_EVENT));
}

function clampQty(q: number) {
  return Math.min(99, Math.max(1, Math.floor(q)));
}

// =========================
// Mutators
// =========================
export function addToCart(partId: string, qty: number = 1) {
  const list = readCart();
  const existing = list.find((i) => i.partId === partId);
  const inc = clampQty(qty);
  if (existing) {
    existing.qty = clampQty(existing.qty + inc);
  } else {
    list.push({ partId, qty: inc });
  }
  writeCart(list);
}

export function setCartQty(partId: string, qty: number) {
  const list = readCart();
  const existing = list.find((i) => i.partId === partId);
  const c = clampQty(qty);
  if (existing) {
    existing.qty = c;
  } else {
    list.push({ partId, qty: c });
  }
  writeCart(list);
}

export function removeFromCart(partId: string) {
  const list = readCart().filter((i) => i.partId !== partId);
  writeCart(list);
}

export function clearCart() {
  writeCart([]);
}

// =========================
// Selectors
// =========================
export function getCartCount(): number {
  return readCart().reduce((sum, i) => sum + i.qty, 0);
}

export function getCartTotal(): number {
  return readCart().reduce((sum, i) => {
    const part = findPart(i.partId);
    return part ? sum + part.priceVND * i.qty : sum;
  }, 0);
}

// Cart item kèm thông tin part (dùng cho UI)
export type CartLine = {
  part: CatalogPart;
  qty: number;
  lineTotal: number;
};

export function getCartLines(): CartLine[] {
  return readCart()
    .map((i) => {
      const part = findPart(i.partId);
      if (!part) return null;
      return { part, qty: i.qty, lineTotal: part.priceVND * i.qty };
    })
    .filter((x): x is CartLine => x !== null);
}

// =========================
// Format helpers (shared)
// =========================
export function formatCompactVND(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + " tỷ";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "tr";
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

export function formatFullVND(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + " đ";
}

export function getPartDiscountPercent(p: CatalogPart): number {
  if (!p.originalPriceVND || p.originalPriceVND <= p.priceVND) return 0;
  return Math.round(
    ((p.originalPriceVND - p.priceVND) / p.originalPriceVND) * 100,
  );
}

// =========================
// React hook
// =========================
import { useEffect, useState, useCallback } from "react";

/**
 * useCart — hook tối giản để đọc cart count.
 * Khi cart thay đổi (qua addToCart / setCartQty / removeFromCart / clearCart),
 * hook sẽ re-render.
 */
export function useCartCount(): number {
  const [count, setCount] = useState<number>(() => getCartCount());

  useEffect(() => {
    const refresh = () => setCount(getCartCount());
    window.addEventListener(CART_EVENT, refresh);
    // Đồng thời nghe storage event (sync giữa các tab)
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CART_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return count;
}

/**
 * useCartLines — hook trả về danh sách line items (kèm part).
 */
export function useCartLines(): CartLine[] {
  const [lines, setLines] = useState<CartLine[]>(() => getCartLines());

  const refresh = useCallback(() => setLines(getCartLines()), []);

  useEffect(() => {
    window.addEventListener(CART_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CART_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return lines;
}