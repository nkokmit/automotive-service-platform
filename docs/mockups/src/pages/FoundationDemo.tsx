import { useEffect, useState } from "react";
import { useToast } from "../components/Toast";
import {
  Spinner,
  Skeleton,
  SkeletonCard,
  SkeletonGrid,
  FullPageSpinner,
} from "../components/Loading";
import Button from "../components/Button";
import Card from "../components/Card";

/**
 * Trang demo các foundation components:
 *   - F11 Toast (4 tone + variants)
 *   - F12 Loading (Spinner, Skeleton, FullPageSpinner, SkeletonGrid)
 *   - F13 Error Boundary (link tới /boom-demo để test throw error)
 *
 * Mục đích: QA & dev test trước khi áp dụng cho các trang nghiệp vụ.
 */
export default function FoundationDemo() {
  const t = useToast();
  const [skeletonVisible, setSkeletonVisible] = useState(true);
  const [skeletonKey, setSkeletonKey] = useState(0);

  // Auto-hide skeleton sau 3s để demo hiệu ứng "load xong"
  useEffect(() => {
    if (!skeletonVisible) return;
    const id = setTimeout(() => setSkeletonVisible(false), 3000);
    return () => clearTimeout(id);
  }, [skeletonVisible]);

  return (
    <div className="container-page py-10 md:py-16 space-y-12">
      <header>
        <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-2">
          Foundation Components
        </p>
        <h1 className="text-3xl md:text-4xl font-bold text-ink mb-2">
          F11 · F12 · F13 — Toast / Loading / Error Boundary
        </h1>
        <p className="text-ink-light max-w-2xl">
          Bộ 3 component nền tảng dùng chung cho mọi trang sau này. Toast ở góc
          trên-phải, skeleton tự ẩn sau 3 giây, ErrorBoundary demo tại trang
          riêng.
        </p>
      </header>

      {/* ============== F11 - TOAST ============== */}
      <section>
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-xl md:text-2xl font-bold">
            F11 — Toast notification
          </h2>
          <button
            onClick={() => t.clear()}
            className="text-sm text-ink-muted hover:text-ink underline"
          >
            Clear all
          </button>
        </div>
        <Card className="p-6">
          <p className="text-sm text-ink-light mb-4">
            4 tone (success / error / info / warning) + tuỳ chọn duration,
            persistent, custom position. Toast ở góc trên-phải, stack tối đa 5
            cái, click <kbd className="px-1.5 py-0.5 rounded bg-bgsoft text-xs">×</kbd>{" "}
            hoặc đợi auto-dismiss.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                t.success("Đặt lịch thành công! Bạn sẽ nhận xác nhận qua email.")
              }
            >
              Success toast
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                t.error("Không thể kết nối server. Vui lòng thử lại sau.")
              }
            >
              Error toast
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                t.info("AutoCare có 12 xe mới được đăng trong tuần này.")
              }
            >
              Info toast
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                t.warning("Bảo hành của bạn sắp hết hạn trong 7 ngày.", {
                  duration: 8000,
                })
              }
            >
              Warning toast (8s)
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                t.info("Toast này không tự ẩn, click × để đóng.", {
                  persistent: true,
                })
              }
            >
              Persistent toast
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                for (let i = 1; i <= 7; i++) {
                  t.info(`Toast thứ ${i} — test giới hạn stack 5`);
                }
              }}
            >
              Spam 7 toast (test max=5)
            </Button>
          </div>
        </Card>
      </section>

      {/* ============== F12 - LOADING ============== */}
      <section>
        <h2 className="text-xl md:text-2xl font-bold mb-4">
          F12 — Loading states
        </h2>

        {/* Spinner */}
        <Card className="p-6 mb-5">
          <h3 className="font-semibold mb-4">Spinner</h3>
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Spinner size="sm" />
              <span className="text-sm text-ink-muted">size="sm"</span>
            </div>
            <div className="flex items-center gap-3">
              <Spinner size="md" />
              <span className="text-sm text-ink-muted">size="md"</span>
            </div>
            <div className="flex items-center gap-3">
              <Spinner size="lg" />
              <span className="text-sm text-ink-muted">size="lg"</span>
            </div>
            <div className="flex items-center gap-3 bg-primary text-white px-4 h-11 rounded-xl">
              <Spinner size="sm" />
              <span className="text-sm">Loading...</span>
            </div>
          </div>
        </Card>

        {/* Skeleton */}
        <Card className="p-6 mb-5">
          <div className="flex items-end justify-between mb-4">
            <h3 className="font-semibold">Skeleton (component-level)</h3>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSkeletonVisible(true);
                  setSkeletonKey((k) => k + 1);
                }}
              >
                Replay 3s loading
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-ink-muted mb-2">Skeleton variants</p>
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton variant="text" />
                  <Skeleton variant="text" className="w-4/5" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xs text-ink-muted mb-2">
                SkeletonGrid — 4 card (sẽ tự ẩn sau 3s)
              </p>
              {skeletonVisible ? (
                <SkeletonGrid key={skeletonKey} count={4} />
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-[4/3] rounded-2xl bg-bgsoft/40 flex items-center justify-center text-ink-muted text-sm"
                    >
                      Loaded #{i + 1}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* SkeletonCard */}
        <Card className="p-6 mb-5">
          <h3 className="font-semibold mb-4">
            SkeletonCard — composite (ảnh + title + lines)
          </h3>
          <div className="grid sm:grid-cols-3 gap-5">
            <SkeletonCard lines={3} />
            <SkeletonCard lines={2} hasImage={false} />
            <SkeletonCard lines={4} />
          </div>
        </Card>

        {/* FullPageSpinner */}
        <Card className="p-0 overflow-hidden">
          <FullPageSpinner label="Đang tải danh sách xe..." />
        </Card>
      </section>

      {/* ============== F13 - ERROR BOUNDARY ============== */}
      <section>
        <h2 className="text-xl md:text-2xl font-bold mb-4">
          F13 — Error Boundary
        </h2>
        <Card className="p-6">
          <p className="text-sm text-ink-light mb-4">
            ErrorBoundary bắt lỗi render component và hiển thị ErrorPage. Truy
            cập trang <code>/boom-demo</code> để xem ErrorBoundary kích hoạt
            (sẽ throw error ngay lập tức).
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/boom-demo">
              <Button variant="primary">Mở /boom-demo (test throw)</Button>
            </a>
            <a href="/khong-ton-tai-12345">
              <Button variant="outline">Test route 404</Button>
            </a>
          </div>
          <details className="mt-6 bg-bgsoft/40 rounded-xl p-4 text-sm">
            <summary className="cursor-pointer font-medium">
              Code mẫu sử dụng
            </summary>
            <pre className="mt-3 text-xs text-ink overflow-auto whitespace-pre">
{`// Trong main.tsx:
<ErrorBoundary onError={(err) => console.error(err)}>
  <Routes>...</Routes>
</ErrorBoundary>

// Hoặc wrap 1 phần nhỏ:
<ErrorBoundary fallback={(err, reset) => (
  <ErrorPage error={err} reset={reset} code="Lỗi cục bộ" />
)}>
  <ExpensiveWidget />
</ErrorBoundary>`}
            </pre>
          </details>
        </Card>
      </section>
    </div>
  );
}