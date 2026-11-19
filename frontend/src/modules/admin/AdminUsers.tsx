import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IconUsers,
  IconBuilding,
  IconShield,
  IconSearch,
  IconCheck,
  IconClose,
  IconRefresh,
  IconTrash,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { ConfirmModal } from "../../components/AdminTable";
import { useToast } from "../../components/Toast";
import { adminUserApi } from "../../api/endpoints/user";
import type { UserResponse } from "../../api/types";
import {
  getRoleLabel,
  type AdminUser,
  type AdminUserRole,
} from "../../data/adminMock";

// =========================
// AdminUsers — quản lý người dùng
// Nguồn dữ liệu: GET /api/users (cần USER_READ)
// Khoá / mở khoá: PUT /api/users/{id} (cần USER_UPDATE)
// =========================

const ROLE_FILTERS: { id: "all" | AdminUserRole; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "customer", label: "Khách hàng" },
  { id: "garage_owner", label: "Nhân viên xưởng" },
  { id: "admin", label: "Quản trị viên" },
];

const ROLE_TONE: Record<AdminUserRole, "default" | "primary" | "accent" | "warning"> = {
  customer: "default",
  garage_owner: "primary",
  admin: "warning",
};

/** Avatar tạm theo tên (backend chưa có trường avatar). */
function avatarFor(seed: string): string {
  const hash = Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0);
  const seeds = [
    "photo-1535713875002-d1d0cf377fde",
    "photo-1438761681033-6461ffad8d80",
    "photo-1500648767791-00dcc994a43e",
    "photo-1507003211169-0a1dd7228f2d",
    "photo-1494790108377-be9c29b29330",
  ];
  const pick = seeds[hash % seeds.length];
  return `https://images.unsplash.com/${pick}?auto=format&fit=crop&w=200&q=70`;
}

/** Map role của backend sang nhóm hiển thị của admin. */
function mapRole(user: UserResponse): AdminUserRole {
  const names = Array.from(user.roles ?? []).map((r) => r.name?.toUpperCase() ?? "");
  if (names.includes("ADMIN")) return "admin";
  if (
    names.some((n) =>
      ["MANAGER", "MECHANIC", "SERVICE_ADVISOR"].includes(n),
    )
  )
    return "garage_owner";
  return "customer";
}

function mapUser(dto: UserResponse): AdminUser {
  const name = dto.fullName?.trim() || dto.username;
  return {
    id: dto.id,
    name,
    email: dto.email,
    phone: dto.phone ?? "—",
    avatar: avatarFor(dto.id),
    role: mapRole(dto),
    city: "—",
    joinedAt: "—",
    totalOrders: 0,
    totalSpentVND: 0,
    status: dto.isActive === false ? "suspended" : "active",
  };
}

