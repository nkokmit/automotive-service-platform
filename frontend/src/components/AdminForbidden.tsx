/**
 * AdminForbidden — trang 403 cho nguoi dung vao man hinh khong duoc phan quyen.
 *
 * <p>Hien thi ro chuc nang dang bi chan va vi sao, kem nut quay lai trang
 * dau tien ma role do duoc phep.
 */
import { Link } from "react-router-dom";
import { IconShield, IconArrowLeft } from "./icons";
import Card from "./Card";
import Button from "./Button";

export default function AdminForbidden({
  pageLabel,
  requiredAuthorities,
  roleLabel,
}: {
  /** Ten man hinh bi chan (VD: "Người dùng"). */
  pageLabel?: string;
  /** Cac authority can co de mo man hinh nay. */
  requiredAuthorities?: string[];
  /** Role cua nguoi dung hien tai. */
  roleLabel?: string;
}) {
  return (
    <div className="max-w-xl mx-auto">
      <Card hover={false}>
        <div className="p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
            <IconShield size={28} />
          </div>
          <h2 className="text-2xl font-bold mb-2">Không có quyền truy cập</h2>
          <p className="text-sm text-ink-muted mb-6">
            {pageLabel ? (
              <>
                Chức năng{" "}
                <span className="font-semibold text-ink">{pageLabel}</span> không
                thuộc quyền của vai trò{" "}
                <span className="font-semibold text-primary">
                  {roleLabel ?? "của bạn"}
                </span>
                .
              </>
            ) : (
              "Bạn không có quyền truy cập chức năng này."
            )}
          </p>

          {requiredAuthorities && requiredAuthorities.length > 0 && (
            <div className="mb-6 text-left">
              <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">
                Quyền cần có
              </p>
              <ul className="space-y-1">
                {requiredAuthorities.map((authority) => (
                  <li
                    key={authority}
                    className="flex items-center gap-2 text-sm text-ink-muted"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-ink/20 shrink-0" />
                    <code className="text-xs bg-bgsoft px-1.5 py-0.5 rounded">
                      {authority}
                    </code>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-center gap-2">
            <Link to="/admin">
              <Button variant="outline">
                <IconArrowLeft size={14} />
                Về Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
