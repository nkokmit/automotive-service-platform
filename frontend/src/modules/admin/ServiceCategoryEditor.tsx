/**
 * ServiceCategoryEditor — modal tạo / sửa NHÓM DỊCH VỤ.
 *
 * Tách riêng khỏi `ServiceCategoryManager` để dùng lại được ở 2 nơi:
 *  - Panel quản lý nhóm trong màn `/admin/services`.
 *  - Nút "＋ Thêm nhóm" cạnh dropdown "Danh mục" ngay trong form thêm/sửa
 *    dịch vụ (tiện khi admin đang thêm dịch vụ mà chưa có nhóm phù hợp).
 *
 * API: POST/PUT /api/service-categories (inventory-service), cần `SERVICE_WRITE`.
 */
import { useCallback, useState } from "react";
import { IconCheck, IconClose } from "../../components/icons";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { inventoryApi } from "../../api/endpoints/inventory";
import type { CategoryResponse } from "../../api/types";

export interface ServiceCategoryEditorProps {
  /** Nhóm đang sửa. `null` = đang tạo mới. */
  editing: CategoryResponse | null;
  /** Đóng modal. */
  onClose: () => void;
  /** Gọi khi lưu thành công với bản ghi nhóm vừa tạo/sửa. */
  onSaved: (category: CategoryResponse) => void;
}

export default function ServiceCategoryEditor({
  editing,
  onClose,
  onSaved,
}: ServiceCategoryEditorProps) {
  const [code, setCode] = useState(editing?.code ?? "");
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
      const saved = editing
        ? await inventoryApi.updateServiceCategory(editing.id, payload)
        : await inventoryApi.createServiceCategory(payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Không lưu được nhóm dịch vụ",
      );
    } finally {
      setSaving(false);
    }
  }, [code, name, description, editing, onSaved, onClose]);

  return (
    <div
      className="fixed inset-0 z-[60] bg-ink/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-5 border-b border-ink/8">
          <h3 className="font-bold text-base">
            {editing ? "Sửa nhóm dịch vụ" : "Thêm nhóm dịch vụ"}
          </h3>
          <button
            type="button"
            onClick={onClose}
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
              placeholder="VD: SUACHUA"
            />
            <span className="text-xs text-ink-muted mt-1 block">
              Mã duy nhất, không dấu cách. VD: SUACHUA, LOPPHANH.
            </span>
          </div>
          <div>
            <label className="text-sm font-medium text-ink mb-1.5 block">
              Tên nhóm <span className="text-red-500">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Sửa chữa"
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
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Huỷ
          </Button>
          <Button onClick={() => void handleSave()} disabled={saving}>
            <IconCheck size={14} />
            {saving ? "Đang lưu..." : editing ? "Cập nhật" : "Thêm"}
          </Button>
        </div>
      </div>
    </div>
  );
}
