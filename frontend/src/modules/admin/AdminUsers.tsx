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
  IconList,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import { ConfirmModal } from "../../components/AdminTable";
import { useToast } from "../../components/Toast";
import { adminUserApi } from "../../api/endpoints/user";
import { roleApi, userRoleApi } from "../../api/endpoints/rbac";
import type { RoleResponse, UserResponse } from "../../api/types";
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

/** Map role của backend sang nhóm hiển thị của admin. */
function mapRole(user: UserResponse): AdminUserRole {
  const names = (user.roles ?? []).map((r) => r.name?.toUpperCase() ?? "");
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
  const roleNames = (dto.roles ?? []).map((r) => r.name?.toUpperCase() ?? "");
  return {
    id: dto.id,
    name,
    email: dto.email,
    phone: dto.phone ?? "—",
    role: mapRole(dto),
    roleNames,
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

  // ── Gán role cho user (POST/DELETE /api/users/{id}/roles) ───────────────
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [roleIdsByUser, setRoleIdsByUser] = useState<Record<string, string[]>>(
    {},
  );
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roleSaving, setRoleSaving] = useState(false);
  const [roleError, setRoleError] = useState<string | null>(null);

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
      // Nhớ luôn id các role của từng user để mở modal gán role không phải
      // gọi lại API.
      const map: Record<string, string[]> = {};
      for (const dto of page.items ?? []) {
        map[dto.id] = (dto.roles ?? []).map((r) => r.id);
      }
      setRoleIdsByUser(map);
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

  /** Danh sách role dùng cho modal gán role (cần authority `ROLE_READ`). */
  useEffect(() => {
    let cancelled = false;
    roleApi
      .listRoles({ size: 200 })
      .then((page) => {
        if (!cancelled) setRoles(page.items ?? []);
      })
      .catch(() => {
        // Không tải được danh sách role → modal gán role sẽ báo lỗi khi mở.
        if (!cancelled) setRoles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Mở modal gán role — chọn sẵn các role user đang có. */
  const openRoleEditor = useCallback((u: AdminUser) => {
    setRoleError(null);
    setRoleTarget(u);
    setSelectedRoles(roleIdsByUser[u.id] ?? []);
  }, [roleIdsByUser]);

  const toggleRole = (id: string) => {
    setSelectedRoles((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  /** Lưu tập role mới cho user — endpoint thay thế TOÀN BỘ role cũ. */
  const saveRoles = async () => {
    if (!roleTarget || roleSaving) return;
    setRoleSaving(true);
    setRoleError(null);
    try {
      const saved = await userRoleApi.assignRoles(
        roleTarget.id,
        selectedRoles,
      );
      const next = mapUser(saved);
      setUsers((prev) =>
        prev.map((u) => (u.id === roleTarget.id ? { ...next, id: u.id } : u)),
      );
      setRoleIdsByUser((prev) => ({
        ...prev,
        [roleTarget.id]: (saved.roles ?? []).map((r) => r.id),
      }));
      t.success(`Đã cập nhật vai trò cho "${roleTarget.name}".`);
      setRoleTarget(null);
    } catch (err) {
      setRoleError(
        err instanceof Error ? err.message : "Không lưu được vai trò.",
      );
    } finally {
      setRoleSaving(false);
    }
  };

  /** Gỡ một role khỏi user (DELETE /api/users/{id}/roles/{roleId}). */
  const removeRoleFromUser = async (
    user: AdminUser,
    roleId: string,
  ) => {
    try {
      const saved = await userRoleApi.removeRole(user.id, roleId);
      const next = mapUser(saved);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...next, id: u.id } : u)),
      );
      const remaining = (saved.roles ?? []).map((r) => r.id);
      setRoleIdsByUser((prev) => ({ ...prev, [user.id]: remaining }));
      setSelectedRoles(remaining);
      t.success("Đã gỡ vai trò khỏi tài khoản.");
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không gỡ được vai trò.",
      );
    }
  };

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
                        <Avatar name={u.name} size={40} />
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
                      <div className="flex flex-col items-center gap-1">
                        <Badge tone={ROLE_TONE[u.role]}>
                          {getRoleLabel(u.role)}
                        </Badge>
                        {u.roleNames.length > 0 && (
                          <div className="flex flex-wrap justify-center gap-1">
                            {u.roleNames.map((rn) => (
                              <span
                                key={rn}
                                className="text-[10px] font-mono text-ink-muted bg-bgsoft px-1.5 py-0.5 rounded"
                              >
                                {rn}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
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
                        <Button
                          size="sm"
                          variant="outline"
                          title="Gán vai trò"
                          onClick={() => openRoleEditor(u)}
                        >
                          <IconList size={12} />
                          <span className="hidden sm:inline">Vai trò</span>
                        </Button>
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

      {/* Modal gán vai trò cho tài khoản */}
      {roleTarget && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => !roleSaving && setRoleTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-ink/8 sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-base">Vai trò của tài khoản</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  {roleTarget.name} · {roleTarget.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRoleTarget(null)}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
                aria-label="Đóng"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-3">
              {roles.length === 0 ? (
                <p className="text-sm text-ink-muted">
                  Không tải được danh sách vai trò. Cần authority{" "}
                  <code className="bg-bgsoft px-1 py-0.5 rounded">ROLE_READ</code>{" "}
                  để xem danh sách này.
                </p>
              ) : (
                <div className="border border-ink/8 rounded-xl divide-y divide-ink/5">
                  {roles.map((r) => {
                    const checked = selectedRoles.includes(r.id);
                    return (
                      <label
                        key={r.id}
                        className="flex items-start gap-3 px-3 py-2.5 hover:bg-bgsoft/50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRole(r.id)}
                          className="mt-0.5 accent-primary w-4 h-4 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-[13px] font-semibold">
                            {r.name}
                          </div>
                          {r.displayName && (
                            <div className="text-xs text-ink-muted line-clamp-1">
                              {r.displayName}
                            </div>
                          )}
                        </div>
                        {checked && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              void removeRoleFromUser(roleTarget, r.id);
                            }}
                            title="Gỡ quyền này khỏi tài khoản"
                            className="text-xs text-red-500 hover:text-red-600 inline-flex items-center gap-1 shrink-0"
                          >
                            <IconClose size={12} />
                            Gỡ
                          </button>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}

              {roleError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {roleError}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-ink/8 flex gap-2 justify-end sticky bottom-0 bg-white">
              <Button
                variant="outline"
                type="button"
                onClick={() => setRoleTarget(null)}
                disabled={roleSaving}
              >
                Huỷ
              </Button>
              <Button
                type="button"
                onClick={() => void saveRoles()}
                disabled={roleSaving}
              >
                <IconCheck size={14} />
                {roleSaving ? "Đang lưu..." : "Lưu vai trò"}
              </Button>
            </div>
          </div>
        </div>
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
