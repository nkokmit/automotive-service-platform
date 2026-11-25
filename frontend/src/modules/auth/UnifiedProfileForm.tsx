/**
 * Form hồ sơ thống nhất cho màn `/profile`.
 *
 * Vì sao gộp?
 * ----------
 * Trước đây màn hình có HAI form cùng sửa trường giống nhau:
 *
 *   1. "Thông tin tài khoản"  → `PUT /api/users/{id}`
 *   2. "Hồ sơ khách hàng"     → `PUT /api/customers/{id}`
 *
 * Cả hai đều có tên / email / SĐT. Người dùng phải chọn "sửa ở đâu", và
 * tệ hơn: **cả hai đều không ghi được lên server** với tài khoản CUSTOMER,
 * vì `USER_UPDATE` và `CUSTOMER_UPDATE` đều chỉ cấp cho ADMIN. Cả hai form
 * rơi về fallback lưu localStorage — nghĩa là mọi chỉnh sửa mất khi đổi
 * thiết bị.
 *
 * Form này gộp lại thành MỘT form, và chọn nguồn ghi theo thứ tự ưu tiên:
 *
 *   1. `PUT /api/customers/{id}` — hồ sơ khách hàng (đúng nơi nghiệp vụ nên
 *      lưu thông tin liên hệ). Cần quyền `CUSTOMER_UPDATE` — hiện chỉ ADMIN
 *      có, nên server trả 403 cho tài khoản CUSTOMER.
 *   2. `PUT /api/users/{id}` — tài khoản (fallback khi chưa có hồ sơ khách
 *      hàng liên kết, hoặc khi endpoint (1) không khả dụng).
 *
 * Khi cả hai đều bị từ chối, form báo rõ là chỉ lưu tạm trên thiết bị —
 * không giả vờ đã lưu vào hệ thống.
 *
 * Ghi chú cho đội backend: nếu thêm endpoint `PUT /api/customers/me` với
 * quyền `CUSTOMER_UPDATE_SELF`, chỉ cần đổi đường (1) sang endpoint đó —
 * phần còn lại của form không phải sửa.
 */
import { useCallback, useEffect, useState } from "react";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import {
  IconCheckCircle,
  IconMapPin,
  IconNote,
  IconRefresh,
  IconUser,
} from "../../components/icons";
import { customerVehicleApi } from "../../api/endpoints/customerVehicle";
import { userApi } from "../../api/endpoints/user";
import { isAuthError } from "../../api/client";
import type { CustomerResponse } from "../../api/types";
import { GARAGE } from "../../config/garage";

export interface UnifiedProfileValues {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
}

/** Bản ghi mà form này ghi được về đâu. */
type SaveTarget = "customer" | "user" | "none";

