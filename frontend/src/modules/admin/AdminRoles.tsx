import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconShield,
  IconUsers,
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconClose,
  IconWarning,
  IconList,
  IconEye,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { ConfirmModal } from "../../components/AdminTable";
import { useToast } from "../../components/Toast";
import { permissionApi, roleApi } from "../../api/endpoints/rbac";
import type { PermissionResponse, RoleResponse } from "../../api/types";

// =========================
// AdminRoles — quản lý vai trò (role) và gán quyền cho vai trò
// Nguồn dữ liệu:
//   GET/POST/PUT/DELETE /api/roles            (role-service → user-service)
//   GET/POST/DELETE    /api/permissions       (user-service)
//   POST               /api/roles/{id}/permissions  (gán quyền)
//   DELETE             /api/roles/{id}/permissions/{permissionId}  (gỡ quyền)
// Cần authority: ROLE_READ / ROLE_WRITE / PERMISSION_READ
// =========================

interface RoleFormState {
  id: string | null;
  name: string;
  displayName: string;
  description: string;
}

const EMPTY_FORM: RoleFormState = {
  id: null,
  name: "",
  displayName: "",
  description: "",
};

export default function AdminRoles() {
  const t = useToast();
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<RoleFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Chi tiết vai trò — nạp qua GET /api/roles/{id}. */
  const [detail, setDetail] = useState<RoleResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /** Role đang mở bảng gán quyền. */
  const [permTarget, setPermTarget] = useState<RoleResponse | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [permSaving, setPermSaving] = useState(false);
  const [permError, setPermError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Hai danh sách độc lập → gọi song song.
      const [roleRes, permRes] = await Promise.all([
        roleApi.listRoles({ size: 200 }),
        permissionApi.listPermissions({ size: 200 }),
      ]);
      setRoles(roleRes.items ?? []);
      setPermissions(permRes.items ?? []);
    } catch (err) {
      setRoles([]);
      setPermissions([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách vai trò từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.displayName ?? "").toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [roles, search]);

  const stats = useMemo(
    () => ({
      total: roles.length,
      permissions: permissions.length,
      assigned: roles.reduce((sum, r) => sum + (r.permissions?.length ?? 0), 0),
      unassigned: roles.filter((r) => (r.permissions?.length ?? 0) === 0).length,
    }),
    [roles, permissions],
  );

  // ── Form tạo / sửa role ────────────────────────────────────────────────
  const openCreate = () => {
    setFormError(null);
    setForm({ ...EMPTY_FORM });
  };

  const openEdit = (r: RoleResponse) => {
    setFormError(null);
    setForm({
      id: r.id,
      name: r.name,
      displayName: r.displayName ?? "",
      description: r.description ?? "",
    });
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;

    const name = form.name.trim().toUpperCase();
    if (!name) {
      setFormError("Tên vai trò không được để trống.");
      return;
    }
    // Backend tự thêm prefix "ROLE_" → client chỉ gửi raw name.
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
      setFormError(
        "Tên vai trò phải là UPPER_SNAKE_CASE (ví dụ: MANAGER, SERVICE_ADVISOR).",
      );
      return;
    }

    const payload = {
      name,
      displayName: form.displayName.trim() || null,
      description: form.description.trim() || null,
    };

    setSaving(true);
    try {
      const saved = form.id
        ? await roleApi.updateRole(form.id, payload)
        : await roleApi.createRole(payload);
      setRoles((prev) =>
        form.id
          ? prev.map((r) => (r.id === saved.id ? saved : r))
          : [...prev, saved],
      );
      t.success(
        form.id
          ? `Đã cập nhật vai trò "${saved.name}".`
          : `Đã tạo vai trò "${saved.name}".`,
      );
      setForm(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Không lưu được vai trò.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await roleApi.deleteRole(deleteTarget.id);
      setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      t.success(`Đã xoá vai trò "${deleteTarget.name}".`);
      setDeleteTarget(null);
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không xoá được vai trò.",
      );
    } finally {
      setDeleting(false);
    }
  };

  // ── Gán quyền cho role ──────────────────────────────────────────────────
  const openPermEditor = async (r: RoleResponse) => {
    setPermError(null);
    setPermTarget(r);
    setSelectedPerms((r.permissions ?? []).map((p) => p.id));
    // Nạp lại chi tiết role để có tập permission mới nhất (tránh cache cũ).
    try {
      const fresh = await roleApi.getRole(r.id);
      setPermTarget(fresh);
      setSelectedPerms((fresh.permissions ?? []).map((p) => p.id));
    } catch {
      // Không nạp được thì dùng luôn dữ liệu đang có.
    }
  };

  /** Modal xem chi tiết role — nạp qua GET /api/roles/{id}. */
  const openDetail = async (r: RoleResponse) => {
    setDetail(r);
    setDetailLoading(true);
    try {
      const fresh = await roleApi.getRole(r.id);
      setDetail(fresh);
      setRoles((prev) => prev.map((x) => (x.id === fresh.id ? fresh : x)));
    } catch {
      // Giữ bản cache trong list nếu API lỗi.
    } finally {
      setDetailLoading(false);
    }
  };

  const togglePerm = (id: string) => {
    setSelectedPerms((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const savePerms = async () => {
    if (!permTarget || permSaving) return;
    setPermSaving(true);
    setPermError(null);
    try {
      // Endpoint này thay thế TOÀN BỘ tập quyền của role.
      const saved = await roleApi.assignPermissions(permTarget.id, selectedPerms);
      setRoles((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      setPermTarget(null);
      t.success(
        `Đã cập nhật ${selectedPerms.length} quyền cho vai trò "${saved.name}".`,
      );
    } catch (err) {
      setPermError(
        err instanceof Error ? err.message : "Không lưu được danh sách quyền.",
      );
    } finally {
      setPermSaving(false);
    }
  };

  const removeOnePerm = async (
    role: RoleResponse,
    permissionId: string,
  ) => {
    try {
      const saved = await roleApi.removePermission(role.id, permissionId);
      setRoles((prev) => prev.map((r) => (r.id === saved.id ? saved : r)));
      setPermTarget((cur) => (cur && cur.id === saved.id ? saved : cur));
      // Đồng bộ ngay trạng thái chọn để checkbox trong danh sách bỏ tick.
      const remaining = (saved.permissions ?? []).map((p) => p.id);
      setSelectedPerms(remaining);
      t.success("Đã gỡ quyền khỏi vai trò.");
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không gỡ được quyền.",
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconUsers size={20} />
            </span>
            Quản lý vai trò
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {stats.total} vai trò · {stats.permissions} quyền trong hệ thống
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh
              size={14}
              className={loading ? "animate-spin" : undefined}
            />
            Tải lại
          </Button>
          <Button size="sm" onClick={openCreate}>
            <IconPlus size={14} />
            Thêm vai trò
          </Button>
        </div>
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

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Vai trò" value={stats.total} color="bg-primary" />
        <StatCard
          label="Quyền trong hệ thống"
          value={stats.permissions}
          color="bg-emerald-500"
        />
        <StatCard
          label="Lượt gán quyền"
          value={stats.assigned}
          color="bg-amber-500"
        />
        <StatCard
          label="Vai trò chưa có quyền"
          value={stats.unassigned}
          color="bg-red-500"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 max-w-md flex items-center gap-2 h-11 px-3 rounded-xl border border-ink/15 bg-white focus-within:border-primary">
          <IconSearch size={16} className="text-ink-muted" />
          <input
            type="text"
            placeholder="Tìm vai trò..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Đang tải danh sách vai trò...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Không có vai trò nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/30">
                  <th className="font-medium px-4 py-3">Vai trò</th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">
                    Mô tả
                  </th>
                  <th className="font-medium px-4 py-3 text-center">Quyền</th>
                  <th className="font-medium px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold font-mono text-[13px]">
                        {r.name}
                      </div>
                      {r.displayName && (
                        <div className="text-xs text-ink-muted line-clamp-1">
                          {r.displayName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-ink-muted">
                      <div className="line-clamp-2">{r.description ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        tone={
                          (r.permissions?.length ?? 0) > 0 ? "primary" : "default"
                        }
                      >
                        {r.permissions?.length ?? 0} quyền
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          title="Xem chi tiết"
                          onClick={() => void openDetail(r)}
                        >
                          <IconEye size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Gán quyền"
                          onClick={() => void openPermEditor(r)}
                        >
                          <IconList size={12} />
                          <span className="hidden sm:inline">Quyền</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Sửa vai trò"
                          onClick={() => openEdit(r)}
                        >
                          <IconEdit size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-200 hover:bg-red-50"
                          title="Xoá vai trò"
                          onClick={() => setDeleteTarget(r)}
                        >
                          <IconTrash size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3 border-t border-ink/8 text-xs text-ink-muted">
          Hiển thị <strong className="text-ink">{filtered.length}</strong> /{" "}
          {roles.length} vai trò
        </div>
      </div>

      <p className="text-xs text-ink-muted flex items-center gap-1">
        <IconWarning size={12} />
        Tên vai trò gửi lên không có tiền tố{" "}
        <code className="bg-bgsoft px-1 py-0.5 rounded">ROLE_</code> — backend tự
        thêm khi dựng authority.
      </p>

      {/* Form modal — tạo / sửa role */}
      {form && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => !saving && setForm(null)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={submitForm}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-ink/8 sticky top-0 bg-white">
              <h3 className="font-bold text-base">
                {form.id ? "✏️ Sửa vai trò" : "➕ Thêm vai trò"}
              </h3>
              <button
                type="button"
                onClick={() => setForm(null)}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
                aria-label="Đóng"
              >
                <IconClose size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <Input
                label="Tên vai trò"
                required
                placeholder="SERVICE_ADVISOR"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value.toUpperCase() })
                }
                hint="UPPER_SNAKE_CASE, không có tiền tố ROLE_. Tối đa 50 ký tự."
              />
              <Input
                label="Tên hiển thị"
                placeholder="Tư vấn viên"
                value={form.displayName}
                onChange={(e) =>
                  setForm({ ...form, displayName: e.target.value })
                }
              />
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Mô tả
                </label>
                <textarea
                  value={form.description}
                  rows={3}
                  maxLength={255}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  placeholder="Mô tả vai trò (tuỳ chọn)..."
                  className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                />
              </div>
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {formError}
                </div>
              )}
            </div>
            <div className="p-5 border-t border-ink/8 flex gap-2 justify-end sticky bottom-0 bg-white">
              <Button
                variant="outline"
                type="button"
                onClick={() => setForm(null)}
                disabled={saving}
              >
                Huỷ
              </Button>
              <Button type="submit" disabled={saving}>
                <IconCheck size={14} />
                {saving ? "Đang lưu..." : form.id ? "Cập nhật" : "Thêm"}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Modal gán quyền cho role */}
      {permTarget && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => !permSaving && setPermTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col"
          >
            <div className="flex items-center justify-between p-5 border-b border-ink/8 sticky top-0 bg-white">
              <div>
                <h3 className="font-bold text-base">
                  Gán quyền cho{" "}
                  <span className="font-mono">{permTarget.name}</span>
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Đã chọn {selectedPerms.length} / {permissions.length} quyền
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPermTarget(null)}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
                aria-label="Đóng"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {/* Quick actions */}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setSelectedPerms(permissions.map((p) => p.id))
                  }
                >
                  Chọn tất cả
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPerms([])}
                >
                  Bỏ chọn tất cả
                </Button>
              </div>

              {/* Quyền đang gán */}
                {selectedPerms.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                    Đang gán — bấm để gỡ ngay
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedPerms.map((id) => {
                      const p = permissions.find((x) => x.id === id);
                      if (!p) return null;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => void removeOnePerm(permTarget, id)}
                          title="Gỡ quyền này khỏi vai trò"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          {p.name}
                          <IconClose size={11} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Danh sách quyền */}
              <div>
                <div className="text-xs font-bold text-ink-muted uppercase tracking-wider mb-2">
                  Danh sách quyền
                </div>
                {permissions.length === 0 ? (
                  <p className="text-sm text-ink-muted">
                    Không có quyền nào trong hệ thống.
                  </p>
                ) : (
                  <div className="border border-ink/8 rounded-xl divide-y divide-ink/5 max-h-[45vh] overflow-y-auto">
                    {permissions.map((p) => {
                      const checked = selectedPerms.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          className="flex items-start gap-3 px-3 py-2.5 hover:bg-bgsoft/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => togglePerm(p.id)}
                            className="mt-0.5 accent-primary w-4 h-4 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="font-mono text-[13px] font-semibold">
                              {p.name}
                            </div>
                            {p.displayName && (
                              <div className="text-xs text-ink-muted line-clamp-1">
                                {p.displayName}
                              </div>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              {permError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {permError}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-ink/8 flex gap-2 justify-end sticky bottom-0 bg-white">
              <Button
                variant="outline"
                type="button"
                onClick={() => setPermTarget(null)}
                disabled={permSaving}
              >
                Huỷ
              </Button>
              <Button type="button" onClick={() => void savePerms()} disabled={permSaving}>
                <IconCheck size={14} />
                {permSaving ? "Đang lưu..." : "Lưu quyền"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi tiết vai trò */}
      {detail && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-bold text-lg font-mono">{detail.name}</h3>
                {detail.displayName && (
                  <p className="text-sm text-ink-muted mt-0.5">
                    {detail.displayName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
                aria-label="Đóng"
              >
                <IconClose size={18} />
              </button>
            </div>

            {detailLoading && (
              <p className="text-xs text-ink-muted mb-3">Đang tải chi tiết...</p>
            )}

            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-ink-muted uppercase tracking-wider">
                  Mã định danh
                </dt>
                <dd className="font-mono text-xs text-ink break-all mt-0.5">
                  {detail.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted uppercase tracking-wider">
                  Mô tả
                </dt>
                <dd className="text-ink mt-0.5">{detail.description ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted uppercase tracking-wider">
                  Quyền được gán ({detail.permissions?.length ?? 0})
                </dt>
                <dd className="mt-1.5">
                  {(detail.permissions ?? []).length === 0 ? (
                    <span className="text-ink-muted text-sm">
                      Vai trò này chưa có quyền nào.
                    </span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(detail.permissions ?? []).map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDetail(null)}>
                Đóng
              </Button>
              <Button
                onClick={() => {
                  setDetail(null);
                  void openPermEditor(detail);
                }}
              >
                <IconList size={14} />
                Gán quyền
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Xoá vai trò?"
          description={
            <>
              Vai trò{" "}
              <strong className="font-mono">{deleteTarget.name}</strong> sẽ bị
              xoá (xoá mềm). Mọi tài khoản đang dùng vai trò này sẽ mất các
              quyền kèm theo.
            </>
          }
          confirmLabel="Xoá"
          confirmTone="danger"
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
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
