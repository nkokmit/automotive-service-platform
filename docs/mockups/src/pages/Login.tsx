import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { IconCar, IconCheck } from "../components/icons";

export default function Login() {
  const [params] = useSearchParams();
  const initialMode = params.get("mode") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center">
              <IconCar size={22} />
            </span>
            <span className="font-bold text-lg text-primary">AutoCare</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản"}
          </h1>
          <p className="text-ink-light mb-8 text-sm">
            {mode === "login"
              ? "Đăng nhập để tiếp tục quản lý lịch đặt và sử dụng AI."
              : "Miễn phí. Chỉ mất 30 giây."}
          </p>

          {/* Tabs */}
          <div className="flex p-1 bg-bgsoft rounded-xl mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={[
                  "flex-1 py-2 text-sm font-medium rounded-lg transition-colors",
                  mode === m ? "bg-white shadow-sm text-ink" : "text-ink-muted",
                ].join(" ")}
              >
                {m === "login" ? "Đăng nhập" : "Đăng ký"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "register" && (
              <Input
                label="Họ và tên"
                placeholder="Nguyễn Văn A"
                autoComplete="name"
              />
            )}
            <Input
              type="email"
              label="Email"
              placeholder="you@example.com"
              autoComplete="email"
            />
            {mode === "register" && (
              <Input
                label="Số điện thoại"
                placeholder="0901 234 567"
                autoComplete="tel"
              />
            )}
            <Input
              type="password"
              label="Mật khẩu"
              placeholder="••••••••"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              hint={mode === "register" ? "Ít nhất 8 ký tự" : undefined}
            />
            {mode === "register" && (
              <Input
                type="password"
                label="Xác nhận mật khẩu"
                placeholder="••••••••"
                autoComplete="new-password"
              />
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-ink-light">
                  <input type="checkbox" className="rounded" /> Ghi nhớ đăng nhập
                </label>
                <a className="text-primary hover:underline" href="#">
                  Quên mật khẩu?
                </a>
              </div>
            )}

            {mode === "register" && (
              <label className="text-xs text-ink-light flex items-start gap-2">
                <input type="checkbox" className="rounded mt-0.5" />
                <span>
                  Tôi đồng ý với{" "}
                  <a className="text-primary hover:underline" href="#">
                    điều khoản sử dụng
                  </a>{" "}
                  và{" "}
                  <a className="text-primary hover:underline" href="#">
                    chính sách bảo mật
                  </a>
                </span>
              </label>
            )}

            <Button type="submit" size="lg" fullWidth disabled={loading}>
              {loading
                ? "Đang xử lý..."
                : mode === "login"
                  ? "Đăng nhập"
                  : "Tạo tài khoản"}
            </Button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white px-3 text-xs text-ink-muted">hoặc</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" type="button">
                Google
              </Button>
              <Button variant="outline" type="button">
                Facebook
              </Button>
            </div>
          </form>

          <p className="mt-6 text-sm text-ink-light text-center">
            {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-primary font-medium hover:underline"
            >
              {mode === "login" ? "Đăng ký" : "Đăng nhập"}
            </button>
          </p>
        </div>
      </div>

      {/* Right: visual */}
      <div className="hidden lg:flex bg-primary items-center justify-center p-12 relative overflow-hidden">
        <div className="relative z-10 text-white max-w-md">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center mb-6">
            <IconCar size={26} />
          </div>
          <h2 className="text-3xl font-bold leading-tight mb-4">
            AutoCare — người bạn đồng hành tin cậy của chủ xe
          </h2>
          <p className="text-white/85 mb-8">
            Hơn 500 garage uy tín, đặt lịch trong 30 giây, trợ lý AI phân tích
            hư hỏng tức thì.
          </p>
          <ul className="space-y-3 text-sm">
            {[
              "Tìm garage gần bạn với bản đồ",
              "Đặt lịch trực tuyến, xác nhận tức thì",
              "AI phân tích hư hỏng từ ảnh",
              "Lịch sử bảo dưỡng đầy đủ",
            ].map((f) => (
              <li key={f} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-accent text-ink flex items-center justify-center">
                  <IconCheck size={12} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -left-16 -top-16 w-64 h-64 rounded-full bg-white/5" />
      </div>
    </div>
  );
}