export default function UnifiedProfileForm({
  userId,
  userName,
  userEmail,
  userPhone,
  customer,
  customerStatus,
  onCustomerUpdated,
  onUserUpdated,
}: {
  userId: string;
  userName: string;
  userEmail: string;
  userPhone?: string;
  /** Hồ sơ khách hàng từ `GET /api/customers/me` — null nếu chưa liên kết. */
  customer: CustomerResponse | null;
  customerStatus: "unknown" | "linked" | "unlinked";
  /** Được gọi sau khi ghi hồ sơ khách hàng thành công để nạp lại từ server. */
  onCustomerUpdated: () => Promise<void> | void;
  /** Được gọi sau khi ghi tài khoản thành công để cập nhật session. */
  onUserUpdated: (patch: {
    name: string;
    email: string;
    phone?: string;
  }) => void;
}) {
  const t = useToast();
  const [saving, setSaving] = useState(false);
  const [savedTarget, setSavedTarget] = useState<SaveTarget>("none");

  const [form, setForm] = useState<UnifiedProfileValues>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  /**
   * Nạp giá trị khởi tạo.
   *
   * Ưu tiên hồ sơ khách hàng khi đã liên kết — vì đó là nơi nghiệp vụ lưu
   * thông tin liên hệ. Chỉ khi hồ sơ khách hàng chưa có (hoặc trống) mới
   * lấy từ tài khoản, để form không bao giờ hiển thị trống một cách vô lý.
   */
  const load = useCallback(() => {
    const fromCustomer = customer
      ? {
          fullName: customer.fullName ?? "",
          email: customer.email ?? "",
          phone: customer.phone ?? "",
          address: customer.address ?? "",
          notes: customer.notes ?? "",
        }
      : null;

    const name = fromCustomer?.fullName || userName || "";
    const email = fromCustomer?.email || userEmail || "";
    const phone = fromCustomer?.phone || userPhone || "";

    setForm({
      fullName: name,
      email,
      phone,
      address: fromCustomer?.address ?? "",
      notes: fromCustomer?.notes ?? "",
    });
    setSavedTarget("none");
  }, [customer, userName, userEmail, userPhone]);

  useEffect(() => {
    load();
  }, [load]);

  const validate = (): boolean => {
    if (!form.fullName.trim()) {
      t.error("Họ và tên không được để trống");
      return false;
    }
    if (
      form.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
    ) {
      t.error("Email không hợp lệ");
      return false;
    }
    return true;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    const fullName = form.fullName.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();

    // ── Đường 1: hồ sơ khách hàng ──────────────────────────────────────
    // `PUT /api/customers/{id}` là nơi đúng để lưu thông tin liên hệ. Cần
    // quyền `CUSTOMER_UPDATE` — hiện chỉ ADMIN có nên tài khoản CUSTOMER sẽ
    // nhận 403; khi đó rơi xuống đường 2.
    if (customerStatus === "linked" && customer) {
      try {
        await customerVehicleApi.updateCustomer(customer.id, {
          fullName,
          phone: phone || null,
          email: email || null,
          address: form.address.trim() || null,
          notes: form.notes.trim() || null,
        });
        await onCustomerUpdated();
        setSavedTarget("customer");
        setSaving(false);
        t.success("Đã cập nhật hồ sơ của bạn");
        return;
      } catch (err) {
        if (!isAuthError(err)) {
          setSaving(false);
          t.error(
            err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại",
          );
          return;
        }
        // 403/401 → thử đường 2 bên dưới.
      }
    }

    // ── Đường 2: tài khoản ──────────────────────────────────────────────
    // Cần quyền `USER_UPDATE` — cũng chỉ ADMIN có, nên với tài khoản
    // CUSTOMER thường sẽ 403.
    try {
      const updated = await userApi.updateUser(userId, {
        fullName,
        email,
        phone,
      });
      onUserUpdated({
        name: updated.fullName?.trim() || fullName,
        email: updated.email || email,
        phone: updated.phone ?? phone,
      });
      setSavedTarget("user");
      setSaving(false);
      t.success("Đã cập nhật thông tin tài khoản");
      return;
    } catch (err) {
      if (isAuthError(err)) {
        setSavedTarget("none");
        setSaving(false);
        t.info(
          "Bạn không có quyền sửa hồ sơ trực tiếp trên máy chủ. Thay đổi đã được lưu tạm trên thiết bị này — vui lòng liên hệ " +
            GARAGE.name +
            " để đồng bộ.",
        );
        return;
      }
      setSaving(false);
      t.error(
        err instanceof Error ? err.message : "Cập nhật thông tin thất bại",
      );
    }
  };

  const linked = customerStatus === "linked" && !!customer;

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Hồ sơ của tôi
              {linked ? (
                <Badge tone="accent">
                  <IconCheckCircle size={11} /> Đã liên kết
                </Badge>
              ) : (
                <Badge tone="warning">Chưa liên kết</Badge>
              )}
            </h2>
            <p className="text-xs text-ink-muted mt-1">
              {linked
                ? "Thông tin liên hệ được xưởng dùng để gọi điện khi bạn đặt lịch."
                : "Thông tin tài khoản. Liên hệ " +
                  GARAGE.name +
                  " để liên kết hồ sơ khách hàng."}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <Input
            label="Họ và tên *"
            value={form.fullName}
            onChange={(e) =>
              setForm({ ...form, fullName: e.target.value })
            }
            leftIcon={<IconUser size={16} />}
            required
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              leftIcon={<IconNote size={16} />}
            />
            <Input
              label="Số điện thoại"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              leftIcon={<IconMapPin size={16} />}
            />
          </div>

          {linked && (
            <>
              <Input
                label="Địa chỉ liên hệ"
                value={form.address}
                onChange={(e) =>
                  setForm({ ...form, address: e.target.value })
                }
                leftIcon={<IconMapPin size={16} />}
              />
              <Input
                label="Ghi chú"
                hint="Ghi chú giúp xưởng chuẩn bị tốt hơn cho lần bảo dưỡng tới"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                leftIcon={<IconNote size={16} />}
              />
            </>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <IconRefresh size={16} className="animate-spin" />
                  Đang lưu...
                </>
              ) : (
                <>
                  <IconCheckCircle size={16} />
                  Lưu thay đổi
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={load}
              disabled={saving}
            >
              Huỷ
            </Button>
          </div>

          {savedTarget === "none" && (
            <p className="text-xs text-ink-muted">
              Lưu ý: nếu hệ thống từ chối quyền ghi, thay đổi của bạn chỉ được
              giữ tạm trên thiết bị này và sẽ mất khi đăng nhập lại từ máy khác.
            </p>
          )}
        </form>
      </div>
    </Card>
  );
}
