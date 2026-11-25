/**
 * AdminStaffSchedule — lịch trình chi tiết của một nhân viên.
 *
 * Nguồn dữ liệu (staff-service):
 *  - GET    /api/staff/{id}/recurring-schedules      → lịch lặp lại theo tuần
 *  - PUT    /api/staff/{id}/recurring-schedules      → thay thế lịch lặp lại
 *  - GET    /api/staff/{id}/absences?from&to          → ngày nghỉ
 *  - POST   /api/staff/{id}/absences                 → tạo ngày nghỉ
 *  - PUT    /api/staff/{id}/absences/{absenceId}      → sửa ngày nghỉ
 *  - DELETE /api/staff/{id}/absences/{absenceId}      → xoá ngày nghỉ
 *  - GET    /api/staff/{id}/schedule-exceptions?from&to → ngoại lệ lịch trình
 *  - POST   /api/staff/{id}/schedule-exceptions       → tạo ngoại lệ
 *  - PUT    /api/staff/{id}/schedule-exceptions/{id}  → sửa ngoại lệ
 *  - DELETE /api/staff/{id}/schedule-exceptions/{id}  → xoá ngoại lệ
 *  - GET    /api/staff/{id}/schedules?from&to         → lịch đã tổng hợp
 *
 * Cần authority: STAFF_SCHEDULE_READ (xem), STAFF_SCHEDULE_UPDATE (lịch lặp lại),
 * STAFF_ABSENCE_* (ngày nghỉ), STAFF_SCHEDULE_EXCEPTION_* (ngoại lệ).
 *
 * Quy tắc nghiệp vụ của backend (rất dễ vi phạm):
 *  1. `CANCEL_SHIFT` chỉ hợp lệ với ca **đã có** trong lịch định kỳ của ngày đó.
 *  2. `ADD_SHIFT` ngược lại: ca **không có** trong lịch định kỳ của ngày đó, và
 *     ca làm việc phải đang hoạt động.
 *  3. Mỗi ca chỉ được có một ngoại lệ trong cùng một ngày.
 *  4. `PUT /recurring-schedules` là **thay thế toàn bộ** — lịch cũ ngoài payload
 *     sẽ bị xoá.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  IconCalendar,
  IconClock,
  IconPlus,
  IconTrash,
  IconEdit,
  IconRefresh,
  IconArrowLeft,
  IconWarning,
  IconClose,
} from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Input from "../../components/Input";
import { useToast } from "../../components/Toast";
import {
  staffAbsenceApi,
  staffScheduleApi,
  staffScheduleExceptionApi,
  workShiftApi,
} from "../../api/endpoints/staff";
import { hasTokenAuthority } from "../../api/session";
import type {
  ScheduleExceptionType,
  StaffAbsenceResponse,
  StaffRecurringScheduleResponse,
  StaffScheduleExceptionResponse,
  StaffScheduleResponse,
} from "../../api/types";

// =========================
// Hằng số / helpers
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

/** Thứ tự tuần tự (Thứ Hai → Chủ Nhật) để hiển thị lịch lặp lại. */
const DAY_ORDER = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

const ABSENCE_TYPE_LABEL: Record<string, string> = {
  ANNUAL_LEAVE: "Nghỉ phép",
  SICK_LEAVE: "Nghỉ ốm",
  UNPAID_LEAVE: "Nghỉ không lương",
  MATERNITY_LEAVE: "Nghỉ thai sản",
  PERSONAL: "Nghỉ cá nhân",
  OTHER: "Khác",
};

const EXCEPTION_TYPE_LABEL: Record<ScheduleExceptionType, string> = {
  CANCEL_SHIFT: "Huỷ ca",
  ADD_SHIFT: "Thêm ca",
};

/** `yyyy-MM-dd` của hôm nay (giờ địa phương, khớp ngày server theo múi giờ VN). */
function todayIso(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

/** Cộng số ngày vào chuỗi `yyyy-MM-dd`. */
function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 10);
}

