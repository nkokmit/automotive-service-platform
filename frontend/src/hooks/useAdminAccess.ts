/**
 * Hook phan quyen cho khu vuc admin.
 *
 * <p>Lay quyen tu claim `authorities` cua access token (xem `api/session.ts`).
 * Backend van la noi thuc thi that — hook nay chi dung de AN/HIEN menu va
 * chan route, khong thay the co che bao ve phia server.
 */
import { useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { hasTokenAuthority } from "../api/session";
import {
  ADMIN_ACCESS_RULES,
  ADMIN_ENTRY_AUTHORITIES,
  canAccessAdminPath,
  type AccessRule,
} from "../config/adminAccess";

/** Rule khop voi pathname hien tai (route con duoc ưu tien). */
function matchRule(pathname: string): AccessRule | null {
  const matched = ADMIN_ACCESS_RULES.filter(
    (rule) => pathname === rule.path || pathname.startsWith(rule.path + "/"),
  ).sort((a, b) => b.path.length - a.path.length);
  return matched[0] ?? null;
}

export interface AdminAccess {
  /** Nguoi dung co it nhat MOT authority trong `authorities` khong. */
  can: (authority: string) => boolean;
  /** Nguoi dung co quyen truy cap route hien tai khong. */
  canAccessPath: (pathname: string) => boolean;
  /** Nguoi dung co quyen vao khu vuc `/admin` khong. */
  canEnterAdmin: boolean;
  /** Rule khop voi route hien tai (null neu route khong khai bao). */
  currentRule: AccessRule | null;
  /** Danh sach authority ma nguoi dung dang co. */
  authorities: string[];
}

export function useAdminAccess(): AdminAccess {
  const location = useLocation();

  const can = useCallback(
    (authority: string) => hasTokenAuthority(authority),
    [],
  );

  const canAccessPath = useCallback(
    (pathname: string) => canAccessAdminPath(pathname, can),
    [can],
  );

  const canEnterAdmin = useMemo(
    () => ADMIN_ENTRY_AUTHORITIES.some((authority) => can(authority)),
    [can],
  );

  const currentRule = useMemo(
    () => matchRule(location.pathname),
    [location.pathname],
  );

  const authorities = useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const rule of ADMIN_ACCESS_RULES) {
      for (const authority of rule.anyOf) {
        if (!seen.has(authority) && can(authority)) {
          seen.add(authority);
          result.push(authority);
        }
      }
    }
    return result;
  }, [can]);

  return {
    can,
    canAccessPath,
    canEnterAdmin,
    currentRule,
    authorities,
  };
}
