import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export default function Card({
  children,
  className = "",
  hover = true,
}: Props) {
  return (
    <div
      className={[
        "bg-white border border-ink/8 rounded-2xl shadow-card",
        hover ? "transition-shadow hover:shadow-cardHover" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}