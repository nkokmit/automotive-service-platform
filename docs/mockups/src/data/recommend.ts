/**
 * Recommendation engine — tính điểm cho mỗi candidate part dựa trên nhiều tín hiệu
 * (cross-sell, upsell, related). Hoạt động hoàn toàn offline trên mock data.
 *
 * Signals:
 *  - Same category:        +50
 *  - Compatible cars match: +30 per overlap (max +60)
 *  - Same brand:           +15
 *  - BestSeller:           +10
 *  - Featured:             +5
 *  - Rating boost:          0..+10  (rating - 4.0) * 10  (clamp 0..10)
 *  - Discount has:         +5 (có originalPriceVND)
 *  - Price afford boost:   +5 if candidate price ≤ cart avg
 *
 * Penalties:
 *  - Already in cart:      excluded (handled in filter)
 *  - Same slug pattern:    -20 (avoid recommending near-identical items)
 *
 * Contexts (variants):
 *  - "cart-cross-sell":    cart items only
 *  - "checkout-upsell":    cart items + nudge higher price
 *  - "part-related":       current part → recommend same category + compat
 *  - "service-related":    service category → recommend related parts
 */

import { parts, type Part } from "./mock";

// =========================
// Types
// =========================

export type RecommendVariant =
  | "cart-cross-sell"
  | "checkout-upsell"
  | "part-related"
  | "service-related";

export type ScoredPart = {
  part: Part;
  score: number;
  /** Lý do gợi ý (debug/UI hint) */
  reasons: string[];
};

export interface RecommendContext {
  variant: RecommendVariant;
  /** Cart items (partId) hiện tại — bỏ qua khi recommend. */
  cartPartIds?: Set<string>;
  /** Part hiện tại đang xem (cho variant="part-related"). */
  currentPartId?: string;
  /** Service category hiện tại (cho variant="service-related"). */
  serviceCategory?: string;
  /** Service provider garage city (cho "service-related" — ưu tiên part hợp với garage). */
  providerCity?: string;
  /** Số lượng item trả về. */
  limit?: number;
  /** Nếu true, dùng deterministic seed (cho SSR/testing). */
  deterministic?: boolean;
}

// =========================
// Service → Part category mapping (cho service-related)
// =========================
// Khi user xem dịch vụ "Bảo dưỡng", recommend các part bảo dưỡng tương ứng.
const SERVICE_TO_PART_CATEGORIES: Record<string, string[]> = {
  "Bảo dưỡng": ["Dầu nhớt", "Lọc dầu / Lọc gió"],
  "Sửa chữa": ["Phanh", "Đèn / Pha"],
  "Sơn & thân vỏ": ["Phụ kiện ngoại thất"],
  "Điện - Điều hòa": ["Ắc quy", "Đèn / Pha"],
  "Lốp & phanh": ["Lốp xe", "Phanh"],
  "Khác": [],
};

// =========================
// Scoring
// =========================

function compatibilityOverlap(
  candidate: Part,
  sourceCompatibles: string[],
): { score: number; count: number } {
  if (!candidate.compatibleCars || candidate.compatibleCars.length === 0)
    return { score: 0, count: 0 };
  if (!sourceCompatibles || sourceCompatibles.length === 0)
    return { score: 0, count: 0 };

  // Normalize string để so sánh (lowercase, ignore spaces)
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const cand = new Set(candidate.compatibleCars.map(norm));
  let count = 0;
  for (const src of sourceCompatibles) {
    const n = norm(src);
    // Match exact hoặc substring (VD "Toyota Vios" match "Toyota")
    if (cand.has(n) || [...cand].some((c) => n.includes(c) || c.includes(n))) {
      count++;
    }
  }
  return { score: Math.min(60, count * 30), count };
}

function getDiscountPercent(p: Part): number {
  if (!p.originalPriceVND || p.originalPriceVND <= p.priceVND) return 0;
  return Math.round(
    ((p.originalPriceVND - p.priceVND) / p.originalPriceVND) * 100,
  );
}

/**
 * Core scoring — tính điểm cho 1 candidate dựa trên context.
 */
