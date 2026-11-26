import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch } from "./icons";

/**
 * Ô tìm kiếm dùng chung — submit sẽ điều hướng tới `/search?q=...`.
 *
 * `shortcut` bật phím tắt ⌘K / Ctrl+K để focus ngay khi bấm vào bất kỳ đâu
 * trên trang (mặc định false — chỉ bật cho ô trong admin topbar).
 */
export default function SearchBox({
  placeholder = "Tìm dịch vụ, phụ tùng...",
  className = "",
  inputClassName = "",
  shortcut = false,
  onNavigate,
}: {
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Bật phím tắt ⌘K / Ctrl+K để focus ô nhập. */
  shortcut?: boolean;
  /** Gọi khi submit — mặc định điều hướng tới /search?q=... */
  onNavigate?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shortcut) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcut]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (onNavigate) {
      onNavigate(q);
      return;
    }
    navigate(`/search?q=${encodeURIComponent(q)}`);
    inputRef.current?.blur();
  };

  return (
    <form onSubmit={handleSubmit} className={className} role="search">
      <div className="flex items-center gap-2 h-10 px-3 rounded-xl border border-ink/15 bg-bgsoft/40 w-full focus-within:bg-white focus-within:border-primary transition-colors">
        <IconSearch size={18} className="text-ink-muted shrink-0" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className={[
            "flex-1 bg-transparent outline-none text-sm placeholder:text-ink-muted min-w-0",
            inputClassName,
          ].join(" ")}
        />
        {shortcut && (
          <kbd className="hidden lg:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded border border-ink/15 bg-white text-ink-muted shrink-0">
            ⌘K
          </kbd>
        )}
      </div>
    </form>
  );
}
