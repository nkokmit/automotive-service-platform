import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  IconWrench,
  IconArrowRight,
  IconShield,
} from "./icons";

// ===========================
// ErrorBoundary
// ===========================
interface ErrorBoundaryProps {
  children: ReactNode;
  /** UI tuỳ chỉnh khi xảy ra lỗi. Mặc định dùng <ErrorPage />. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /** Callback log lỗi — gắn với Sentry / console / API sau này. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * ErrorBoundary bắt mọi lỗi render trong cây component con và hiển thị UI dự phòng.
 *
 * Lưu ý quan trọng: ErrorBoundary KHÔNG bắt được:
 * - Lỗi trong event handler (dùng try/catch + toast.error)
 * - Lỗi bất đồng bộ (Promise rejection) — dùng try/catch + toast.error
 * - Lỗi ở chính ErrorBoundary component
 *
 * @example
 * <ErrorBoundary onError={(e) => logToService(e)}>
 *   <App />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info);
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    const { children, fallback } = this.props;
    if (error) {
        return fallback ? (
          fallback(error, this.reset)
        ) : (
          <ErrorPage error={error} reset={this.reset} />
        );
    }
    return children;
  }
}

// ===========================
// ErrorPage
// ===========================
interface ErrorPageProps {
  error?: Error;
  reset?: () => void;
  /** Mã lỗi HTTP-style để hiển thị (vd: "404", "500"). */
  code?: string;
  title?: string;
  description?: string;
}

/**
 * Trang lỗi toàn cục — dùng cho ErrorBoundary fallback hoặc route error.
 *
 * @example
 * <ErrorPage code="500" />
 */
export function ErrorPage({
  error,
  reset,
  code = "Đã có lỗi",
  title = "Đã xảy ra sự cố",
  description = "Ứng dụng gặp lỗi không mong muốn. Bạn có thể thử lại hoặc quay về trang chủ.",
}: ErrorPageProps) {
  const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true;
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-20 h-20 rounded-2xl bg-bgsoft flex items-center justify-center mb-6">
          <IconShield size={36} className="text-primary" />
        </div>
        <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
          Lỗi {code}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-ink mb-3">
          {title}
        </h1>
        <p className="text-ink-light mb-8">{description}</p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {reset && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-5 h-11 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover shadow-sm hover:shadow-md transition-all duration-150"
            >
              <IconWrench size={16} />
              Thử lại
            </button>
          )}
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 border border-ink/20 text-ink text-sm font-medium rounded-xl hover:bg-bgsoft hover:border-ink/40 transition-all duration-150"
          >
            Về trang chủ <IconArrowRight size={16} />
          </Link>
        </div>

        {error && isDev && (
          <details className="mt-8 text-left bg-bgsoft/50 rounded-xl p-4 border border-ink/10">
            <summary className="cursor-pointer text-xs font-medium text-ink-muted">
              Chi tiết lỗi (chỉ hiện ở môi trường dev)
            </summary>
            <pre className="mt-3 text-xs text-red-700 overflow-auto max-h-48 whitespace-pre-wrap break-words">
              {error.name}: {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

// ===========================
// NotFoundPage — cho route "*"
// ===========================
export function NotFoundPage() {
  return (
    <ErrorPage
      code="404"
      title="Không tìm thấy trang"
      description="Trang bạn đang tìm không tồn tại hoặc đã được di chuyển. Vui lòng kiểm tra lại đường dẫn."
    />
  );
}