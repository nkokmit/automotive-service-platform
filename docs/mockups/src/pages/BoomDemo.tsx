import { useEffect } from "react";

/**
 * Trang test ErrorBoundary — throw error ngay khi mount để ErrorBoundary bắt.
 * Mở /boom-demo để kiểm tra fallback UI.
 */
export default function BoomDemo() {
  useEffect(() => {
    // Throw trong effect — sẽ trigger componentDidCatch của ErrorBoundary
    throw new Error("Boom! Đây là lỗi demo từ /boom-demo để test ErrorBoundary.");
  }, []);
  return null;
}