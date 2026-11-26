/**
 * RequireAdmin — bao ve route trong khu vuc `/admin`.
 *
 * <p>Chay 2 lop kiem tra theo thu tu:
 *  1. `RequireAuth` — phai da dang nhap (va co token hop le).
 *  2. Kiem tra authority theo ma tran `config/adminAccess.ts` — neu role
 *     khong co quyen doc man hinh hien tai thi hien trang 403.
 *
 * <p>THU TU QUAN TRONG: phai kiem tra dang nhap TRUOC. Ly do: `canAccessPath`
 * doc authority tu token; khong co token thi danh sach rong → ham tra `false`
 * cho moi route → nguoi chua dang nhap se thay trang 403 thay vi duoc
 * chuyen huong ve `/login` nhu mong doi.
 *
 * <p>LUU Y: day chi la lop bao ve giao dien (UX). Backend van kiem tra
 * `@PreAuthorize` la lop bao ve that — user co the bo qua frontend va goi
 * API truc tiep, luc do backend se tra 403.
 */
import { useLocation } from "react-router-dom";
import RequireAuth from "./RequireAuth";
import AdminForbidden from "./AdminForbidden";
import { useAdminAccess } from "../hooks/useAdminAccess";
import { roleLabel } from "../api/types";
import { useAuth } from "../data/authStore";

export default function RequireAdmin({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const { user } = useAuth();
  const { canAccessPath, currentRule } = useAdminAccess();

  return (
    <RequireAuth>
      <AdminGate
        pathname={location.pathname}
        allowed={canAccessPath(location.pathname)}
        requiredAuthorities={currentRule?.anyOf}
        roleLabel={roleLabel(user?.roles)}
      >
        {children}
      </AdminGate>
    </RequireAuth>
  );
}

/**
 * Noi dung kiem tra quyen — chi render sau khi `RequireAuth` xac nhan
 * nguoi dung da dang nhap, nen `canAccessPath` moi co y nghia.
 */
function AdminGate({
  pathname,
  allowed,
  requiredAuthorities,
  roleLabel: role,
  children,
}: {
  pathname: string;
  allowed: boolean;
  requiredAuthorities?: string[];
  roleLabel?: string;
  children: React.ReactNode;
}) {
  if (!allowed) {
    return (
      <AdminForbidden
        pageLabel={pageLabelFor(pathname)}
        requiredAuthorities={requiredAuthorities}
        roleLabel={role}
      />
    );
  }
  return <>{children}</>;
}

/** Ten man hinh tieng Viet cho thong bao 403. */
function pageLabelFor(pathname: string): string | undefined {
  const LABELS: Record<string, string> = {
    "/admin/services": "Dịch vụ",
    "/admin/categories": "Nhóm danh mục",
    "/admin/parts": "Phụ tùng",
    "/admin/suppliers": "Nhà cung cấp",
    "/admin/purchase-orders": "Đơn nhập hàng",
    "/admin/inventory-transactions": "Sổ kho",
    "/admin/bookings": "Lịch hẹn xưởng",
    "/admin/work-orders": "Phiếu sửa chữa",
    "/admin/work-orders/mine": "Việc của tôi",
    "/admin/schedule": "Lịch trình xưởng",
    "/admin/staff": "Kỹ thuật viên",
    "/admin/work-shifts": "Ca làm việc",
    "/admin/invoices": "Hóa đơn",
    "/admin/vehicles": "Hồ sơ Xe & KH",
    "/admin/users": "Người dùng",
    "/admin/permissions": "Quyền",
    "/admin/roles": "Vai trò",
    "/admin/notification-templates": "Template thông báo",
  };
  // Route con: `/admin/staff/:id/schedule` → "Kỹ thuật viên"
  const key = Object.keys(LABELS)
    .filter((k) => pathname === k || pathname.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length)[0];
  return key ? LABELS[key] : undefined;
}
