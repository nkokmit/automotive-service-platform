/**
 * AdminScheduleBoard — bảng lịch trình toàn xưởng + tra cứu nhân viên rảnh.
 *
 * Nguồn dữ liệu (staff-service):
 *  - GET /api/schedules?from&to                → lịch đã tổng hợp của cả xưởng
 *  - GET /api/staff/availability?startAt&endAt → nhân viên đang rảnh
 *
 * Cần authority: STAFF_SCHEDULE_READ.
 *
 * Lưu ý về múi giờ:
 *  - `/api/schedules` dùng **ngày** (`yyyy-MM-dd`) và trả về `Instant` — nên lúc
 *    hiển thị phải quy đổi sang giờ địa phương của trình duyệt.
 *  - `/api/staff/availability` dùng **instant** (`2026-11-25T01:00:00Z`).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconCalendar,
  IconRefresh,
  IconUsers,
  IconWarning,
  IconClock,
  IconSearch,
  IconClose,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { staffScheduleApi } from "../../api/endpoints/staff";
import { hasTokenAuthority } from "../../api/session";
import type {
  StaffAvailabilityResponse,
  StaffScheduleResponse,
} from "../../api/types";

// =========================
// Helpers
// =========================

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Thứ Hai",
  TUESDAY: "Thứ Ba",
  WEDNESDAY: "Thứ Tư",
  THURSDAY: "Thứ Năm",
  FRIDAY: "Thứ Sáu",
  SATURDAY: "Thứ Bảy",
  SUNDAY: "Chủ Nhật",
};

const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

function todayIso(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

function startOfWeek(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(iso, diff);
}

function dayOfWeekOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`).getDay();
  return DAY_ORDER[(d + 6) % 7];
}

/** ISO instant → giờ địa phương `HH:mm`. */
function localTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// =========================
// AdminScheduleBoard
// =========================

