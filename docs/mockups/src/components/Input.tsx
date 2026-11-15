import type { InputHTMLAttributes, ReactNode } from "react";

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
}

export default function Input({
  label,
  hint,
  error,
  leftIcon,
  className = "",
  id,
  ...rest
}: Props) {
  const inputId = id || `input-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div
        className={[
          "flex items-center gap-2 h-11 px-3 rounded-xl border bg-white transition-colors",
          error
            ? "border-red-400 focus-within:border-red-500"
            : "border-ink/15 focus-within:border-primary",
          className,
        ].join(" ")}
      >
        {leftIcon && <span className="text-ink-muted">{leftIcon}</span>}
        <input
          id={inputId}
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted"
          {...rest}
        />
      </div>
      {error ? (
        <span className="text-xs text-red-500">{error}</span>
      ) : hint ? (
        <span className="text-xs text-ink-muted">{hint}</span>
      ) : null}
    </div>
  );
}