function scoreCandidate(
  candidate: Part,
  ctx: RecommendContext,
): ScoredPart | null {
  // Không recommend chính nó
  if (candidate.id === ctx.currentPartId) return null;

  // Đã có trong giỏ → loại (không spam user thêm cái đã chọn)
  if (ctx.cartPartIds?.has(candidate.id)) return null;

  let score = 0;
  const reasons: string[] = [];

  // ----- Source signals (từ giỏ hàng / part hiện tại / service) -----
  const sourceParts: Part[] = [];
  if (ctx.cartPartIds) {
    for (const p of parts) {
      if (ctx.cartPartIds.has(p.id)) sourceParts.push(p);
    }
  }
  if (ctx.currentPartId) {
    const cur = parts.find((p) => p.id === ctx.currentPartId);
    if (cur) sourceParts.push(cur);
  }

  // Same category (chỉ tính nếu sourceParts có cái cùng category)
  if (sourceParts.length > 0) {
    const sameCat = sourceParts.some((s) => s.category === candidate.category);
    if (sameCat) {
      score += 50;
      reasons.push("Cùng danh mục");
    }
  }

  // Service-related: map category
  if (ctx.variant === "service-related" && ctx.serviceCategory) {
    const targetCats = SERVICE_TO_PART_CATEGORIES[ctx.serviceCategory] || [];
    if (targetCats.includes(candidate.category)) {
      score += 60;
      reasons.push(`Phụ tùng cho "${ctx.serviceCategory}"`);
    }
  }

  // Compatible cars overlap
  if (sourceParts.length > 0) {
    const sourceCompat = sourceParts
      .flatMap((p) => p.compatibleCars || [])
      .filter(Boolean);
    const overlap = compatibilityOverlap(candidate, sourceCompat);
    if (overlap.count > 0) {
      score += overlap.score;
      reasons.push(
        overlap.count === 1
          ? "Tương thích 1 dòng xe"
          : `Tương thích ${overlap.count} dòng xe`,
      );
    }
  }

  // Same brand
  if (sourceParts.some((s) => s.brand === candidate.brand)) {
    score += 15;
    reasons.push(`Cùng thương hiệu ${candidate.brand}`);
  }

  // ----- Universal quality signals -----

  if (candidate.isBestSeller) {
    score += 10;
    reasons.push("Bán chạy");
  }
  if (candidate.isFeatured) {
    score += 5;
    reasons.push("Nổi bật");
  }

  // Rating boost (4.0 → 0, 5.0 → 10)
  const ratingBoost = Math.max(0, Math.min(10, (candidate.rating - 4.0) * 10));
  if (ratingBoost > 0) {
    score += ratingBoost;
  }

  // Có giảm giá → boost nhẹ
  if (getDiscountPercent(candidate) > 0) {
    score += 5;
    reasons.push("Đang giảm giá");
  }

  // Price afford (chỉ áp dụng cho cart-cross-sell / checkout-upsell)
  if (
    (ctx.variant === "cart-cross-sell" || ctx.variant === "checkout-upsell") &&
    sourceParts.length > 0
  ) {
    const avgPrice =
      sourceParts.reduce((s, p) => s + p.priceVND, 0) / sourceParts.length;
    if (candidate.priceVND <= avgPrice * 1.2) {
      score += 5;
    }
  }

  // ----- Penalties -----
  // Near-duplicate slug (avoid "Lốp Michelin 205/55R16" + "Lốp Michelin 215/55R17" duplicate)
  if (sourceParts.length > 0) {
    for (const src of sourceParts) {
      if (
        src.slug && candidate.slug &&
        src.slug !== candidate.slug &&
        // Same base token ở 8 ký tự đầu → coi là "dòng sản phẩm"
        src.slug.slice(0, 8) === candidate.slug.slice(0, 8)
      ) {
        score -= 20;
        reasons.length = 0; // xoá reasons vì quá nhiễu
        reasons.push("Sản phẩm cùng dòng");
        break;
      }
    }
  }

  // Score âm → bỏ
  if (score <= 0) return null;

  return { part: candidate, score, reasons };
}

// =========================
// Main API
// =========================

/**
 * Lấy danh sách part được gợi ý theo context.
 */
export function getRecommendations(ctx: RecommendContext): ScoredPart[] {
  const limit = ctx.limit ?? 4;

  const scored: ScoredPart[] = [];
  for (const candidate of parts) {
    const result = scoreCandidate(candidate, ctx);
    if (result) scored.push(result);
  }

  // Sort: score desc → rating desc → price asc
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.part.rating !== a.part.rating) return b.part.rating - a.part.rating;
    return a.part.priceVND - b.part.priceVND;
  });

  // Lấy top N
  const top = scored.slice(0, limit);

  // Nếu không đủ N (data nhỏ), không pad — caller tự quyết định hiển thị gì.
  return top;
}

/**
 * Lấy cart-aware recommendations cho cart cross-sell.
 */
export function recommendForCart(
  cartPartIds: Set<string>,
  limit = 4,
): ScoredPart[] {
  return getRecommendations({
    variant: "cart-cross-sell",
    cartPartIds,
    limit,
  });
}

/**
 * Lấy recommendations cho upsell tại checkout (slightly nudge higher price).
 */
export function recommendForCheckout(
  cartPartIds: Set<string>,
  limit = 4,
): ScoredPart[] {
  return getRecommendations({
    variant: "checkout-upsell",
    cartPartIds,
    limit,
  });
}

/**
 * Lấy related parts cho PartDetail.
 */
export function recommendForPart(currentPartId: string, limit = 4): ScoredPart[] {
  return getRecommendations({
    variant: "part-related",
    currentPartId,
    limit,
  });
}

/**
 * Lấy related parts cho ServiceDetail (theo service category).
 */
export function recommendForService(
  serviceCategory: string,
  limit = 4,
): ScoredPart[] {
  return getRecommendations({
    variant: "service-related",
    serviceCategory,
    limit,
  });
}