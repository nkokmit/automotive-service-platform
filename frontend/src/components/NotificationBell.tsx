/**
 * NotificationBell — icon chuông + dropdown danh sách thông báo.
 *
 * Dùng chung cho cả layout khách hàng (`Header.tsx`) và layout quản trị
 * (`AdminLayout.tsx`) để chỉ có 1 nơi xử lý việc đọc SSE + badge.
 *
 * Nguồn dữ liệu: `notification-service`
 *  - GET /api/notifications/me            → danh sách
 *  - GET /api/notifications/me/unread-count → badge
 *  - PATCH /api/notifications/{id}/read   → đánh dấu đã đọc
 *  - PATCH /api/notifications/me/read-all → đánh dấu tất cả
 *  - GET /api/notifications/stream        → SSE real-time
 */
import { useEffect, useRef, useState } from "react";
import { IconBell, IconCheck, IconRefresh } from "./icons";
import Badge from "./Badge";
import { useToast } from "./Toast";
import { useNotifications } from "../data/notifications";
import type { NotificationCategory } from "../api/types";

/** Nhãn tiếng Việt + màu badge cho từng nhóm thông báo. */
const CATEGORY_META: Record<
  NotificationCategory,
  { label: string; className: string }
> = {
  BOOKING: { label: "Lịch hẹn", className: "bg-blue-100 text-blue-700" },
  WORK_ORDER: { label: "Phiếu sửa chữa", className: "bg-purple-100 text-purple-700" },
  BILLING: { label: "Hóa đơn", className: "bg-emerald-100 text-emerald-700" },
  INVENTORY: { label: "Kho", className: "bg-amber-100 text-amber-700" },
  SYSTEM: { label: "Hệ thống", className: "bg-slate-100 text-slate-700" },
};

/** Định dạng thời gian tương đối — gọn hơn `toLocaleString` cho danh sách ngắn. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "vừa xong";
  if (min < 60) return `${min} phút trước`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function NotificationBell() {
  const t = useToast();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const {
    items,
    unreadCount,
    loading,
    live,
    refresh,
    markRead,
    markAllRead,
  } = useNotifications({ enabled: true, limit: 10 });

  // Đóng dropdown khi click ra ngoài.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapRef.current &&
        !wrapRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleMarkRead = async (id: string) => {
    try {
      await markRead(id);
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không đánh dấu được thông báo",
      );
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const count = await markAllRead();
      t.success(
        count > 0
          ? `Đã đánh dấu ${count} thông báo là đã đọc`
          : "Không có thông báo chưa đọc",
      );
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không đánh dấu được thông báo",
      );
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-bgsoft text-ink-muted hover:text-ink"
        aria-label="Thông báo"
        aria-expanded={open}
        aria-haspopup="menu"
        title={
          live ? "Thông báo (cập nhật trực tiếp)" : "Thông báo (làm mới định kỳ)"
        }
      >
        <IconBell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-cardHover border border-ink/10 z-40 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-ink/8">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Thông báo</span>
              {live && (
                <span
                  className="text-[10px] font-medium text-emerald-600 flex items-center gap-1"
                  title="Đang nhận thông báo trực tiếp"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Trực tiếp
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => void refresh()}
                className="text-ink-muted hover:text-ink"
                aria-label="Tải lại thông báo"
                title="Tải lại"
              >
                <IconRefresh size={13} />
              </button>
              <button
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="text-xs text-primary hover:underline font-medium disabled:opacity-40 disabled:no-underline"
              >
                Đánh dấu đã đọc
              </button>
            </div>
          </div>

          {loading && items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-muted">
              Đang tải thông báo…
            </div>
          ) : items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-ink-muted">
              Chưa có thông báo nào
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-ink/5">
              {items.map((n) => {
                const meta = CATEGORY_META[n.category] ?? CATEGORY_META.SYSTEM;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => void handleMarkRead(n.id)}
                      className="w-full text-left px-4 py-3 hover:bg-bgsoft transition-colors flex gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.className}`}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[11px] text-ink-muted truncate">
                            {relativeTime(n.createdAt)}
                          </span>
                        </div>
                        <div
                          className={[
                            "text-sm mt-1 truncate",
                            n.isRead ? "text-ink-muted" : "font-semibold text-ink",
                          ].join(" ")}
                        >
                          {n.title}
                        </div>
                        <div className="text-xs text-ink-muted line-clamp-2 mt-0.5">
                          {n.content}
                        </div>
                      </div>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
                      )}
                      {n.isRead && (
                        <IconCheck
                          size={13}
                          className="text-ink-muted/40 shrink-0 mt-1"
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="px-4 py-2 border-t border-ink/8">
            <Badge tone="default" className="text-[10px]">
              {unreadCount > 0
                ? `${unreadCount} thông báo chưa đọc`
                : "Đã đọc hết thông báo"}
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
