import { useState, useMemo } from "react";
import {
  IconUsers,
  IconBuilding,
  IconShield,
  IconSearch,
  IconCheck,
  IconClose,
} from "../components/icons";
import Badge from "../components/Badge";
import Button from "../components/Button";
import { ConfirmModal } from "../components/AdminTable";
import {
  adminUsers,
  getRoleLabel,
  type AdminUser,
  type AdminUserRole,
} from "../data/adminMock";
import {
  formatCompactVND as compactVND,
} from "../data/cartStore";

// =========================
// AdminUsers — quản lý người dùng
// =========================

const ROLE_FILTERS: { id: "all" | AdminUserRole; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "customer", label: "Khách hàng" },
  { id: "garage_owner", label: "Chủ garage" },
  { id: "admin", label: "Quản trị viên" },
];

const ROLE_TONE: Record<AdminUserRole, "default" | "primary" | "accent" | "warning"> = {
  customer: "default",
  garage_owner: "primary",
  admin: "warning",
};

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [activeRole, setActiveRole] = useState<"all" | AdminUserRole>("all");
  const [actionConfirm, setActionConfirm] = useState<{
    user: AdminUser;
    action: "suspend" | "activate";
  } | null>(null);

  const filtered = useMemo(() => {
    return adminUsers.filter((u) => {
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
  }, [activeRole, search]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: adminUsers.length,
      customers: adminUsers.filter((u) => u.role === "customer").length,
      garages: adminUsers.filter((u) => u.role === "garage_owner").length,
      suspended: adminUsers.filter((u) => u.status === "suspended").length,
    };
  }, []);

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
            {stats.total} tài khoản · {stats.customers} khách hàng ·{" "}
            {stats.garages} chủ garage
            {stats.suspended > 0 && (
              <span className="text-red-500"> · {stats.suspended} bị khoá</span>
            )}
          </p>
        </div>
      </div>

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
          label="Chủ garage"
          value={stats.garages}
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
            Không có người dùng phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/30">
                  <th className="font-medium px-4 py-3">Người dùng</th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">Liên hệ</th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">Khu vực</th>
                  <th className="font-medium px-4 py-3 text-center">Vai trò</th>
                  <th className="font-medium px-4 py-3 hidden lg:table-cell text-right">Đơn / Doanh thu</th>
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
                            {u.garageName ? `Garage: ${u.garageName}` : `Tham gia: ${u.joinedAt}`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">
                      <div className="line-clamp-1">{u.email}</div>
                      <div className="text-ink-muted">{u.phone}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-sm text-ink-muted">
                      {u.city}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge tone={ROLE_TONE[u.role]}>{getRoleLabel(u.role)}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-right text-sm">
                      <div className="font-semibold">{u.totalOrders} đơn</div>
                      <div className="text-xs text-ink-muted">
                        {u.totalSpentVND > 0 ? compactVND(u.totalSpentVND) : "—"}
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
                      {u.role !== "admin" && (
                        u.status === "active" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 border-red-200 hover:bg-red-50"
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
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted">
          Hiển thị <strong className="text-ink">{filtered.length}</strong> / {adminUsers.length} người dùng
        </div>
      </div>

      {actionConfirm && (
        <ConfirmModal
          title={actionConfirm.action === "suspend" ? "Khoá tài khoản?" : "Mở khoá tài khoản?"}
          description={
            <>
              {actionConfirm.action === "suspend" ? (
                <>
                  Tài khoản <strong>{actionConfirm.user.name}</strong> sẽ không thể đăng nhập cho đến khi được mở khoá.
                </>
              ) : (
                <>
                  Tài khoản <strong>{actionConfirm.user.name}</strong> sẽ được khôi phục quyền truy cập.
                </>
              )}
            </>
          }
          confirmLabel={actionConfirm.action === "suspend" ? "Khoá" : "Mở khoá"}
          confirmTone={actionConfirm.action === "suspend" ? "danger" : "primary"}
          onClose={() => setActionConfirm(null)}
          onConfirm={() => setActionConfirm(null)}
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