/**
 * AdminCategories — quản lý nhóm dịch vụ & nhóm phụ tùng.
 *
 * Nguồn dữ liệu (inventory-service):
 *  - GET    /api/service-categories         → nhóm dịch vụ
 *  - POST   /api/service-categories         → tạo nhóm dịch vụ
 *  - PUT    /api/service-categories/{id}    → sửa nhóm dịch vụ
 *  - DELETE /api/service-categories/{id}    → xoá nhóm dịch vụ
 *  - GET    /api/part-categories            → nhóm phụ tùng
 *  - POST   /api/part-categories            → tạo nhóm phụ tùng
 *  - PUT    /api/part-categories/{id}       → sửa nhóm phụ tùng
 *  - DELETE /api/part-categories/{id}       → xoá nhóm phụ tùng
 *
 * Cần authority: SERVICE_READ/SERVICE_WRITE và PART_READ/PART_WRITE.
 *
 * Lưu ý: backend xoá cứng (không soft-delete) và không xoá được nếu nhóm đang
 * có dịch vụ / phụ tùng — API trả 400 kèm message tiếng Việt, hiển thị nguyên
 * message cho người dùng.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  IconPackage,
  IconWrench,
  IconPlus,
  IconTrash,
  IconEdit,
  IconRefresh,
  IconCheck,
  IconClose,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import { inventoryApi } from "../../api/endpoints/inventory";
import { hasTokenAuthority } from "../../api/session";
import type { CategoryResponse } from "../../api/types";

// =========================
// AdminCategories
// =========================

type TabKey = "service" | "part";

export default function AdminCategories() {
  const t = useToast();
  const [tab, setTab] = useState<TabKey>("part");
  const [items, setItems] = useState<CategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Nhóm đang sửa (null = đang tạo mới). */
  const [editing, setEditing] = useState<CategoryResponse | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canWriteService = hasTokenAuthority("SERVICE_WRITE");
  const canWritePart = hasTokenAuthority("PART_WRITE");
  const canWrite = tab === "service" ? canWriteService : canWritePart;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res =
        tab === "service"
          ? await inventoryApi.listServiceCategories({ size: 100 })
          : await inventoryApi.listPartCategories({ size: 100 });
      setItems(res.items ?? []);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách nhóm từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setCode("");
    setName("");
    setDescription("");
    setFormError(null);
    setEditorOpen(true);
  }, []);

  const openEdit = useCallback((c: CategoryResponse) => {
    setEditing(c);
    setCode(c.code);
    setName(c.name);
    setDescription(c.description ?? "");
    setFormError(null);
    setEditorOpen(true);
  }, []);

  /** Đóng modal tạo/sửa và huỷ mọi thay đổi chưa lưu. */
  const closeEditor = useCallback(() => {
    setEditorOpen(false);
    setEditing(null);
    setFormError(null);
  }, []);

  const handleSave = useCallback(async () => {
    setFormError(null);
    const trimmedCode = code.trim();
    const trimmedName = name.trim();
    if (!trimmedCode) {
      setFormError("Mã nhóm không được để trống.");
      return;
    }
    if (!trimmedName) {
      setFormError("Tên nhóm không được để trống.");
      return;
    }

    const payload = {
      code: trimmedCode,
      name: trimmedName,
      description: description.trim() || null,
    };

    setSaving(true);
    try {
      const saved =
        tab === "service"
          ? editing
            ? await inventoryApi.updateServiceCategory(editing.id, payload)
            : await inventoryApi.createServiceCategory(payload)
          : editing
            ? await inventoryApi.updatePartCategory(editing.id, payload)
            : await inventoryApi.createPartCategory(payload);

      setItems((prev) =>
        editing
          ? prev.map((c) => (c.id === saved.id ? saved : c))
          : [...prev, saved],
      );
      setEditorOpen(false);
      setEditing(null);
      t.success(editing ? "Đã cập nhật nhóm" : "Đã tạo nhóm mới");    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Không lưu được nhóm",
      );
    } finally {
      setSaving(false);
    }
  }, [code, name, description, tab, editing, t]);

  const handleDelete = useCallback(
    async (c: CategoryResponse) => {
      try {
        if (tab === "service") {
          await inventoryApi.deleteServiceCategory(c.id);
        } else {
          await inventoryApi.deletePartCategory(c.id);
        }
        setItems((prev) => prev.filter((x) => x.id !== c.id));
        t.success(`Đã xoá nhóm "${c.name}"`);
      } catch (err) {
        t.error(
          err instanceof Error
            ? err.message
            : `Không xoá được nhóm "${c.name}"`,
        );
      }
    },
    [tab, t],
  );

  const tabs = useMemo(
    () => [
      {
        key: "part" as TabKey,
        label: "Nhóm phụ tùng",
        icon: IconPackage,
        write: canWritePart,
      },
      {
        key: "service" as TabKey,
        label: "Nhóm dịch vụ",
        icon: IconWrench,
        write: canWriteService,
      },
    ],
    [canWritePart, canWriteService],
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

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconPackage size={20} />
            </span>
            Nhóm danh mục
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading ? "Đang tải..." : `${items.length} nhóm trong hệ thống`}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <IconPlus size={16} />
            Thêm nhóm
          </Button>
        )}
      </div>

      {/* Tabs loại nhóm */}
      <Card hover={false}>
        <div className="p-2 flex items-center gap-1.5">
          {tabs.map((x) => (
            <button
              key={x.key}
              onClick={() => setTab(x.key)}
              className={[
                "inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
                tab === x.key
                  ? "bg-primary text-white"
                  : "text-ink-muted hover:bg-bgsoft",
              ].join(" ")}
            >
              <x.icon size={14} />
              {x.label}
            </button>
          ))}
        </div>
      </Card>

      <Card hover={false}>
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            {loading ? "Đang tải..." : "Chưa có nhóm nào."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  <th className="font-medium px-4 py-3">Mã</th>
                  <th className="font-medium px-4 py-3">Tên nhóm</th>
                  <th className="font-medium px-4 py-3">Mô tả</th>
                  <th className="font-medium px-4 py-3">Ngày tạo</th>
                  {canWrite && (
                    <th className="font-medium px-4 py-3 text-right">Hành động</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Badge tone="default">{c.code}</Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-xs text-ink-muted max-w-[320px]">
                      <span className="line-clamp-2">{c.description || "—"}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                            title="Sửa"
                          >
                            <IconEdit size={15} />
                          </button>
                          <button
                            onClick={() => void handleDelete(c)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-ink-muted hover:text-red-500"
                            title="Xoá"
                          >
                            <IconTrash size={15} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal tạo / sửa nhóm */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={closeEditor}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg"
          >
            <div className="flex items-center justify-between p-5 border-b border-ink/8">
              <h3 className="font-bold text-base">
                {editing ? "Sửa nhóm" : "Thêm nhóm mới"}
              </h3>
              <button
                type="button"
                onClick={closeEditor}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="p-5 space-y-3">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Mã nhóm <span className="text-red-500">*</span>
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="VD: SPARE"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Tên nhóm <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Phụ tùng chung"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Mô tả
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Mô tả nhóm (tuỳ chọn)"
                  className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="p-5 border-t border-ink/8 flex gap-2 justify-end">
              <Button variant="outline" onClick={closeEditor} disabled={saving}>
                Huỷ
              </Button>
              <Button onClick={() => void handleSave()} disabled={saving}>
                <IconCheck size={14} />
                {saving ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