/** Đầu tuần (Thứ Hai) của ngày `iso`. */
function startOfWeek(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  const dow = d.getDay(); // 0 = Chủ Nhật
  const diff = dow === 0 ? -6 : 1 - dow;
  return addDays(iso, diff);
}

/** `yyyy-MM-dd` → tên thứ trong tuần. */
function dayOfWeekOf(iso: string): string {
  const d = new Date(`${iso}T00:00:00`).getDay();
  return DAY_ORDER[(d + 6) % 7];
}

/** Ngày `yyyy-MM-dd` → ISO instant đầu ngày. */
function startOfDayInstant(iso: string): string {
  return `${iso}T00:00:00Z`;
}

/** Ngày `yyyy-MM-dd` → ISO instant cuối ngày. */
function endOfDayInstant(iso: string): string {
  return `${iso}T23:59:59Z`;
}

/** `HH:mm:ss` → `HH:mm`. */
function shortTime(iso: string): string {
  return (iso ?? "").slice(0, 5);
}

// =========================
// AdminStaffSchedule
// =========================

export default function AdminStaffSchedule() {
  const { staffId } = useParams<{ staffId: string }>();
  const t = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /** Lịch đã tổng hợp (dùng để hiển thị bảng ca theo ngày). */
  const [schedule, setSchedule] = useState<StaffScheduleResponse | null>(null);
  const [recurring, setRecurring] = useState<StaffRecurringScheduleResponse[]>(
    [],
  );
  const [absences, setAbsences] = useState<StaffAbsenceResponse[]>([]);
  const [exceptions, setExceptions] = useState<
    StaffScheduleExceptionResponse[]
  >([]);

  /** Khoảng ngày đang xem (lịch định kỳ / ngoại lệ / ngày nghỉ đều theo này). */
  const [fromDate, setFromDate] = useState(() => startOfWeek(todayIso()));
  const [toDate, setToDate] = useState(() => addDays(startOfWeek(todayIso()), 6));

  // ── Quyền ────────────────────────────────────────────────────────────────
  const canRead = hasTokenAuthority("STAFF_SCHEDULE_READ");
  const canUpdateSchedule = hasTokenAuthority("STAFF_SCHEDULE_UPDATE");
  const canManageAbsence =
    hasTokenAuthority("STAFF_ABSENCE_CREATE") ||
    hasTokenAuthority("STAFF_ABSENCE_UPDATE") ||
    hasTokenAuthority("STAFF_ABSENCE_DELETE");
  const canManageException =
    hasTokenAuthority("STAFF_SCHEDULE_EXCEPTION_CREATE") ||
    hasTokenAuthority("STAFF_SCHEDULE_EXCEPTION_UPDATE") ||
    hasTokenAuthority("STAFF_SCHEDULE_EXCEPTION_DELETE");

  // ── Form lịch định kỳ ───────────────────────────────────────────────────
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [weeklyEffectiveFrom, setWeeklyEffectiveFrom] = useState(todayIso());
  const [weeklyEffectiveTo, setWeeklyEffectiveTo] = useState("");
  /** Map `DAY → shiftIds[]`. */
  const [weekly, setWeekly] = useState<Record<string, string[]>>({});
  const [savingWeekly, setSavingWeekly] = useState(false);

  // ── Form ngày nghỉ ──────────────────────────────────────────────────────
  const [absenceOpen, setAbsenceOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] =
    useState<StaffAbsenceResponse | null>(null);
  const [absenceStart, setAbsenceStart] = useState(todayIso());
  const [absenceEnd, setAbsenceEnd] = useState(todayIso());
  const [absenceType, setAbsenceType] = useState("ANNUAL_LEAVE");
  const [absenceReason, setAbsenceReason] = useState("");
  const [savingAbsence, setSavingAbsence] = useState(false);

  // ── Form ngoại lệ ───────────────────────────────────────────────────────
  const [exceptionOpen, setExceptionOpen] = useState(false);
  const [editingException, setEditingException] =
    useState<StaffScheduleExceptionResponse | null>(null);
  const [exceptionDate, setExceptionDate] = useState(todayIso());
  const [exceptionType, setExceptionType] =
    useState<ScheduleExceptionType>("CANCEL_SHIFT");
  const [exceptionShiftId, setExceptionShiftId] = useState("");
  const [exceptionReason, setExceptionReason] = useState("");
  const [savingException, setSavingException] = useState(false);

  /** Danh sách ca làm việc — dùng cho dropdown ngoại lệ + lịch định kỳ. */
  const [shifts, setShifts] = useState<
    { id: string; code: string; name: string; isActive: boolean | null }[]
  >([]);

  // ── Tải dữ liệu ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!staffId) return;
    setLoading(true);
    setError(null);
    try {
      const [sched, rec, abs, exc, shiftRes] = await Promise.all([
        staffScheduleApi.getStaffSchedule(staffId, fromDate, toDate),
        staffScheduleApi.listRecurringSchedules(staffId),
        staffAbsenceApi.listAbsences(
          staffId,
          startOfDayInstant(fromDate),
          endOfDayInstant(toDate),
        ),
        staffScheduleExceptionApi.listExceptions(staffId, fromDate, toDate),
        // Ca làm việc — dùng chung endpoint của ca, cần WORK_SHIFT_READ.
        workShiftApi.listWorkShifts({ size: 100 }),
      ]);

      setSchedule(sched);
      setRecurring(rec);
      setAbsences(abs);
      setExceptions(exc);
      setShifts(
        (shiftRes.items ?? []).map((s) => ({
          id: s.id,
          code: s.code,
          name: s.name,
          isActive: s.isActive,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được lịch trình nhân viên từ máy chủ",
      );
    } finally {
      setLoading(false);
    }
  }, [staffId, fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  /** Nhóm lịch định kỳ theo thứ trong tuần. */
  const weeklyByDay = useMemo(() => {
    const map: Record<string, StaffRecurringScheduleResponse[]> = {};
    for (const r of recurring) {
      (map[r.dayOfWeek] ??= []).push(r);
    }
    return map;
  }, [recurring]);

  /** Ca đang dùng trong lịch định kỳ của một ngày trong tuần. */
  const recurringShiftIdsOf = useCallback(
    (dayOfWeek: string) =>
      (weeklyByDay[dayOfWeek] ?? []).map((r) => r.shiftId),
    [weeklyByDay],
  );

  /** Ca đang có trong lịch định kỳ của ngày cụ thể (dùng cho ngoại lệ). */
  const scheduledShiftIdsOfDate = useCallback(
    (date: string) => recurringShiftIdsOf(dayOfWeekOf(date)),
    [recurringShiftIdsOf],
  );

  const shiftById = useMemo(() => {
    const map: Record<string, { code: string; name: string }> = {};
    for (const s of shifts) map[s.id] = { code: s.code, name: s.name };
    return map;
  }, [shifts]);

  // ── Lịch định kỳ ────────────────────────────────────────────────────────
  const openWeeklyEditor = useCallback(() => {
    // Khởi tạo từ lịch hiện có để người dùng chỉnh, không phải nhập lại.
    const init: Record<string, string[]> = {};
    for (const day of DAY_ORDER) {
      init[day] = recurringShiftIdsOf(day);
    }
    setWeekly(init);
    setWeeklyEffectiveFrom(todayIso());
    setWeeklyEffectiveTo("");
    setWeeklyOpen(true);
  }, [recurringShiftIdsOf]);

  const toggleWeeklyShift = useCallback((day: string, shiftId: string) => {
    setWeekly((prev) => {
      const list = prev[day] ?? [];
      return {
        ...prev,
        [day]: list.includes(shiftId)
          ? list.filter((id) => id !== shiftId)
          : [...list, shiftId],
      };
    });
  }, []);

  const saveWeekly = useCallback(async () => {
    if (!staffId) return;
    setSavingWeekly(true);
    try {
      const weeklySchedules = DAY_ORDER.filter((d) => (weekly[d] ?? []).length)
        .map((d) => ({ dayOfWeek: d, shiftIds: weekly[d] }));
      if (weeklySchedules.length === 0) {
        throw new Error(
          "Cần ít nhất một ngày có ca. Muốn xoá toàn bộ lịch thì dùng nút 'Xoá lịch định kỳ'.",
        );
      }
      const saved = await staffScheduleApi.replaceRecurringSchedules(staffId, {
        effectiveFrom: weeklyEffectiveFrom,
        effectiveTo: weeklyEffectiveTo || null,
        weeklySchedules,
      });
      setRecurring(saved);
      setWeeklyOpen(false);
      t.success("Đã cập nhật lịch định kỳ.");
      await load();
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không cập nhật được lịch định kỳ",
      );
    } finally {
      setSavingWeekly(false);
    }
  }, [staffId, weekly, weeklyEffectiveFrom, weeklyEffectiveTo, t, load]);

  const clearRecurring = useCallback(async () => {
    if (!staffId) return;
    setSavingWeekly(true);
    try {
      // PUT với danh sách rỗng — backend coi là thay thế toàn bộ bằng rỗng.
      const saved = await staffScheduleApi.replaceRecurringSchedules(staffId, {
        effectiveFrom: weeklyEffectiveFrom,
        weeklySchedules: [],
      });
      setRecurring(saved);
      setWeeklyOpen(false);
      t.success("Đã xoá lịch định kỳ.");
      await load();
    } catch (err) {
      t.error(err instanceof Error ? err.message : "Không xoá được lịch định kỳ");
    } finally {
      setSavingWeekly(false);
    }
  }, [staffId, weeklyEffectiveFrom, t, load]);

  // ── Ngày nghỉ ───────────────────────────────────────────────────────────
  const openAbsenceEditor = useCallback(
    (absence: StaffAbsenceResponse | null) => {
      setEditingAbsence(absence);
      if (absence) {
        setAbsenceStart(absence.startAt.slice(0, 10));
        setAbsenceEnd(absence.endAt.slice(0, 10));
        setAbsenceType(absence.absenceType);
        setAbsenceReason(absence.reason ?? "");
      } else {
        setAbsenceStart(fromDate);
        setAbsenceEnd(toDate);
        setAbsenceType("ANNUAL_LEAVE");
        setAbsenceReason("");
      }
      setAbsenceOpen(true);
    },
    [fromDate, toDate],
  );

  const saveAbsence = useCallback(async () => {
    if (!staffId) return;
    setSavingAbsence(true);
    try {
      const payload = {
        startAt: startOfDayInstant(absenceStart),
        endAt: endOfDayInstant(absenceEnd),
        absenceType,
        reason: absenceReason.trim() || null,
      };
      if (editingAbsence) {
        await staffAbsenceApi.updateAbsence(
          staffId,
          editingAbsence.absenceId,
          payload,
        );
        t.success("Đã cập nhật ngày nghỉ.");
      } else {
        await staffAbsenceApi.createAbsence(staffId, payload);
        t.success("Đã ghi nhận ngày nghỉ.");
      }
      setAbsenceOpen(false);
      await load();
    } catch (err) {
      t.error(err instanceof Error ? err.message : "Không lưu được ngày nghỉ");
    } finally {
      setSavingAbsence(false);
    }
  }, [
    staffId,
    editingAbsence,
    absenceStart,
    absenceEnd,
    absenceType,
    absenceReason,
    t,
    load,
  ]);

  const deleteAbsence = useCallback(
    async (absence: StaffAbsenceResponse) => {
      if (!staffId) return;
      try {
        await staffAbsenceApi.deleteAbsence(staffId, absence.absenceId);
        t.success("Đã xoá ngày nghỉ.");
        await load();
      } catch (err) {
        t.error(err instanceof Error ? err.message : "Không xoá được ngày nghỉ");
      }
    },
    [staffId, t, load],
  );

  // ── Ngoại lệ ────────────────────────────────────────────────────────────
  const openExceptionEditor = useCallback(
    (exception: StaffScheduleExceptionResponse | null) => {
      setEditingException(exception);
      if (exception) {
        setExceptionDate(exception.exceptionDate);
        setExceptionType(exception.exceptionType);
        setExceptionShiftId(exception.shiftId);
        setExceptionReason(exception.reason ?? "");
      } else {
        setExceptionDate(fromDate);
        setExceptionType("CANCEL_SHIFT");
        setExceptionShiftId("");
        setExceptionReason("");
      }
      setExceptionOpen(true);
    },
    [fromDate],
  );

  const saveException = useCallback(async () => {
    if (!staffId) return;
    if (!exceptionShiftId) {
      t.error("Vui lòng chọn ca làm việc.");
      return;
    }
    setSavingException(true);
    try {
      const payload = {
        shiftId: exceptionShiftId,
        exceptionDate,
        exceptionType,
        reason: exceptionReason.trim() || null,
      };
      if (editingException) {
        await staffScheduleExceptionApi.updateException(
          staffId,
          editingException.exceptionId,
          payload,
        );
        t.success("Đã cập nhật ngoại lệ lịch trình.");
      } else {
        await staffScheduleExceptionApi.createException(staffId, payload);
        t.success("Đã tạo ngoại lệ lịch trình.");
      }
      setExceptionOpen(false);
      await load();
    } catch (err) {
      t.error(
        err instanceof Error ? err.message : "Không lưu được ngoại lệ lịch trình",
      );
    } finally {
      setSavingException(false);
    }
  }, [
    staffId,
    editingException,
    exceptionShiftId,
    exceptionDate,
    exceptionType,
    exceptionReason,
    t,
    load,
  ]);

  const deleteException = useCallback(
    async (exception: StaffScheduleExceptionResponse) => {
      if (!staffId) return;
      try {
        await staffScheduleExceptionApi.deleteException(
          staffId,
          exception.exceptionId,
        );
        t.success("Đã xoá ngoại lệ lịch trình.");
        await load();
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không xoá được ngoại lệ lịch trình",
        );
      }
    },
    [staffId, t, load],
  );

  if (!staffId) {
    return (
      <div className="p-6 text-sm text-ink-muted">
        Không xác định được nhân viên.
      </div>
    );
  }

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-2 -ml-2"
          >
            <IconArrowLeft size={14} />
            Quay lại danh sách nhân viên
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <IconCalendar size={20} />
            </span>
            Lịch trình nhân viên
          </h1>
          <p className="text-sm text-ink-muted mt-1">
            {loading
              ? "Đang tải lịch trình..."
              : schedule
                ? `${schedule.fullName ?? "—"} · ${schedule.employeeCode ?? "—"}`
                : "Nhân viên"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <IconRefresh size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </Button>
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
        </div>
      </Card>

      {/* Lịch định kỳ */}
      <Card hover={false}>
        <div className="px-4 py-3 border-b border-ink/8 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="font-semibold text-sm">Lịch định kỳ (theo tuần)</h2>
            <p className="text-xs text-ink-muted">
              Lịch lặp lại áp dụng cho tất cả các tuần kể từ ngày bắt đầu.
            </p>
          </div>
          {canUpdateSchedule && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={openWeeklyEditor}>
                <IconEdit size={14} />
                Sửa lịch định kỳ
              </Button>
            </div>
          )}
        </div>
        <div className="p-4">
          {recurring.length === 0 ? (
            <p className="text-sm text-ink-muted">
              Chưa có lịch định kỳ. Bấm "Sửa lịch định kỳ" để thiết lập.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {DAY_ORDER.map((day) => {
                const list = weeklyByDay[day] ?? [];
                return (
                  <div
                    key={day}
                    className={[
                      "rounded-xl border p-3",
                      list.length
                        ? "border-primary/30 bg-primary/5"
                        : "border-ink/8 bg-bgsoft/40",
                    ].join(" ")}
                  >
                    <div className="text-xs font-semibold text-ink mb-1.5">
                      {DAY_LABELS[day] ?? day}
                    </div>
                    {list.length === 0 ? (
                      <div className="text-[11px] text-ink-muted">—</div>
                    ) : (
                      <div className="space-y-1">
                        {list.map((r) => (
                          <div
                            key={r.scheduleId}
                            className="text-[11px] flex items-center gap-1.5"
                          >
                            <IconClock size={10} className="text-ink-muted" />
                            <span className="font-medium">
                              {shiftById[r.shiftId]?.code ?? "—"}
                            </span>
                            <span className="text-ink-muted truncate">
                              {shiftById[r.shiftId]?.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {list[0]?.effectiveFrom && (
                      <div className="text-[10px] text-ink-muted mt-1.5">
                        Từ {list[0].effectiveFrom}
                        {list[0].effectiveTo ? ` → ${list[0].effectiveTo}` : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Lịch đã tổng hợp */}
      <Card hover={false}>
        <div className="px-4 py-3 border-b border-ink/8">
          <h2 className="font-semibold text-sm">
            Lịch thực tế trong khoảng {fromDate} → {toDate}
          </h2>
          <p className="text-xs text-ink-muted">
            Đã gộp lịch định kỳ + ngoại lệ + ngày nghỉ của backend.
          </p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-muted">Đang tải...</div>
        ) : !schedule || schedule.days.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Không có ca nào trong khoảng ngày này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  <th className="font-medium px-4 py-3">Ngày</th>
                  <th className="font-medium px-4 py-3">Thứ</th>
                  <th className="font-medium px-4 py-3">Ca</th>
                </tr>
              </thead>
              <tbody>
                {schedule.days.map((day) => (
                  <tr
                    key={day.date}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      {day.date}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {DAY_LABELS[dayOfWeekOf(day.date)]}
                    </td>
                    <td className="px-4 py-3">
                      {day.intervals.length === 0 ? (
                        <span className="text-xs text-ink-muted">
                          Nghỉ / không có ca
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {day.intervals.map((iv) => (
                            <Badge key={`${day.date}-${iv.shiftId}-${iv.startAt}`} tone="primary">
                              {iv.shiftCode} · {shortTime(iv.startAt)}–
                              {shortTime(iv.endAt)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Ngày nghỉ */}
      <Card hover={false}>
        <div className="px-4 py-3 border-b border-ink/8 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-sm">
            Ngày nghỉ ({absences.length})
          </h2>
          {canManageAbsence && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openAbsenceEditor(null)}
            >
              <IconPlus size={14} />
              Ghi nhận ngày nghỉ
            </Button>
          )}
        </div>
        {absences.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Không có ngày nghỉ trong khoảng này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  <th className="font-medium px-4 py-3">Từ</th>
                  <th className="font-medium px-4 py-3">Đến</th>
                  <th className="font-medium px-4 py-3">Loại</th>
                  <th className="font-medium px-4 py-3">Lý do</th>
                  {canManageAbsence && (
                    <th className="font-medium px-4 py-3 text-right">Hành động</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {absences.map((a) => (
                  <tr
                    key={a.absenceId}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {a.startAt.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {a.endAt.slice(0, 10)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="warning">
                        {ABSENCE_TYPE_LABEL[a.absenceType] ?? a.absenceType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {a.reason ?? "—"}
                    </td>
                    {canManageAbsence && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => openAbsenceEditor(a)}
                            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                            title="Sửa"
                          >
                            <IconEdit size={15} />
                          </button>
                          <button
                            onClick={() => void deleteAbsence(a)}
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

      {/* Ngoại lệ lịch trình */}
      <Card hover={false}>
        <div className="px-4 py-3 border-b border-ink/8 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-sm">
            Ngoại lệ lịch trình ({exceptions.length})
          </h2>
          {canManageException && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => openExceptionEditor(null)}
            >
              <IconPlus size={14} />
              Thêm ngoại lệ
            </Button>
          )}
        </div>
        {exceptions.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">
            Không có ngoại lệ trong khoảng này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-ink-muted uppercase border-b border-ink/8">
                  <th className="font-medium px-4 py-3">Ngày</th>
                  <th className="font-medium px-4 py-3">Loại</th>
                  <th className="font-medium px-4 py-3">Ca</th>
                  <th className="font-medium px-4 py-3">Lý do</th>
                  {canManageException && (
                    <th className="font-medium px-4 py-3 text-right">Hành động</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {exceptions.map((e) => (
                  <tr
                    key={e.exceptionId}
                    className="border-b border-ink/5 hover:bg-bgsoft/40"
                  >
                    <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                      {e.exceptionDate}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          e.exceptionType === "CANCEL_SHIFT" ? "warning" : "primary"
                        }
                      >
                        {EXCEPTION_TYPE_LABEL[e.exceptionType]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {shiftById[e.shiftId]?.code ?? "—"}
                      <span className="text-ink-muted ml-1">
                        {shiftById[e.shiftId]?.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-muted">
                      {e.reason ?? "—"}
                    </td>
                    {canManageException && (
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => openExceptionEditor(e)}
                            className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted hover:text-primary"
                            title="Sửa"
                          >
                            <IconEdit size={15} />
                          </button>
                          <button
                            onClick={() => void deleteException(e)}
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

      {/* ── Modal: lịch định kỳ ─────────────────────────────────────────── */}
      {weeklyOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setWeeklyOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
          >
            <div className="px-5 py-4 border-b border-ink/8 flex items-center justify-between">
              <h3 className="font-semibold">Lịch định kỳ theo tuần</h3>
              <button
                onClick={() => setWeeklyOpen(false)}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
              >
                <IconClose size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Hiệu lực từ ngày *
                  </label>
                  <Input
                    type="date"
                    value={weeklyEffectiveFrom}
                    onChange={(e) => setWeeklyEffectiveFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Hiệu lực đến ngày (bỏ trống = vô thời hạn)
                  </label>
                  <Input
                    type="date"
                    value={weeklyEffectiveTo}
                    onChange={(e) => setWeeklyEffectiveTo(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {DAY_ORDER.map((day) => (
                  <div
                    key={day}
                    className="border border-ink/8 rounded-xl p-3 flex items-start gap-3"
                  >
                    <div className="w-24 shrink-0 text-sm font-medium">
                      {DAY_LABELS[day]}
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {shifts.map((s) => {
                        const active = (weekly[day] ?? []).includes(s.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleWeeklyShift(day, s.id)}
                            disabled={s.isActive !== true}
                            className={[
                              "text-xs font-medium px-2.5 py-1 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
                              active
                                ? "bg-primary text-white"
                                : "bg-bgsoft text-ink-muted hover:bg-ink/10",
                            ].join(" ")}
                            title={
                              s.isActive !== true
                                ? "Ca đang tạm ngưng — không thể dùng cho lịch định kỳ"
                                : `${s.code} · ${s.name}`
                            }
                          >
                            {s.code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-ink-muted">
                <IconWarning size={13} />
                Ca đang tạm ngưng không thể đưa vào lịch định kỳ.
              </div>
            </div>
            <div className="px-5 py-4 border-t border-ink/8 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void clearRecurring()}
                disabled={savingWeekly || recurring.length === 0}
              >
                <IconTrash size={14} />
                Xoá lịch định kỳ
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setWeeklyOpen(false)}>
                  Huỷ
                </Button>
                <Button size="sm" onClick={() => void saveWeekly()} disabled={savingWeekly}>
                  {savingWeekly ? "Đang lưu..." : "Lưu lịch định kỳ"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: ngày nghỉ ─────────────────────────────────────────────── */}
      {absenceOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setAbsenceOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg"
          >
            <div className="px-5 py-4 border-b border-ink/8 flex items-center justify-between">
              <h3 className="font-semibold">
                {editingAbsence ? "Sửa ngày nghỉ" : "Ghi nhận ngày nghỉ"}
              </h3>
              <button
                onClick={() => setAbsenceOpen(false)}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
              >
                <IconClose size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Từ ngày *
                  </label>
                  <Input
                    type="date"
                    value={absenceStart}
                    onChange={(e) => setAbsenceStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Đến ngày *
                  </label>
                  <Input
                    type="date"
                    value={absenceEnd}
                    onChange={(e) => setAbsenceEnd(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Loại nghỉ *</label>
                <select
                  value={absenceType}
                  onChange={(e) => setAbsenceType(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                >
                  {Object.entries(ABSENCE_TYPE_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Lý do</label>
                <textarea
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  rows={3}
                  placeholder="VD: Nghỉ phép năm, nghỉ ốm..."
                  className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-ink/8 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAbsenceOpen(false)}>
                Huỷ
              </Button>
              <Button
                size="sm"
                onClick={() => void saveAbsence()}
                disabled={savingAbsence}
              >
                {savingAbsence ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: ngoại lệ ──────────────────────────────────────────────── */}
      {exceptionOpen && (
        <div
          className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
          onClick={() => setExceptionOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-lg"
          >
            <div className="px-5 py-4 border-b border-ink/8 flex items-center justify-between">
              <h3 className="font-semibold">
                {editingException
                  ? "Sửa ngoại lệ lịch trình"
                  : "Thêm ngoại lệ lịch trình"}
              </h3>
              <button
                onClick={() => setExceptionOpen(false)}
                className="p-1.5 rounded-md hover:bg-bgsoft text-ink-muted"
              >
                <IconClose size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Ngày *
                  </label>
                  <Input
                    type="date"
                    value={exceptionDate}
                    onChange={(e) => setExceptionDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-ink-muted mb-1 block">
                    Loại ngoại lệ *
                  </label>
                  <select
                    value={exceptionType}
                    onChange={(e) =>
                      setExceptionType(e.target.value as ScheduleExceptionType)
                    }
                    className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                  >
                    <option value="CANCEL_SHIFT">Huỷ ca</option>
                    <option value="ADD_SHIFT">Thêm ca</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">
                  Ca làm việc *
                </label>
                <select
                  value={exceptionShiftId}
                  onChange={(e) => setExceptionShiftId(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">-- Chọn ca --</option>
                  {shifts.map((s) => {
                    const scheduled = scheduledShiftIdsOfDate(
                      exceptionDate,
                    ).includes(s.id);
                    const allowed =
                      exceptionType === "CANCEL_SHIFT"
                        ? scheduled
                        : !scheduled && s.isActive === true;
                    return (
                      <option
                        key={s.id}
                        value={s.id}
                        disabled={!allowed && exceptionShiftId !== s.id}
                      >
                        {s.code} · {s.name}
                        {exceptionType === "CANCEL_SHIFT" && !scheduled
                          ? " — không có trong lịch định kỳ"
                          : ""}
                        {exceptionType === "ADD_SHIFT" && scheduled
                          ? " — đã có trong lịch định kỳ"
                          : ""}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-ink-muted mt-1.5 flex items-start gap-1">
                  <IconWarning size={12} className="shrink-0 mt-0.5" />
                  <span>
                    {exceptionType === "CANCEL_SHIFT"
                      ? "Chỉ huỷ được ca đã có trong lịch định kỳ của ngày này."
                      : "Chỉ thêm được ca KHÔNG có trong lịch định kỳ của ngày này, và ca phải đang hoạt động."}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-xs text-ink-muted mb-1 block">Lý do</label>
                <textarea
                  value={exceptionReason}
                  onChange={(e) => setExceptionReason(e.target.value)}
                  rows={3}
                  placeholder="VD: Nghỉ lễ, làm thêm ca..."
                  className="w-full px-3 py-2 rounded-xl border border-ink/15 bg-white text-sm focus:border-primary focus:outline-none resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-ink/8 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setExceptionOpen(false)}>
                Huỷ
              </Button>
              <Button
                size="sm"
                onClick={() => void saveException()}
                disabled={savingException}
              >
                {savingException ? "Đang lưu..." : "Lưu"}
              </Button>
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