export default function AdminUsers() {
  const t = useToast();
  const [search, setSearch] = useState("");
  const [activeRole, setActiveRole] = useState<"all" | AdminUserRole>("all");
  const [actionConfirm, setActionConfirm] = useState<{
    user: AdminUser;
    action: "suspend" | "activate" | "delete";
  } | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Nhận `?q=` từ ô tìm kiếm trên topbar admin
  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery) setSearch(urlQuery);
  }, [urlQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await adminUserApi.listUsers({ size: 100 });
      setUsers((page.items ?? []).map(mapUser));
    } catch (err) {
      setUsers([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách người dùng từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (activeRole !== "all" && u.role !== activeRole) return false;
      if (search) {
        const s = search.toLowerCase();
        if (
          !u.name.toLowerCase().includes(s) &&
          !u.email.toLowerCase().includes(s) &&
          !(u.phone || "").includes(s)
        )
          return false;
      }
      return true;
    });
  }, [activeRole, search, users]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: users.length,
      customers: users.filter((u) => u.role === "customer").length,
      staff: users.filter((u) => u.role === "garage_owner").length,
      suspended: users.filter((u) => u.status === "suspended").length,
    };
  }, [users]);

  /** Khoá / mở khoá / xoá tài khoản qua PUT / DELETE /api/users/{id}. */
  const applyAction = useCallback(
    async (user: AdminUser, action: "suspend" | "activate" | "delete") => {
      setBusy(true);
      try {
        if (action === "delete") {
          await adminUserApi.deleteUser(user.id);
          setUsers((prev) => prev.filter((u) => u.id !== user.id));
          t.success(`Đã xoá tài khoản "${user.name}".`);
          return;
        }

        const isActive = action === "activate";
        const saved = await adminUserApi.updateUser(user.id, { isActive });
        const next = mapUser(saved);
        setUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...next, id: u.id } : u)),
        );
        t.success(
          action === "suspend"
            ? `Đã khoá tài khoản "${user.name}".`
            : `Đã mở khoá tài khoản "${user.name}".`,
        );
      } catch (err) {
        t.error(
          err instanceof Error
            ? err.message
            : "Không cập nhật được trạng thái tài khoản.",
        );
      } finally {
        setBusy(false);
        setActionConfirm(null);
      }
    },
    [t],
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconUsers size={20} />
            </span>
            Quản lý người dùng
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading
              ? "Đang tải danh sách tài khoản..."
              : `${stats.total} tài khoản · ${stats.customers} khách hàng · ${stats.staff} nhân viên xưởng`}
            {stats.suspended > 0 && (
              <span className="text-red-500"> · {stats.suspended} bị khoá</span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <IconRefresh size={14} />
          Tải lại
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh size={14} />
            Thử lại
          </Button>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<IconUsers size={16} className="text-white" />}
          label="Tổng tài khoản"
          value={stats.total}
          color="bg-primary"
        />
        <StatCard
          icon={<IconShield size={16} className="text-white" />}
          label="Khách hàng"
          value={stats.customers}
          color="bg-emerald-500"
        />
        <StatCard
          icon={<IconBuilding size={16} className="text-white" />}
          label="Nhân viên xưởng"
          value={stats.staff}
          color="bg-amber-500"
        />
        <StatCard
          icon={<IconClose size={16} className="text-white" />}
          label="Bị khoá"
          value={stats.suspended}
          color="bg-red-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 max-w-md flex items-center gap-2 h-11 px-3 rounded-xl border border-ink/15 bg-white focus-within:border-primary">
          <IconSearch size={16} className="text-ink-muted" />
          <input
            type="text"
            placeholder="Tìm tên, email, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {ROLE_FILTERS.map((r) => (
            <button
              key={r.id}
              onClick={() => setActiveRole(r.id)}
              className={[
                "text-sm font-medium px-3 py-2 rounded-xl transition-colors",
                activeRole === r.id
                  ? "bg-primary text-white"
                  : "bg-white border border-ink/10 text-ink-muted hover:border-primary/40",
              ].join(" ")}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            {loading ? "Đang tải..." : "Không có người dùng phù hợp."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/30">
                  <th className="font-medium px-4 py-3">Người dùng</th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">Liên hệ</th>
                  <th className="font-medium px-4 py-3 text-center">Vai trò</th>
                  <th className="font-medium px-4 py-3 text-center">Trạng thái</th>
                  <th className="font-medium px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={u.avatar}
                          alt={u.name}
                          className="w-10 h-10 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-sm line-clamp-1">
                            {u.name}
                          </div>
                          <div className="text-xs text-ink-muted line-clamp-1">
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">
                      <div className="line-clamp-1">{u.email}</div>
                      <div className="text-ink-muted">{u.phone}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={ROLE_TONE[u.role]}>{getRoleLabel(u.role)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {u.status === "active" ? (
                        <Badge tone="accent">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" />
                          Hoạt động
                        </Badge>
                      ) : (
                        <Badge tone="warning">Bị khoá</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {u.role !== "admin" &&
                          (u.status === "active" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-700 border-amber-200 hover:bg-amber-50"
                              onClick={() =>
                                setActionConfirm({ user: u, action: "suspend" })
                              }
                            >
                              Khoá
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              onClick={() =>
                                setActionConfirm({ user: u, action: "activate" })
                              }
                            >
                              <IconCheck size={12} />
                              Mở khoá
                            </Button>
                          ))}
                        {u.role !== "admin" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50"
                            title="Xoá tài khoản"
                            onClick={() =>
                              setActionConfirm({ user: u, action: "delete" })
                            }
                          >
                            <IconTrash size={12} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted">
          Hiển thị <strong className="text-ink">{filtered.length}</strong> / {users.length} người dùng
        </div>
      </div>

      {actionConfirm && (
        <ConfirmModal
          title={
            actionConfirm.action === "suspend"
              ? "Khoá tài khoản?"
              : actionConfirm.action === "activate"
                ? "Mở khoá tài khoản?"
                : "Xoá tài khoản?"
          }
          description={
            <>
              {actionConfirm.action === "suspend" ? (
                <>
                  Tài khoản <strong>{actionConfirm.user.name}</strong> sẽ không thể đăng nhập cho đến khi được mở khoá.
                </>
              ) : actionConfirm.action === "activate" ? (
                <>
                  Tài khoản <strong>{actionConfirm.user.name}</strong> sẽ được khôi phục quyền truy cập.
                </>
              ) : (
                <>
                  Tài khoản <strong>{actionConfirm.user.name}</strong> sẽ bị xoá khỏi hệ thống. Hành động này không thể hoàn tác.
                </>
              )}
            </>
          }
          confirmLabel={
            actionConfirm.action === "suspend"
              ? "Khoá"
              : actionConfirm.action === "activate"
                ? "Mở khoá"
                : "Xoá"
          }
          confirmTone={
            actionConfirm.action === "activate" ? "primary" : "danger"
          }
          loading={busy}
          onClose={() => setActionConfirm(null)}
          onConfirm={() =>
            void applyAction(actionConfirm.user, actionConfirm.action)
          }
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white border border-ink/8 rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <div className="text-xs text-ink-muted">{label}</div>
      </div>
      <div className="text-2xl font-bold mt-2">{value}</div>
    </div>
  );
}
