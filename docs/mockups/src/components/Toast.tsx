import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  IconCheck,
  IconClose,
  IconSparkles,
  IconWrench,
} from "./icons";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  /** Thời gian tự ẩn (ms). 0 = không tự ẩn. Mặc định 4000. */
  duration?: number;
  /** Tone — quyết định icon + màu. Mặc định "info". */
  tone?: ToastTone;
  /** Không cho user đóng toast (chỉ auto-dismiss). */
  persistent?: boolean;
}

interface InternalToast extends Required<Omit<ToastOptions, "persistent">> {
  id: string;
  message: string;
  persistent: boolean;
  createdAt: number;
}

interface ToastContextValue {
  toast: (message: string, options?: ToastOptions) => string;
  success: (message: string, options?: ToastOptions) => string;
  error: (message: string, options?: ToastOptions) => string;
  info: (message: string, options?: ToastOptions) => string;
  warning: (message: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
  clear: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      "useToast() phải được dùng bên trong <ToastProvider>. Hãy wrap App với provider.",
    );
  }
  return ctx;
}

interface ToastProviderProps {
  children: ReactNode;
  /** Vị trí hiển thị toast. Mặc định "top-right". */
  position?: "top-right" | "top-center" | "bottom-right" | "bottom-center";
  /** Giới hạn số toast đồng thời. Mặc định 5. */
  maxToasts?: number;
}

const positionClassMap: Record<NonNullable<ToastProviderProps["position"]>, string> =
  {
    "top-right": "top-4 right-4 items-end",
    "top-center": "top-4 left-1/2 -translate-x-1/2 items-center",
    "bottom-right": "bottom-4 right-4 items-end",
    "bottom-center": "bottom-4 left-1/2 -translate-x-1/2 items-center",
  };

export function ToastProvider({
  children,
  position = "top-right",
  maxToasts = 5,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<InternalToast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clear = useCallback(() => setToasts([]), []);

  const push = useCallback(
    (message: string, options: ToastOptions = {}): string => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `t_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const toast: InternalToast = {
        id,
        message,
        tone: options.tone ?? "info",
        duration: options.duration ?? 4000,
        persistent: options.persistent ?? false,
        createdAt: Date.now(),
      };
      setToasts((prev) => {
        // Nếu quá giới hạn → xoá toast cũ nhất
        const next = [...prev, toast];
        if (next.length > maxToasts) next.shift();
        return next;
      });
      if (!toast.persistent && toast.duration > 0) {
        setTimeout(() => dismiss(id), toast.duration);
      }
      return id;
    },
    [dismiss, maxToasts],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (m, o) => push(m, { ...o, tone: "success" }),
      error: (m, o) => push(m, { ...o, tone: "error", duration: o?.duration ?? 6000 }),
      info: (m, o) => push(m, { ...o, tone: "info" }),
      warning: (m, o) => push(m, { ...o, tone: "warning" }),
      dismiss,
      clear,
    }),
    [push, dismiss, clear],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} position={position} />
    </ToastContext.Provider>
  );
}

// ===========================
// INTERNAL: ToastContainer
// ===========================
interface ToastContainerProps {
  toasts: InternalToast[];
  onDismiss: (id: string) => void;
  position: NonNullable<ToastProviderProps["position"]>;
}

const toneStyleMap: Record<
  ToastTone,
  { bar: string; icon: ReactNode; iconBg: string }
> = {
  success: {
    bar: "bg-primary",
    iconBg: "bg-primary/15 text-primary",
    icon: <IconCheck size={18} />,
  },
  error: {
    bar: "bg-red-500",
    iconBg: "bg-red-100 text-red-700",
    icon: <IconClose size={18} />,
  },
  info: {
    bar: "bg-ink-light",
    iconBg: "bg-bgsoft text-ink",
    icon: <IconSparkles size={18} />,
  },
  warning: {
    bar: "bg-amber-500",
    iconBg: "bg-amber-100 text-amber-800",
    icon: <IconWrench size={18} />,
  },
};

function ToastContainer({
  toasts,
  onDismiss,
  position,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div
      role="region"
      aria-label="Thông báo"
      aria-live="polite"
      className={[
        "fixed z-[100] flex flex-col gap-2 pointer-events-none",
        positionClassMap[position],
      ].join(" ")}
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: InternalToast;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const style = toneStyleMap[toast.tone];
  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      className="pointer-events-auto toast-enter bg-white rounded-xl shadow-cardHover border border-ink/10 overflow-hidden flex items-stretch max-w-sm w-[calc(100vw-2rem)] sm:w-96"
    >
      {/* Left color bar */}
      <div className={["w-1 shrink-0", style.bar].join(" ")} />
      <div className="flex items-center gap-3 p-3 flex-1">
        <div
          className={[
            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
            style.iconBg,
          ].join(" ")}
        >
          {style.icon}
        </div>
        <p className="text-sm text-ink leading-snug flex-1 break-words">
          {toast.message}
        </p>
        {!toast.persistent && (
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Đóng thông báo"
            className="p-1 rounded-md text-ink-muted hover:bg-bgsoft hover:text-ink transition-colors"
          >
            <IconClose size={16} />
          </button>
        )}
      </div>
    </div>
  );
}