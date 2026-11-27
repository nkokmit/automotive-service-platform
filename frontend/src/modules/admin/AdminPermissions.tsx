import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconShield,
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconCheck,
  IconClose,
  IconWarning,
  IconEye,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { ConfirmModal } from "../../components/AdminTable";
import { useToast } from "../../components/Toast";
import { permissionApi } from "../../api/endpoints/rbac";
import type { PermissionResponse } from "../../api/types";

// =========================
// AdminPermissions — quản lý quyền (permission) của hệ thống
// Nguồn dữ liệu: GET/POST/PUT/DELETE /api/permissions (user-service)
// Cần authority: PERMISSION_READ (xem) / PERMISSION_WRITE (ghi)
// =========================

/** Nhóm quyền suy ra từ tiền tố tên — giúp admin dễ quét danh sách. */
function domainOf(name: string): string {
  const idx = name.indexOf("_");
  return idx > 0 ? name.slice(0, idx) : "KHÁC";
}

const DOMAIN_TONE: Record<string, "default" | "primary" | "accent" | "warning"> = {
  USER: "primary",
  ROLE: "primary",
  PERMISSION: "warning",
  SERVICE: "accent",
  PART: "accent",
  STOCK: "accent",
  CUSTOMER: "default",
  VEHICLE: "default",
  BOOKING: "accent",
  WORK_ORDER: "accent",
  INVOICE: "accent",
  PAYMENT: "accent",
  NOTIFICATION: "accent",
  STAFF: "default",
  SCHEDULE: "default",
  INVENTORY: "accent",
  GARAGE: "default",
  REPORT: "default",
  AUDIT: "default",
};

interface PermissionFormState {
  id: string | null;
  name: string;
  displayName: string;
  description: string;
}

const EMPTY_FORM: PermissionFormState = {
  id: null,
  name: "",
  displayName: "",
  description: "",
};

