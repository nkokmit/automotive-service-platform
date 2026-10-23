/**
 * RequireAuth — bảo vệ route cần đăng nhập.
 *
 * Cách hoạt động:
 *  1. Đọc token trong localStorage. Không có → chuyển hướng `/login` ngay.
 *  2. Có token → gọi `GET /api/users/me` để xác nhận token còn hợp lệ và lấy
 *     profile thật. Nếu token hết hạn, `client.ts` đã tự refresh trước đó.
 *
 * Vì sao gọi API thay vì chỉ đọc token: token hợp lệ về mặt chữ ký không đồng
 * nghĩa là tài khoản còn active hoặc chưa bị gán quyền mới.
 */
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hydrateUser, readSession } from "../data/authStore";
import { getAccessToken } from "../api/session";
import type { AuthUser } from "../data/authStore";

export default function RequireAuth({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [user, setUser] = useState<AuthUser | null>(
    () => readSession()?.user ?? null,
  );
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Không có token → không cần gọi mạng, dữ liệu cache cũng không còn ý nghĩa.
    if (!getAccessToken()) {
      setUser(null);
      setChecking(false);
      return;
    }

    hydrateUser()
      .then((session) => {
        if (cancelled) return;
        setUser(session?.user ?? null);
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-ink-muted">Đang kiểm tra phiên đăng nhập...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // `state.from` để Login.tsn quay lại đúng trang user định vào sau khi đăng nhập.
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}