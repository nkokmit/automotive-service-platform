import type { ReactNode } from "react";

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  shape?: "full" | "xl";
  className?: string;
  children?: ReactNode;
}

const PALETTE = [
  "bg-primary/15 text-primary",
  "bg-accent/25 text-ink",
  "bg-emerald-100 text-emerald-800",
  "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-800",
  "bg-rose-100 text-rose-800",
  "bg-violet-100 text-violet-800",
];

function hashOf(text: string): number {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0][0] ?? "";
  const last = parts[parts.length - 1][0] ?? "";
  return (first + last).toUpperCase();
}

export default function Avatar({
  name,
  src,
  size = 40,
  shape = "full",
  className = "",
  children,
}: AvatarProps) {
  const dim = { width: size, height: size };
  const round = shape === "full" ? "rounded-full" : "rounded-2xl";
  const base = [
    "inline-flex items-center justify-center overflow-hidden shrink-0",
    round,
    "select-none",
    className,
  ].join(" ");

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        style={dim}
        className={base + " object-cover"}
      />
    );
  }

  return (
    <span
      style={dim}
      aria-label={name}
      title={name}
      className={
        base +
        " " +
        PALETTE[hashOf(name) % PALETTE.length] +
        " font-semibold"
      }
    >
      <span style={{ fontSize: Math.max(11, Math.round(size * 0.38)) }}>
        {initialsOf(name)}
      </span>
    </span>
  );
}
