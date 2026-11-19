import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  IconUsers,
  IconSearch,
  IconRefresh,
  IconWarning,
  IconCheckCircle,
  IconClose,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { staffApi } from "../../api/endpoints/staff";
import type { StaffResponse } from "../../api/types";

// =========================
// AdminStaff — Kỹ thuật viên / Nhân viên xưởng
// Nguồn dữ liệu: GET /api/staff (cần authority STAFF_READ)
// =========================

const POSITION_LABEL: Record<string, string> = {
  MECHANIC: "Kỹ thuật viên",
  SERVICE_ADVISOR: "Tư vấn viên",
  CASHIER: "Thu ngân",
  MANAGER: "Quản lý",
  ADMIN: "Quản trị viên",
  TECHNICIAN: "Kỹ thuật viên",
};

function positionLabel(position: string | null) {
  if (!position) return "—";
  return POSITION_LABEL[position] ?? position;
}

export default function AdminStaff() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">(
    "all",
  );
  const [staff, setStaff] = useState<StaffResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery) setSearch(urlQuery);
  }, [urlQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await staffApi.listStaff({ size: 50 });
      setStaff(page.items ?? []);
    } catch (err) {
      setStaff([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách nhân viên từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      if (activeFilter === "active" && !s.isActive) return false;
      if (activeFilter === "inactive" && s.isActive) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        return (
          (s.fullName ?? "").toLowerCase().includes(q) ||
          (s.employeeCode ?? "").toLowerCase().includes(q) ||
          (s.position ?? "").toLowerCase().includes(q) ||
          (s.email ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [staff, search, activeFilter]);

  const stats = useMemo(
    () => ({
      total: staff.length,
      active: staff.filter((s) => s.isActive).length,
      mechanic: staff.filter((s) => s.position === "MECHANIC").length,
    }),
    [staff],
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
            Kỹ thuật viên & Nhân viên
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            Nguồn:{" "}
            <code className="text-xs bg-bgsoft px-1.5 py-0.5 rounded">
              GET /api/staff
            </code>{" "}
            · {stats.total} nhân viên · {stats.active} đang làm việc
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Tổng nhân viên" value={stats.total} color="bg-primary" />
        <StatCard label="Đang làm việc" value={stats.active} color="bg-emerald-500" />
        <StatCard label="Kỹ thuật viên" value={stats.mechanic} color="bg-amber-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 max-w-md flex items-center gap-2 h-11 px-3 rounded-xl border border-ink/15 bg-white focus-within:border-primary">
          <IconSearch size={16} className="text-ink-muted" />
          <input
            type="text"
            placeholder="Tìm tên, mã nhân viên, chức vụ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(
            [
              { id: "all", label: "Tất cả" },
              { id: "active", label: "Đang làm việc" },
              { id: "inactive", label: "Tạm ngưng" },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={[
                "text-sm font-medium px-3 py-2 rounded-xl transition-colors",
                activeFilter === f.id
                  ? "bg-primary text-white"
                  : "bg-white border border-ink/10 text-ink-muted hover:border-primary/40",
              ].join(" ")}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Đang tải nhân viên...
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="font-semibold mb-2">Không tải được danh sách nhân viên</p>
            <p className="text-sm text-ink-light mb-5">{error}</p>
            <Button variant="outline" onClick={() => void load()}>
              <IconRefresh size={14} /> Thử lại
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Không có nhân viên nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/30">
                  <th className="font-medium px-4 py-3">Nhân viên</th>
                  <th className="font-medium px-4 py-3">Mã NV</th>
                  <th className="font-medium px-4 py-3">Chức vụ</th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">
                    Liên hệ
                  </th>
                  <th className="font-medium px-4 py-3 text-center">
                    Trạng thái
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink line-clamp-1">
                        {s.fullName ?? "—"}
                      </div>
                      <div className="text-[11px] text-ink-muted font-mono">
                        ID: {s.id.slice(0, 8)}…
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {s.employeeCode ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="primary">{positionLabel(s.position)}</Badge>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">
                      <div className="line-clamp-1">{s.phone ?? "—"}</div>
                      <div className="text-ink-muted line-clamp-1">
                        {s.email ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {s.isActive ? (
                        <Badge tone="accent">
                          <IconCheckCircle size={11} /> Đang làm việc
                        </Badge>
                      ) : (
                        <Badge tone="warning">
                          <IconClose size={11} /> Tạm ngưng
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted">
          Hiển thị <strong className="text-ink">{filtered.length}</strong> /{" "}
          {staff.length} nhân viên
        </div>
      </div>

      {error && (
        <p className="text-xs text-ink-muted flex items-center gap-1">
          <IconWarning size={12} />
          Nếu bạn thấy lỗi quyền truy cập, hãy đăng nhập bằng tài khoản ADMIN /
          MANAGER (cần authority STAFF_READ).
        </p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white border border-ink/8 rounded-2xl p-4">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="text-2xl font-bold mt-2">{value}</div>
      <div className={`h-1 w-10 rounded-full mt-2 ${color}`} />
    </div>
  );
}
