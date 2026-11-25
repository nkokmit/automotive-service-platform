/**
 * AdminStaff — quản lý hồ sơ nhân viên (kỹ thuật viên, tư vấn viên, thu ngân).
 *
 * Nguồn dữ liệu (staff-service):
 *  - GET    /api/staff           → danh sách (lọc keyword/isActive)
 *  - GET    /api/staff/{id}      → chi tiết
 *  - POST   /api/staff           → tạo hồ sơ
 *  - PUT    /api/staff/{id}      → cập nhật hồ sơ
 *  - PATCH  /api/staff/{id}/is-active → bật/tắt
 *  - DELETE /api/staff/{id}      → xoá (soft delete)
 *  - GET    /api/users           → danh sách tài khoản để liên kết `userId`
 *
 * Cần authority: STAFF_READ (xem) / STAFF_CREATE, STAFF_UPDATE, STAFF_DELETE (ghi).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  IconUsers,
  IconSearch,
  IconRefresh,
  IconWarning,
  IconCheckCircle,
  IconClose,
  IconCalendar,
  IconEdit,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import { staffApi } from "../../api/endpoints/staff";
import { adminUserApi } from "../../api/endpoints/user";
import { hasTokenAuthority } from "../../api/session";
import type { StaffResponse, UserResponse } from "../../api/types";

// =========================
// Nhãn chức vụ
// =========================

const POSITION_LABEL: Record<string, string> = {
  MECHANIC: "Kỹ thuật viên",
  TECHNICIAN: "Kỹ thuật viên",
  SERVICE_ADVISOR: "Tư vấn viên",
  CASHIER: "Thu ngân",
  RECEPTIONIST: "Lễ tân",
  MANAGER: "Quản lý",
  ADMIN: "Quản trị viên",
  WAREHOUSE: "Kho",
};

const POSITION_OPTIONS = [
  { value: "MECHANIC", label: "Kỹ thuật viên" },
  { value: "SERVICE_ADVISOR", label: "Tư vấn viên" },
  { value: "CASHIER", label: "Thu ngân" },
  { value: "RECEPTIONIST", label: "Lễ tân" },
  { value: "WAREHOUSE", label: "Nhân viên kho" },
  { value: "MANAGER", label: "Quản lý" },
];

function positionLabel(position: string | null) {
  if (!position) return "—";
  return POSITION_LABEL[position] ?? position;
}

// =========================
// AdminStaff
// =========================

export default function AdminStaff() {
  const t = useToast();
  const [staff, setStaff] = useState<StaffResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Ô tìm kiếm (chưa áp dụng) — chỉ gửi lên server khi bấm "Tìm" / Enter. */
  const [keywordInput, setKeywordInput] = useState("");
  /** Từ khoá đã áp dụng (`keyword` của `/api/staff`). */
  const [keyword, setKeyword] = useState("");
  /** Lọc trạng thái ở server (`isActive`). */
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | null>(null);

  /** Danh sách tài khoản để liên kết `userId` — cần `USER_READ`. */
  const [users, setUsers] = useState<UserResponse[]>([]);

  /** Hồ sơ đang mở trong modal sửa (null = đang tạo mới). */
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<StaffResponse | null>(null);

  const [params] = useSearchParams();
  const urlQuery = params.get("q") ?? "";
  useEffect(() => {
    if (urlQuery) {
      setKeywordInput(urlQuery);
      setKeyword(urlQuery);
    }
  }, [urlQuery]);

  const canCreate = hasTokenAuthority("STAFF_CREATE");
  const canUpdate = hasTokenAuthority("STAFF_UPDATE");
  const canDelete = hasTokenAuthority("STAFF_DELETE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await staffApi.listStaff({
        size: 100,
        keyword: keyword.trim() || undefined,
        isActive: isActiveFilter ?? undefined,
      });
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
  }, [keyword, isActiveFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  // Danh sách tài khoản — chỉ tải khi cần tạo/sửa hồ sơ.
  useEffect(() => {
    if (!canCreate && !canUpdate) return;
    if (users.length > 0) return;
    void adminUserApi
      .listUsers({ page: 0, size: 100 })
      .then((res) => setUsers(res.items ?? []))
      .catch(() => setUsers([]));
  }, [canCreate, canUpdate, users.length]);

  const stats = useMemo(
    () => ({
      total: staff.length,
      active: staff.filter((s) => s.isActive).length,
      mechanic: staff.filter((s) => s.position === "MECHANIC").length,
    }),
    [staff],
  );

  /** Bật/tắt — backend dùng PATCH `/api/staff/{id}/is-active`. */
  const handleToggleActive = useCallback(
    async (row: StaffResponse) => {
      const next = row.isActive !== true;
      try {
        const updated = await staffApi.updateStaffIsActive(row.id, next);
        setStaff((prev) => prev.map((s) => (s.id === row.id ? updated : s)));
        t.success(
          next
            ? `Đã cho "${updated.fullName}" đi làm việc`
            : `Đã tạm ngưng "${updated.fullName}"`,
        );
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không cập nhật được trạng thái",
        );
      }
    },
    [t],
  );

  const handleDelete = useCallback(
    async (row: StaffResponse) => {
      await staffApi.deleteStaff(row.id);
      t.success(`Đã xoá hồ sơ "${row.fullName}"`);
      return { ...row, isActive: false };
    },
    [t],
  );

  /** Tạo / sửa hồ sơ. */
  const handleSubmit = useCallback(
    async (
      values: Record<string, string | number>,
      initial: StaffResponse | null,
    ) => {
      const payload = {
        employeeCode: String(values.employeeCode ?? "").trim(),
        fullName: String(values.fullName ?? "").trim(),
        phone: String(values.phone ?? "").trim() || null,
        email: String(values.email ?? "").trim() || null,
        position: String(values.position ?? "").trim() || null,
        userId: String(values.userId ?? "").trim() || null,
      };

      if (!payload.employeeCode) throw new Error("Mã nhân viên không được để trống.");
      if (!payload.fullName) throw new Error("Họ tên không được để trống.");

      const saved = initial
        ? await staffApi.updateStaff(initial.id, payload)
        : await staffApi.createStaff({ ...payload, isActive: true });

      setStaff((prev) =>
        initial
          ? prev.map((s) => (s.id === saved.id ? saved : s))
          : [saved, ...prev],
      );
      t.success(
        initial
          ? `Đã cập nhật hồ sơ "${saved.fullName}"`
          : `Đã thêm nhân viên "${saved.fullName}"`,
      );
      return saved;
    },
    [t],
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh size={14} />
            Thử lại
          </Button>
        </div>
      )}

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
            {loading
              ? "Đang tải danh sách nhân viên..."
              : `${stats.total} nhân viên · ${stats.active} đang làm việc · ${stats.mechanic} kỹ thuật viên`}
          </p>
        </div>
        <div className="flex gap-2">
          {canCreate && (
            <Button
              size="sm"
              onClick={() => {
                setEditing(null);
                setEditorOpen(true);
              }}
            >
              <IconUsers size={14} />
              Thêm nhân viên
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Tổng nhân viên" value={stats.total} color="bg-primary" />
        <StatCard label="Đang làm việc" value={stats.active} color="bg-emerald-500" />
        <StatCard label="Kỹ thuật viên" value={stats.mechanic} color="bg-amber-500" />
      </div>

      {/* Bộ lọc */}
      <Card hover={false}>
        <div className="p-3 flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Tìm tên, mã nhân viên, chức vụ..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setKeyword(keywordInput);
              }}
              leftIcon={<IconSearch size={16} />}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setKeyword(keywordInput)}
          >
            <IconSearch size={14} />
            Tìm
          </Button>
          <div className="flex gap-1.5 flex-wrap">
            {(
              [
                { id: "all" as const, label: "Tất cả" },
                { id: "active" as const, label: "Đang làm việc" },
                { id: "inactive" as const, label: "Tạm ngưng" },
              ]
            ).map((f) => {
              const value =
                f.id === "all" ? null : f.id === "active" ? true : false;
              const active = isActiveFilter === value;
              return (
                <button
                  key={f.id}
                  onClick={() => setIsActiveFilter(value)}
                  className={[
                    "text-xs font-medium px-2.5 py-1.5 rounded-full transition-colors",
                    active
                      ? "bg-primary text-white"
                      : "bg-bgsoft text-ink-muted hover:bg-ink/10",
                  ].join(" ")}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Bảng */}
      <Card hover={false}>
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Đang tải nhân viên...
          </div>
        ) : staff.length === 0 ? (
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
                  <th className="font-medium px-4 py-3 text-right">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink line-clamp-1">
                        {s.fullName ?? "—"}
                      </div>
                      <div className="text-[11px] text-ink-muted font-mono">
                        {s.employeeCode ?? "—"}
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
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          to={`/admin/staff/${s.id}/schedule`}
                          className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                          title="Xem lịch trình"
                        >
                          <IconCalendar size={15} />
                        </Link>
                        {canUpdate && (
                          <>
                            <button
                              onClick={() => void handleToggleActive(s)}
                              className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                              title={
                                s.isActive
                                  ? "Tạm ngưng nhân viên"
                                  : "Cho đi làm việc"
                              }
                            >
                              {s.isActive ? (
                                <IconClose size={15} />
                              ) : (
                                <IconCheckCircle size={15} />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditing(s);
                                setEditorOpen(true);
                              }}
                              className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                              title="Sửa hồ sơ"
                            >
                              <IconEdit size={15} />
                            </button>
                          </>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => void handleDelete(s)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500"
                            title="Xoá hồ sơ"
                          >
                            <IconClose size={15} />
                          </button>
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
          Hiển thị <strong className="text-ink">{staff.length}</strong> nhân viên
        </div>
      </Card>

      {/* ── Modal tạo / sửa hồ sơ ─────────────────────────────────────────── */}
      {editorOpen && (
        <StaffEditorModal
          open
          users={users}
          onClose={() => {
            setEditorOpen(false);
            setEditing(null);
          }}
          onSubmit={handleSubmit}
          initial={editing}
        />
      )}

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

// =========================
// Modal tạo / sửa hồ sơ
// =========================

function StaffEditorModal({
  open,
  users,
  initial,
  onClose,
  onSubmit,
}: {
  open: boolean;
  users: UserResponse[];
  initial: StaffResponse | null;
  onClose: () => void;
  onSubmit: (
    values: Record<string, string | number>,
    initial: StaffResponse | null,
  ) => Promise<unknown>;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [employeeCode, setEmployeeCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [position, setPosition] = useState("MECHANIC");
  const [userId, setUserId] = useState("");

  // Nạp dữ liệu hồ sơ vào form mỗi khi modal mở.
  useEffect(() => {
    if (!open) return;
    setEmployeeCode(initial?.employeeCode ?? "");
    setFullName(initial?.fullName ?? "");
    setPhone(initial?.phone ?? "");
    setEmail(initial?.email ?? "");
    setPosition(initial?.position ?? "MECHANIC");
    setUserId(initial?.userId ?? "");
    setError(null);
  }, [open, initial]);

  const close = () => {
    setError(null);
    onClose();
  };

  const submit = async () => {
    setError(null);
    if (!employeeCode.trim()) {
      setError("Mã nhân viên không được để trống.");
      return;
    }
    if (!fullName.trim()) {
      setError("Họ tên không được để trống.");
      return;
    }
    setSaving(true);
    try {
      await onSubmit(
        { employeeCode, fullName, phone, email, position, userId },
        initial,
      );
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được hồ sơ");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="px-5 py-4 border-b border-ink/8 flex items-center justify-between">
          <h3 className="font-semibold">
            {initial ? "Cập nhật hồ sơ nhân viên" : "Thêm nhân viên"}
          </h3>
          <button
            onClick={close}
            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
          >
            <IconClose size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-muted mb-1 block">
                Mã nhân viên *
              </label>
              <Input
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="VD: NV-010"
              />
            </div>
            <div>
              <label className="text-xs text-ink-muted mb-1 block">
                Chức vụ
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
              >
                {POSITION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-muted mb-1 block">Họ tên *</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-ink-muted mb-1 block">
                Điện thoại
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="VD: 0901234567"
              />
            </div>
            <div>
              <label className="text-xs text-ink-muted mb-1 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="VD: a@b.vn"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-ink-muted mb-1 block">
              Liên kết tài khoản đăng nhập
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
            >
              <option value="">-- Không liên kết --</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username} · {u.fullName ?? u.email}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-ink-muted mt-1.5">
              Mỗi tài khoản chỉ được liên kết với một hồ sơ nhân viên.
            </p>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-ink/8 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={close}>
            Huỷ
          </Button>
          <Button size="sm" onClick={() => void submit()} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =========================
// Stat card
// =========================

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
