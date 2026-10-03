import type { ReactNode } from "react";

type Tone = "default" | "primary" | "accent" | "warning";

interface Props {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const toneMap: Record<Tone, string> = {
  default: "bg-bgsoft text-ink",
  primary: "bg-primary/10 text-primary",
  accent: "bg-accent text-ink",
  warning: "bg-amber-100 text-amber-800",
};

export default function Badge({
  children,
  tone = "default",
  className = "",
}: Props) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
        toneMap[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}