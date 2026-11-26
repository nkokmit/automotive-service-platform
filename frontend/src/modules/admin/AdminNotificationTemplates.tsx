import { useCallback, useEffect, useState } from "react";
import {
  IconBell,
  IconEdit,
  IconRefresh,
  IconCheck,
  IconClose,
  IconMail,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { useToast } from "../../components/Toast";
import { notificationApi } from "../../api/endpoints/notification";
import { hasTokenAuthority } from "../../api/session";
import type {
  NotificationChannel,
  NotificationTemplateResponse,
} from "../../api/types";

const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  IN_APP: "Trong ứng dụng",
  EMAIL: "Email",
  SMS: "SMS",
  ZNS: "Zalo ZNS",
};

type BadgeTone = "default" | "primary" | "accent" | "warning";

const CHANNEL_TONE: Record<NotificationChannel, BadgeTone> = {
  IN_APP: "primary",
  EMAIL: "accent",
  SMS: "warning",
  ZNS: "default",
};

export default function AdminNotificationTemplates() {
  const t = useToast();
  const [items, setItems] = useState<NotificationTemplateResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState<NotificationTemplateResponse | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canWrite = hasTokenAuthority("NOTIFICATION_TEMPLATE_WRITE");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await notificationApi.listTemplates({ size: 100 });
      setItems(res.content ?? []);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách template thông báo",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = useCallback((tpl: NotificationTemplateResponse) => {
    setEditing(tpl);
    setSubject(tpl.subjectTemplate ?? "");
    setBody(tpl.bodyTemplate ?? "");
    setIsActive(tpl.isActive);
    setFormError(null);
  }, []);

  const closeEditor = useCallback(() => {
    setEditing(null);
    setFormError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    setFormError(null);
    if (!body.trim()) {
      setFormError("Nội dung template không được để trống.");
      return;
    }
    setSaving(true);
    try {
      const saved = await notificationApi.updateTemplate(editing.id, {
        subjectTemplate: subject.trim() || null,
        bodyTemplate: body.trim(),
        isActive,
      });
      setItems((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
      closeEditor();
      t.success("Đã cập nhật template thông báo");
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Không lưu được template",
      );
    } finally {
      setSaving(false);
    }
  }, [editing, subject, body, isActive, closeEditor, t]);

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
              <IconBell size={20} />
            </span>
            Template thông báo
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading
              ? "Đang tải..."
              : `${items.length} template trong hệ thống`}
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <IconRefresh size={16} />
          Làm mới
        </Button>
      </div>

      <Card hover={false}>
        {items.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            {loading ? "Đang tải..." : "Chưa có template thông báo nào."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  <th className="font-medium px-4 py-3">Mã</th>
                  <th className="font-medium px-4 py-3">Kênh</th>
                  <th className="font-medium px-4 py-3">Tiêu đề</th>
                  <th className="font-medium px-4 py-3">Nội dung</th>
                  <th className="font-medium px-4 py-3">Trạng thái</th>
                  {canWrite && (
                    <th className="font-medium px-4 py-3 text-right">Hành động</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((tpl) => (
                  <tr
                    key={tpl.id}
                    className="border-b border-ink/5 hover:bg-bgsoft/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Badge tone="default">{tpl.code}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={CHANNEL_TONE[tpl.channel] ?? "default"}>
                        {CHANNEL_LABEL[tpl.channel] ?? tpl.channel}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-[200px]">
                      <span className="line-clamp-2">
                        {tpl.subjectTemplate || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted max-w-[340px]">
                      <span className="line-clamp-2">{tpl.bodyTemplate}</span>
                    </td>
                    <td className="px-4 py-3">
                      {tpl.isActive ? (
                        <Badge tone="primary">Đang bật</Badge>
                      ) : (
                        <Badge tone="default">Tắt</Badge>
                      )}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEdit(tpl)}
                          className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary inline-flex"
                          title="Sửa template"
                        >
                          <IconEdit size={15} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={closeEditor}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-ink/8">
              <h3 className="font-bold text-base flex items-center gap-2">
                <IconMail size={16} />
                Sửa template {editing.code}
              </h3>
              <button
                onClick={closeEditor}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
                aria-label="Đóng"
              >
                <IconClose size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Tiêu đề (chỉ dùng cho kênh Email)
                </label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Ví dụ: Lịch hẹn của bạn đã được xác nhận"
                  className="w-full px-3 py-2 rounded-lg border border-ink/12 text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5">
                  Nội dung template
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={7}
                  placeholder="Ví dụ: Chào {{customerName}}, lịch hẹn của bạn vào {{appointmentTime}}."
                  className="w-full px-3 py-2 rounded-lg border border-ink/12 text-sm focus:outline-none focus:border-primary font-mono"
                />
                <p className="text-xs text-ink-muted mt-1.5">
                  Biến khả dụng: {"{{customerName}}"}, {"{{bookingCode}}"},{" "}
                  {"{{workOrderCode}}"}, {"{{invoiceCode}}"}, {"{{amount}}"},{" "}
                  {"{{appointmentTime}}"}, {"{{partName}}"}
                </p>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-primary"
                />
                Đang hoạt động (được phép gửi thông báo theo template này)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-ink/8">
              <Button variant="ghost" onClick={closeEditor}>
                Huỷ
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <IconCheck size={14} />
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
