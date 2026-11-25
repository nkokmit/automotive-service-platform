/* Script kiểm thử các API Section 4 (staff-service) qua gateway.
 * Chạy: node scripts/section4-smoke.mjs
 */
import { readFileSync } from "node:fs";

const token = readFileSync(".tok", "utf8").trim();
const BASE = "http://localhost:8000";
/** Hậu tố duy nhất — mã nhân viên / mã ca là UNIQUE trong DB. */
const RUN = Date.now().toString(36).toUpperCase().slice(-6);

const H = {
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json; charset=utf-8",
};

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: H,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

function log(label, r) {
  const ok = r.status < 400;
  console.log(`${ok ? "OK  " : "FAIL"} ${label} -> ${r.status}`);
  if (!ok) console.log("     ", JSON.stringify(r.json).slice(0, 300));
  return r.json.result;
}

// ── 1. Ca làm việc ──────────────────────────────────────────────────────────
const shift = log(
  "POST /api/work-shifts",
  await call("POST", "/api/work-shifts", {
    code: `CA-${RUN}`,
    name: `Ca smoke ${RUN}`,
    startTime: "08:00:00",
    endTime: "17:00:00",
    isActive: true,
  }),
);
console.log("     shift:", shift.code, shift.startTime, "->", shift.endTime);
log("GET  /api/work-shifts", await call("GET", "/api/work-shifts?size=10"));
log("GET  /api/work-shifts/{id}", await call("GET", `/api/work-shifts/${shift.id}`));
log(
  "PUT  /api/work-shifts/{id}",
  await call("PUT", `/api/work-shifts/${shift.id}`, {
    code: `CA-${RUN}`,
    name: `Ca smoke ${RUN} (đã sửa)`,
    startTime: "09:00:00",
    endTime: "18:00:00",
  }),
);
log(
  "PATCH /api/work-shifts/{id}/is-active",
  await call("PATCH", `/api/work-shifts/${shift.id}/is-active`, { isActive: false }),
);
log(
  "PATCH /api/work-shifts/{id}/is-active (bật lại)",
  await call("PATCH", `/api/work-shifts/${shift.id}/is-active`, { isActive: true }),
);

// ── 2. Hồ sơ nhân viên ──────────────────────────────────────────────────────
const staff = log(
  "POST /api/staff",
  await call("POST", "/api/staff", {
    employeeCode: `NV-${RUN}`,
    fullName: `Nhân viên smoke ${RUN}`,
    phone: "0912345678",
    email: `smoke.${RUN.toLowerCase()}@test.vn`,
    position: "MECHANIC",
    isActive: true,
  }),
);
console.log("     staff:", staff.employeeCode, staff.fullName, staff.position);
log("GET  /api/staff", await call("GET", "/api/staff?size=10"));
log("GET  /api/staff/{id}", await call("GET", `/api/staff/${staff.id}`));
log(
  "PUT  /api/staff/{id}",
  await call("PUT", `/api/staff/${staff.id}`, {
    employeeCode: `NV-${RUN}`,
    fullName: `Nhân viên smoke ${RUN} (đã sửa)`,
    phone: "0999888777",
    position: "SERVICE_ADVISOR",
  }),
);
log(
  "PATCH /api/staff/{id}/is-active",
  await call("PATCH", `/api/staff/${staff.id}/is-active`, { isActive: false }),
);
log(
  "PATCH /api/staff/{id}/is-active (bật lại)",
  await call("PATCH", `/api/staff/${staff.id}/is-active`, { isActive: true }),
);

// ── 3. Lịch trình lặp lại ──────────────────────────────────────────────────
const recurring = log(
  "GET  /api/staff/{id}/recurring-schedules",
  await call("GET", `/api/staff/${staff.id}/recurring-schedules`),
);
console.log("     recurring:", JSON.stringify(recurring));

const replaced = log(
  "PUT  /api/staff/{id}/recurring-schedules",
  await call("PUT", `/api/staff/${staff.id}/recurring-schedules`, {
    effectiveFrom: "2026-12-01",
    weeklySchedules: [
      { dayOfWeek: "MONDAY", shiftIds: [shift.id] },
      { dayOfWeek: "TUESDAY", shiftIds: [shift.id] },
    ],
  }),
);
console.log("     recurring sau khi set:", JSON.stringify(replaced));

// ── 4. Ngày nghỉ ───────────────────────────────────────────────────────────
const from = "2026-12-01T00:00:00Z";
const to = "2026-12-31T23:59:59Z";
const absence = log(
  "POST /api/staff/{id}/absences",
  await call("POST", `/api/staff/${staff.id}/absences`, {
    startAt: from,
    endAt: to,
    absenceType: "ANNUAL_LEAVE",
    reason: "Nghỉ phép smoke",
  }),
);
console.log("     absence:", absence.absenceType, absence.startAt, "->", absence.endAt);
log(
  "GET  /api/staff/{id}/absences",
  await call("GET", `/api/staff/${staff.id}/absences?from=${from}&to=${to}`),
);
log(
  "PUT  /api/staff/{id}/absences/{absenceId}",
  await call("PUT", `/api/staff/${staff.id}/absences/${absence.absenceId}`, {
    startAt: from,
    endAt: to,
    absenceType: "SICK_LEAVE",
    reason: "Nghỉ ốm smoke",
  }),
);