export default function AdminPermissions() {
  const t = useToast();
  const [permissions, setPermissions] = useState<PermissionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeDomain, setActiveDomain] = useState("all");
  const [form, setForm] = useState<PermissionFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PermissionResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  /** Chi tiết quyền — nạp qua GET /api/permissions/{id}. */
  const [detail, setDetail] = useState<PermissionResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await permissionApi.listPermissions({ size: 200 });
      setPermissions(page.items ?? []);
    } catch (err) {
      setPermissions([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách quyền từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Các nhóm quyền có trong danh sách (dùng cho filter chips). */
  const domains = useMemo(() => {
    const set = new Set<string>();
    for (const p of permissions) set.add(domainOf(p.name));
    return Array.from(set).sort();
  }, [permissions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return permissions.filter((p) => {
      if (activeDomain !== "all" && domainOf(p.name) !== activeDomain) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.displayName ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    });
  }, [permissions, search, activeDomain]);

  const stats = useMemo(
    () => ({
      total: permissions.length,
      domains: domains.length,
      read: permissions.filter((p) => p.name.endsWith("_READ")).length,
      write: permissions.filter((p) => p.name.endsWith("_WRITE")).length,
    }),
    [permissions, domains],
  );

  const openCreate = () => {
    setFormError(null);
    setForm({ ...EMPTY_FORM });
  };

  /** Mở modal chi tiết — gọi GET /api/permissions/{id} để lấy dữ liệu mới nhất. */
  const openDetail = async (p: PermissionResponse) => {
    setDetailLoading(true);
    setDetail(p);
    try {
      const fresh = await permissionApi.getPermission(p.id);
      setDetail(fresh);
    } catch {
      // Giữ bản cache trong list nếu API lỗi.
    } finally {
      setDetailLoading(false);
    }
  };

  const openEdit = (p: PermissionResponse) => {
    setFormError(null);
    setForm({
      id: p.id,
      name: p.name,
      displayName: p.displayName ?? "",
      description: p.description ?? "",
    });
  };

  const submitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;

    const name = form.name.trim().toUpperCase();
    if (!name) {
      setFormError("Tên quyền không được để trống.");
      return;
    }
    // Backend dùng đúng chuỗi này làm authority → phải là UPPER_SNAKE_CASE.
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) {
      setFormError(
        "Tên quyền phải là UPPER_SNAKE_CASE (ví dụ: PART_WRITE, BOOKING_READ).",
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
        ? await permissionApi.updatePermission(form.id, payload)
        : await permissionApi.createPermission(payload);
      setPermissions((prev) =>
        form.id
          ? prev.map((p) => (p.id === saved.id ? saved : p))
          : [...prev, saved],
      );
      t.success(
        form.id
          ? `Đã cập nhật quyền "${saved.name}".`
          : `Đã tạo quyền "${saved.name}".`,
      );
      setForm(null);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Không lưu được quyền.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    try {
      await permissionApi.deletePermission(deleteTarget.id);
      setPermissions((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      t.success(`Đã xoá quyền "${deleteTarget.name}".`);
      setDeleteTarget(null);
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không xoá được quyền.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconShield size={20} />
            </span>
            Quản lý quyền
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {stats.total} quyền · {stats.domains} nhóm
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
            Thêm quyền
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
        <StatCard label="Tổng quyền" value={stats.total} color="bg-primary" />
        <StatCard label="Nhóm quyền" value={stats.domains} color="bg-emerald-500" />
        <StatCard label="Quyền đọc" value={stats.read} color="bg-amber-500" />
        <StatCard label="Quyền ghi" value={stats.write} color="bg-red-500" />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-2">
        <div className="flex-1 max-w-md flex items-center gap-2 h-11 px-3 rounded-xl border border-ink/15 bg-white focus-within:border-primary">
          <IconSearch size={16} className="text-ink-muted" />
          <input
            type="text"
            placeholder="Tìm tên quyền, mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <DomainChip
            active={activeDomain === "all"}
            onClick={() => setActiveDomain("all")}
            label="Tất cả"
          />
          {domains.map((d) => (
            <DomainChip
              key={d}
              active={activeDomain === d}
              onClick={() => setActiveDomain(d)}
              label={d}
            />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-ink/8 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Đang tải danh sách quyền...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Không có quyền nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/30">
                  <th className="font-medium px-4 py-3">Quyền</th>
                  <th className="font-medium px-4 py-3 hidden md:table-cell">
                    Nhóm
                  </th>
                  <th className="font-medium px-4 py-3 hidden lg:table-cell">
                    Mô tả
                  </th>
                  <th className="font-medium px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold font-mono text-[13px] text-ink">
                        {p.name}
                      </div>
                      {p.displayName && (
                        <div className="text-xs text-ink-muted line-clamp-1">
                          {p.displayName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge tone={DOMAIN_TONE[domainOf(p.name)] ?? "default"}>
                        {domainOf(p.name)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-ink-muted">
                      <div className="line-clamp-2">
                        {p.description ?? "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          title="Xem chi tiết"
                          onClick={() => void openDetail(p)}
                        >
                          <IconEye size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          title="Sửa quyền"
                          onClick={() => openEdit(p)}
                        >
                          <IconEdit size={12} />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 border-red-200 hover:bg-red-50"
                          title="Xoá quyền"
                          onClick={() => setDeleteTarget(p)}
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
          {permissions.length} quyền
        </div>
      </div>

      <p className="text-xs text-ink-muted flex items-center gap-1">
        <IconWarning size={12} />
        Tên quyền chính là authority mà backend kiểm tra (VD:{" "}
        <code className="bg-bgsoft px-1 py-0.5 rounded">PERMISSION_WRITE</code>).
        Xoá quyền sẽ làm mất quyền của mọi role đang dùng nó.
      </p>

      {/* Form modal */}
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
                {form.id ? "✏️ Sửa quyền" : "➕ Thêm quyền"}
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
                label="Tên quyền (authority)"
                required
                placeholder="PART_WRITE"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value.toUpperCase() })
                }
                hint="UPPER_SNAKE_CASE, không có tiền tố PERMISSION_. Tối đa 50 ký tự."
              />
              <Input
                label="Tên hiển thị"
                placeholder="Ghi phụ tùng"
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
                  placeholder="Mô tả quyền (tuỳ chọn)..."
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

      {/* Modal chi tiết quyền */}
      {detail && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setDetail(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md p-6"
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
                  Nhóm quyền
                </dt>
                <dd className="mt-1">
                  <Badge tone={DOMAIN_TONE[domainOf(detail.name)] ?? "default"}>
                    {domainOf(detail.name)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted uppercase tracking-wider">
                  Mô tả
                </dt>
                <dd className="text-ink mt-0.5">
                  {detail.description ?? "—"}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDetail(null)}>
                Đóng
              </Button>
              <Button
                onClick={() => {
                  openEdit(detail);
                  setDetail(null);
                }}
              >
                <IconEdit size={14} />
                Sửa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          title="Xoá quyền?"
          description={
            <>
              Quyền{" "}
              <strong className="font-mono">{deleteTarget.name}</strong> sẽ bị
              xoá (xoá mềm) và mọi role đang dùng quyền này sẽ mất nó.
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

function DomainChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors",
        active
          ? "bg-primary text-white"
          : "bg-white border border-ink/10 text-ink-muted hover:border-primary/40",
      ].join(" ")}
    >
      {label}
    </button>
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
