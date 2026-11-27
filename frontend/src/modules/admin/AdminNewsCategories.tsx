/**
 * AdminNewsCategories — quản lý danh mục bài viết tin tức.
 *
 * Nguồn dữ liệu (news-service):
 *  - GET    /api/news-categories         → danh sách danh mục
 *  - POST   /api/news-categories         → tạo danh mục
 *  - PUT    /api/news-categories/{id}    → sửa danh mục
 *  - DELETE /api/news-categories/{id}    → xoá danh mục
 *
 * Cần authority: NEWS_CATEGORY_READ (xem) / NEWS_CATEGORY_WRITE (ghi).
 *
 * Lưu ý: backend xoá cứng và không xoá được nếu danh mục còn bài viết — API
 * trả 400 kèm message tiếng Việt, hiển thị nguyên message cho người dùng.
 */
import { useCallback, useEffect, useState } from "react";
import {
  IconList,
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
import { newsApi } from "../../api/endpoints/news";
import { hasTokenAuthority } from "../../api/session";
import type { NewsCategoryResponse } from "../../api/types";

// =========================
// AdminNewsCategories
// =========================

export default function AdminNewsCategories() {
  const t = useToast();
  const [items, setItems] = useState<NewsCategoryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Danh mục đang sửa (null = đang tạo mới). */
  const [editing, setEditing] = useState<NewsCategoryResponse | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canWrite = hasTokenAuthority("NEWS_CATEGORY_WRITE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await newsApi.listCategories({ size: 100 });
      setItems(res.items ?? []);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách danh mục bài viết từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, []);

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

  const openEdit = useCallback((c: NewsCategoryResponse) => {
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
      setFormError("Mã danh mục không được để trống.");
      return;
    }
    if (!trimmedName) {
      setFormError("Tên danh mục không được để trống.");
      return;
    }

    const payload = {
      code: trimmedCode,
      name: trimmedName,
      description: description.trim() || null,
    };

    setSaving(true);
    try {
      const saved = editing
        ? await newsApi.updateCategory(editing.id, payload)
        : await newsApi.createCategory(payload);

      setItems((prev) =>
        editing
          ? prev.map((c) => (c.id === saved.id ? saved : c))
          : [...prev, saved],
      );
      setEditorOpen(false);
      setEditing(null);
      t.success(
        editing ? "Đã cập nhật danh mục bài viết" : "Đã tạo danh mục bài viết",
      );
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Không lưu được danh mục bài viết",
      );
    } finally {
      setSaving(false);
    }
  }, [code, name, description, editing, t]);

  const handleDelete = useCallback(
    async (c: NewsCategoryResponse) => {
      try {
        await newsApi.deleteCategory(c.id);
        setItems((prev) => prev.filter((x) => x.id !== c.id));
        t.success(`Đã xoá danh mục "${c.name}"`);
      } catch (err) {
        t.error(
          err instanceof Error
            ? err.message
            : `Không xoá được danh mục "${c.name}"`,
        );
      }
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

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconList size={20} />
            </span>
            Danh mục bài viết
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading
              ? "Đang tải..."
              : `${items.length} danh mục bài viết trong hệ thống`}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate}>
            <IconPlus size={16} />
            Thêm danh mục
          </Button>
        )}
      </div>

      <Card hover={false}>
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            {loading ? "Đang tải..." : "Chưa có danh mục bài viết nào."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  <th className="font-medium px-4 py-3">Mã</th>
                  <th className="font-medium px-4 py-3">Tên danh mục</th>
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

      {/* Modal tạo / sửa danh mục */}
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
                {editing ? "Sửa danh mục bài viết" : "Thêm danh mục bài viết"}
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
                  Mã danh mục <span className="text-red-500">*</span>
                </label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="VD: MAINTENANCE"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink mb-1.5 block">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Bảo dưỡng & sửa chữa"
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
                  placeholder="Mô tả danh mục (tuỳ chọn)"
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