// ── 5. Ngoại lệ lịch trình ─────────────────────────────────────────────────
// Quy tắc của backend:
//  - `CANCEL_SHIFT` chỉ hợp lệ với ca ĐÃ có trong lịch định kỳ của ngày đó.
//    Lịch định kỳ ở trên chỉ có MONDAY + TUESDAY → 2026-12-07 là thứ Hai.
//  - `ADD_SHIFT` ngược lại: ca KHÔNG có trong lịch định kỳ của ngày đó, và
//    ca làm việc phải đang hoạt động → 2026-12-05 là thứ Bảy.
const exception = log(
  "POST /api/staff/{id}/schedule-exceptions (hủy ca thứ Hai)",
  await call("POST", `/api/staff/${staff.id}/schedule-exceptions`, {
    shiftId: shift.id,
    exceptionDate: "2026-12-07",
    exceptionType: "CANCEL_SHIFT",
    reason: "Nghỉ lễ smoke",
  }),
);
console.log("     exception:", exception.exceptionType, exception.exceptionDate);
log(
  "GET  /api/staff/{id}/schedule-exceptions",
  await call(
    "GET",
    `/api/staff/${staff.id}/schedule-exceptions?from=2026-12-01&to=2026-12-31`,
  ),
);
log(
  "PUT  /api/staff/{id}/schedule-exceptions/{id}",
  await call(
    "PUT",
    `/api/staff/${staff.id}/schedule-exceptions/${exception.exceptionId}`,
    {
      shiftId: shift.id,
      // 2026-12-06 là thứ Bảy — không có trong lịch định kỳ (MON/TUE) nên
      // hợp lệ cho `ADD_SHIFT`.
      exceptionDate: "2026-12-06",
      exceptionType: "ADD_SHIFT",
      reason: "Làm thêm ca smoke",
    },
  ),
);

// Ngoại lệ hủy ca khi ca CHƯA có trong lịch định kỳ → phải bị backend chặn.
const badCancel = await call(
  "POST",
  `/api/staff/${staff.id}/schedule-exceptions`,
  {
    shiftId: shift.id,
    exceptionDate: "2026-12-05",
    exceptionType: "CANCEL_SHIFT",
    reason: "Cố hủy ca không có trong lịch",
  },
);
const cancelBlocked = badCancel.status === 400;
console.log(
  `${cancelBlocked ? "OK  " : "FAIL"} POST hủy ca ngoài lịch định kỳ bị chặn -> ${badCancel.status}`,
);
if (!cancelBlocked)
  console.log("     ", JSON.stringify(badCancel.json).slice(0, 200));

// ── 6. Lịch trình tổng hợp ─────────────────────────────────────────────────
const sched = log(
  "GET  /api/staff/{id}/schedules",
  await call("GET", `/api/staff/${staff.id}/schedules?from=2026-12-01&to=2026-12-31`),
);
console.log("     schedule days:", sched.days?.length);
log(
  "GET  /api/schedules (toàn xưởng)",
  await call("GET", "/api/schedules?from=2026-12-01&to=2026-12-31"),
);
log(
  "GET  /api/staff/availability",
  await call(
    "GET",
    "/api/staff/availability?startAt=2026-12-01T08:00:00Z&endAt=2026-12-01T12:00:00Z",
  ),
);

// ── 7. Dọn dẹp ─────────────────────────────────────────────────────────────
log(
  "DELETE /api/staff/{id}/schedule-exceptions/{id}",
  await call("DELETE", `/api/staff/${staff.id}/schedule-exceptions/${exception.exceptionId}`),
);
log(
  "DELETE /api/staff/{id}/absences/{absenceId}",
  await call("DELETE", `/api/staff/${staff.id}/absences/${absence.absenceId}`),
);
log("DELETE /api/staff/{id}", await call("DELETE", `/api/staff/${staff.id}`));
// Ca đã dùng trong lịch thì backend không cho xoá cứng (3103) — phải tắt
// hoạt động bằng `isActive=false`.
const delShift = await call("DELETE", `/api/work-shifts/${shift.id}`);
console.log(
  `${delShift.status === 400 ? "OK  " : "FAIL"} DELETE ca đã dùng trong lịch bị chặn -> ${delShift.status}`,
);
log(
  "PATCH /api/work-shifts/{id}/is-active (tắt ca)",
  await call("PATCH", `/api/work-shifts/${shift.id}/is-active`, { isActive: false }),
);

console.log("\nHoàn tất.");