export default function AdminScheduleBoard() {
  const [fromDate, setFromDate] = useState(() => startOfWeek(todayIso()));
  const [toDate, setToDate] = useState(() => addDays(startOfWeek(todayIso()), 6));

  const [schedules, setSchedules] = useState<StaffScheduleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Tra cứu nhân viên rảnh ──────────────────────────────────────────────
  const [availOpen, setAvailOpen] = useState(false);
  const [availStart, setAvailStart] = useState(() => `${todayIso()}T08:00`);
  const [availEnd, setAvailEnd] = useState(() => `${todayIso()}T12:00`);
  const [availability, setAvailability] = useState<StaffAvailabilityResponse[]>(
    [],
  );
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState<string | null>(null);

  const canRead = hasTokenAuthority("STAFF_SCHEDULE_READ");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await staffScheduleApi.getGarageSchedule(fromDate, toDate);
      setSchedules(res ?? []);
    } catch (err) {
      setSchedules([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được lịch trình xưởng từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const checkAvailability = useCallback(async () => {
    setAvailLoading(true);
    setAvailError(null);
    try {
      // `datetime-local` không có múi giờ → gửi ISO instant cho backend.
      const startAt = new Date(availStart).toISOString();
      const endAt = new Date(availEnd).toISOString();
      const res = await staffScheduleApi.findAvailableStaff(startAt, endAt);
      setAvailability(res ?? []);
    } catch (err) {
      setAvailability([]);
      setAvailError(
        err instanceof Error
          ? err.message
          : "Không tra cứu được nhân viên rảnh",
      );
    } finally {
      setAvailLoading(false);
    }
  }, [availStart, availEnd]);

  /** Các ngày trong khoảng đã chọn (dùng để dựng cột bảng). */
  const days = useMemo(() => {
    const out: string[] = [];
    let cur = fromDate;
    let guard = 0;
    while (cur <= toDate && guard < 62) {
      out.push(cur);
      cur = addDays(cur, 1);
      guard += 1;
    }
    return out;
  }, [fromDate, toDate]);

  /**
   * Lịch của từng ngày theo từng nhân viên.
   *
   * <p>Backend trả về một mảng, mỗi phần tử là lịch của một nhân viên (kèm
   * `days[]`). Ta đảo thành map `ngày → nhân viên → ca` để dựng lưới.
   */
  const grid = useMemo(() => {
    const map: Record<string, Record<string, StaffScheduleResponse>> = {};
    for (const sch of schedules) {
      for (const d of sch.days ?? []) {
        (map[d.date] ??= {})[sch.staffId] = {
          ...sch,
          days: [d],
        };
      }
    }
    return map;
  }, [schedules]);

  const staffIds = useMemo(
    () => schedules.map((s) => s.staffId),
    [schedules],
  );

  const staffMeta = useMemo(() => {
    const map: Record<string, { code: string | null; name: string | null }> = {};
    for (const s of schedules) {
      map[s.staffId] = { code: s.employeeCode, name: s.fullName };
    }
    return map;
  }, [schedules]);

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

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconCalendar size={20} />
            </span>
            Lịch trình xưởng
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading
              ? "Đang tải lịch trình..."
              : `${schedules.length} nhân viên · ${days.length} ngày`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setAvailOpen(true)}>
            <IconUsers size={14} />
            Tra cứu nhân viên rảnh
          </Button>
          <Button variant="outline" size="sm" onClick={() => void load()}>
            <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Chọn khoảng ngày */}
      <Card hover={false}>
        <div className="p-3 flex items-end gap-3 flex-wrap">
          <div>
            <label className="text-xs text-ink-muted mb-1 block">Từ ngày</label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-ink-muted mb-1 block">Đến ngày</label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const start = startOfWeek(todayIso());
              setFromDate(start);
              setToDate(addDays(start, 6));
            }}
          >
            Tuần này
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const start = startOfWeek(todayIso());
              setFromDate(start);
              setToDate(addDays(start, 13));
            }}
          >
            2 tuần
          </Button>
        </div>
      </Card>

      {/* Lưới lịch */}
      <Card hover={false}>
        <div className="px-4 py-3 border-b border-ink/8">
          <h2 className="font-semibold text-sm">
            Lịch tổng hợp {fromDate} → {toDate}
          </h2>
          <p className="text-xs text-ink-muted">
            Dữ liệu đã gộp lịch định kỳ, ngoại lệ và ngày nghỉ từ backend.
          </p>
        </div>
        {loading ? (
          <div className="p-10 text-center text-sm text-ink-muted">Đang tải...</div>
        ) : staffIds.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">
            Không có nhân viên nào trong lịch trình khoảng này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8 bg-bgsoft/30">
                  <th className="font-medium px-3 py-3 sticky left-0 bg-white z-10">
                    Nhân viên
                  </th>
                  {days.map((d) => (
                    <th
                      key={d}
                      className="font-medium px-3 py-3 whitespace-nowrap text-center"
                    >
                      <div>{d.slice(5)}</div>
                      <div className="text-[10px] normal-case font-normal">
                        {DAY_LABELS[dayOfWeekOf(d)]}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffIds.map((id) => (
                  <tr key={id} className="border-b border-ink/5 hover:bg-bgsoft/40">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10">
                      <Link
                        to={`/admin/staff/${id}/schedule`}
                        className="block hover:text-primary"
                      >
                        <div className="font-semibold text-xs line-clamp-1">
                          {staffMeta[id]?.name ?? "—"}
                        </div>
                        <div className="text-[10px] text-ink-muted font-mono">
                          {staffMeta[id]?.code ?? "—"}
                        </div>
                      </Link>
                    </td>
                    {days.map((d) => {
                      const cell = grid[d]?.[id];
                      const intervals = cell?.days?.[0]?.intervals ?? [];
                      return (
                        <td
                          key={d}
                          className="px-2 py-2 align-top min-w-[110px]"
                        >
                          {intervals.length === 0 ? (
                            <span className="text-[10px] text-ink-muted">
                              —
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {intervals.map((iv) => (
                                <div
                                  key={`${d}-${iv.shiftId}-${iv.startAt}`}
                                  className="text-[10px] leading-tight"
                                >
                                  <div className="font-semibold text-primary">
                                    {iv.shiftCode}
                                  </div>
                                  <div className="text-ink-muted flex items-center gap-0.5">
                                    <IconClock size={9} />
                                    {localTime(iv.startAt)}–{localTime(iv.endAt)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Modal: nhân viên rảnh ─────────────────────────────────────────── */}
      {availOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setAvailOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="px-5 py-4 border-b border-ink/8 flex items-center justify-between">
              <h3 className="font-semibold">Nhân viên đang rảnh</h3>
              <button
                onClick={() => setAvailOpen(false)}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
              >
                <IconClose size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Bắt đầu *
                  </label>
                  <Input
                    type="datetime-local"
                    value={availStart}
                    onChange={(e) => setAvailStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">Kết thúc *</label>
                  <Input
                    type="datetime-local"
                    value={availEnd}
                    onChange={(e) => setAvailEnd(e.target.value)}
                  />
                </div>
              </div>
              <Button size="sm" onClick={() => void checkAvailability()}>
                <IconSearch size={14} />
                Tra cứu
              </Button>

              {availError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {availError}
                </div>
              )}

              {availLoading ? (
                <p className="text-sm text-ink-muted py-4 text-center">
                  Đang tra cứu...
                </p>
              ) : availability.length === 0 ? (
                <p className="text-sm text-ink-muted py-4 text-center">
                  Không có nhân viên nào rảnh trong khung giờ này.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                        <th className="font-medium px-3 py-2">Mã NV</th>
                        <th className="font-medium px-3 py-2">Họ tên</th>
                        <th className="font-medium px-3 py-2">Khung giờ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availability.map((a) => (
                        <tr
                          key={a.staffId}
                          className="border-b border-ink/5"
                        >
                          <td className="px-3 py-2 font-mono text-xs">
                            {a.employeeCode ?? "—"}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <Link
                              to={`/admin/staff/${a.staffId}/schedule`}
                              className="hover:text-primary"
                            >
                              {a.fullName ?? "—"}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-xs text-ink-muted">
                            {localTime(a.startAt)} – {localTime(a.endAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!canRead && (
        <p className="text-xs text-ink-muted flex items-center gap-1">
          <IconWarning size={12} />
          Bạn cần authority STAFF_SCHEDULE_READ để xem lịch trình.
        </p>
      )}
    </div>
  );
}
