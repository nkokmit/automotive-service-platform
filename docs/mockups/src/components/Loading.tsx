import type { CSSProperties, HTMLAttributes } from "react";

// ===========================
// Spinner
// ===========================
type SpinnerSize = "sm" | "md" | "lg";

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Màu — "primary" dùng cho primary CTA, "white" cho nền tối. */
  tone?: "primary" | "white" | "current";
  /** Hiển thị label kèm theo spinner. */
  label?: string;
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 36,
};

export function Spinner({
  size = "md",
  className = "",
  label,
}: SpinnerProps) {
  const px = sizeMap[size];
  return (
    <span
      role="status"
      aria-label={label ?? "Đang tải"}
      className={["inline-flex items-center gap-2", className].join(" ")}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        className="spinner-ring"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="3"
        />
        <path
          d="M21 12a9 9 0 0 1-9 9"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <span className="text-sm text-ink-light">{label}</span>
      )}
    </span>
  );
}

// ===========================
// Skeleton
// ===========================
interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Class Tailwind để set width/height (vd: "w-full h-4"). */
  className?: string;
  /** Kiểu shape. */
  variant?: "rect" | "text" | "circle";
}

/**
 * Skeleton dùng cho loading. Mặc định là "rect" — kế thừa width/height từ className.
 *
 * @example
 * <Skeleton className="h-40 w-full" />  // ảnh loading
 * <Skeleton variant="text" />           // dòng text (full width, h-4)
 * <Skeleton variant="circle" className="w-12 h-12" /> // avatar
 */
export function Skeleton({
  className = "",
  variant = "rect",
  style,
  ...rest
}: SkeletonProps) {
  const variantClass =
    variant === "text"
      ? "h-4 w-full rounded-md"
      : variant === "circle"
        ? "rounded-full"
        : "rounded-xl";
  return (
    <div
      aria-hidden="true"
      className={[
        "skeleton-shimmer bg-bgsoft/80",
        variantClass,
        className,
      ].join(" ")}
      style={style as CSSProperties}
      {...rest}
    />
  );
}

// ===========================
// SkeletonCard — composite card loading
// ===========================
interface SkeletonCardProps {
  /** Số dòng text. Mặc định 2. */
  lines?: number;
  /** Có ảnh phía trên không. Mặc định true. */
  hasImage?: boolean;
  className?: string;
}

export function SkeletonCard({
  lines = 2,
  hasImage = true,
  className = "",
}: SkeletonCardProps) {
  return (
    <div
      className={[
        "bg-white border border-ink/8 rounded-2xl shadow-card overflow-hidden",
        className,
      ].join(" ")}
    >
      {hasImage && <Skeleton className="h-40 w-full rounded-none" />}
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-3/4" />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

// ===========================
// SkeletonGrid — wrap nhiều SkeletonCard
// ===========================
interface SkeletonGridProps {
  count?: number;
  hasImage?: boolean;
  lines?: number;
  /** Class Tailwind cho layout. Mặc định "grid grid-cols-2 lg:grid-cols-4 gap-5". */
  className?: string;
}

export function SkeletonGrid({
  count = 4,
  hasImage = true,
  lines = 2,
  className = "grid grid-cols-2 lg:grid-cols-4 gap-5",
}: SkeletonGridProps) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard
          key={i}
          hasImage={hasImage}
          lines={lines}
        />
      ))}
    </div>
  );
}

// ===========================
// FullPageSpinner — toàn trang
// ===========================
interface FullPageSpinnerProps {
  label?: string;
}

export function FullPageSpinner({ label = "Đang tải..." }: FullPageSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
      className="min-h-[60vh] flex flex-col items-center justify-center gap-3"
    >
      <Spinner size="lg" />
      <p className="text-sm text-ink-light">{label}</p>
    </div>
  );
}