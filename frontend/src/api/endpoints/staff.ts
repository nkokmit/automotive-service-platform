/**
 * Endpoint client cho `staff-service` — hồ sơ nhân viên, ca làm việc và lịch trình.
 *
 * Yêu cầu authority:
 *  - `STAFF_READ` / `STAFF_CREATE` / `STAFF_UPDATE` / `STAFF_DELETE` — hồ sơ NV
 *  - `WORK_SHIFT_READ` / `WORK_SHIFT_CREATE` / `WORK_SHIFT_UPDATE` / `WORK_SHIFT_DELETE` — ca
 *  - `STAFF_ABSENCE_*` — ngày nghỉ
 *  - `STAFF_SCHEDULE_EXCEPTION_*` — ngoại lệ lịch trình
 *  - `STAFF_SCHEDULE_READ` / `STAFF_SCHEDULE_UPDATE` — lịch trình lặp lại & tổng hợp
 *
 * Role CUSTOMER không được cấp các quyền này (xem V9 của user-service) → các API
 * này chỉ dùng được ở khu vực admin.
 */
import client from "../client";
import type {
  PageResponse,
  ScheduleExceptionType,
  StaffAbsenceResponse,
  StaffAvailabilityResponse,
  StaffRecurringScheduleResponse,
  StaffResponse,
  StaffScheduleExceptionResponse,
  StaffScheduleResponse,
  WorkShiftResponse,
} from "../types";

export interface ListStaffParams {
  keyword?: string;
  isActive?: boolean;
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: "ASC" | "DESC";
}

/** Payload tạo hồ sơ nhân viên (`StaffCreateRequest`). */
export interface StaffCreateRequest {
  /** Liên kết tới tài khoản người dùng — phải duy nhất trong hệ thống. */
  userId?: string | null;
  employeeCode: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
  isActive?: boolean | null;
}

/** Payload cập nhật hồ sơ nhân viên (`StaffUpdateRequest`). */
export interface StaffUpdateRequest {
  userId?: string | null;
  employeeCode: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  position?: string | null;
}

/** Payload tạo / cập nhật ca làm việc. */
export interface WorkShiftWriteRequest {
  code: string;
  name: string;
  /** `HH:mm` hoặc `HH:mm:ss` — backend parse bằng `LocalTime`. */
  startTime: string;
  /** `HH:mm` hoặc `HH:mm:ss`. Ca qua đêm được backend xử lý. */
  endTime: string;
  isActive?: boolean | null;
}

/** Payload tạo / cập nhật ngày nghỉ (`StaffAbsenceRequest`). */
export interface StaffAbsenceWriteRequest {
  /** ISO instant. */
  startAt: string;
  /** ISO instant. */
  endAt: string;
  /** Tự do: ANNUAL_LEAVE, SICK_LEAVE, UNPAID_LEAVE, PERSONAL… */
  absenceType: string;
  reason?: string | null;
}

/** Payload tạo / cập nhật ngoại lệ lịch trình. */
export interface StaffScheduleExceptionWriteRequest {
  shiftId: string;
  /** Định dạng `yyyy-MM-dd`. */
  exceptionDate: string;
  exceptionType: ScheduleExceptionType;
  reason?: string | null;
}

/** Một ngày trong tuần của lịch trình lặp lại. */
export interface RecurringScheduleDayWriteRequest {
  /** `MONDAY` … `SUNDAY` (Java `DayOfWeek`). */
  dayOfWeek: string;
  /** Danh sách id ca làm việc áp dụng cho ngày đó (>= 1). */
  shiftIds: string[];
}

/** Payload thay thế toàn bộ lịch trình lặp lại. */
export interface RecurringScheduleReplaceRequest {
  /** Định dạng `yyyy-MM-dd`. */
  effectiveFrom: string;
  /** Định dạng `yyyy-MM-dd` — bỏ trống = vô thời hạn. */
  effectiveTo?: string | null;
  weeklySchedules: RecurringScheduleDayWriteRequest[];
}

// =========================
// Hồ sơ nhân viên
// =========================

export const staffApi = {
  /** Danh sách nhân viên. Trang 0-based. */
  listStaff: async (
    params: ListStaffParams = {},
  ): Promise<PageResponse<StaffResponse>> => {
    return client.requestPage<PageResponse<StaffResponse>>("/api/staff", {
      keyword: params.keyword,
      isActive: params.isActive,
      page: params.page ?? 0,
      size: params.size ?? 20,
      sortBy: params.sortBy ?? "createdAt",
      sortDirection: params.sortDirection ?? "DESC",
    });
  },

  getStaffById: async (id: string): Promise<StaffResponse> => {
    return client.request<StaffResponse>(`/api/staff/${id}`);
  },

  /** Tra cứu hồ sơ nhân viên theo tài khoản người dùng. */
  getStaffByUserId: async (userId: string): Promise<StaffResponse> => {
    return client.request<StaffResponse>(`/api/staff/by-user/${userId}`);
  },

  /** Tạo hồ sơ nhân viên. Cần authority `STAFF_CREATE`. */
  createStaff: async (data: StaffCreateRequest): Promise<StaffResponse> => {
    return client.request<StaffResponse>("/api/staff", {
      method: "POST",
      body: data,
    });
  },

  /** Cập nhật hồ sơ nhân viên. Cần authority `STAFF_UPDATE`. */
  updateStaff: async (
    id: string,
    data: StaffUpdateRequest,
  ): Promise<StaffResponse> => {
    return client.request<StaffResponse>(`/api/staff/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /**
   * Bật/tắt trạng thái nhân viên.
   *
   * <p>Backend dùng **PATCH** `/api/staff/{id}/is-active` (không phải PUT).
   */
  updateStaffIsActive: async (
    id: string,
    isActive: boolean,
  ): Promise<StaffResponse> => {
    return client.request<StaffResponse>(`/api/staff/${id}/is-active`, {
      method: "PATCH",
      body: { isActive },
    });
  },

  /**
   * Xoá hồ sơ nhân viên.
   *
   * <p>Backend làm **soft delete**: đặt `isActive = false` và `deletedAt = now()`.
   * Hồ sơ đã xoá vẫn còn trong DB nên mã nhân viên vẫn bị coi là trùng.
   */
  deleteStaff: async (id: string): Promise<void> => {
    await client.request<void>(`/api/staff/${id}`, { method: "DELETE" });
  },
};

// =========================
// Ca làm việc
// =========================

export const workShiftApi = {
  listWorkShifts: async (
    params: {
      keyword?: string;
      isActive?: boolean;
      page?: number;
      size?: number;
      sortBy?: string;
      sortDirection?: "ASC" | "DESC";
    } = {},
  ): Promise<PageResponse<WorkShiftResponse>> => {
    return client.requestPage<PageResponse<WorkShiftResponse>>(
      "/api/work-shifts",
      {
        keyword: params.keyword,
        isActive: params.isActive,
        page: params.page ?? 0,
        size: params.size ?? 20,
        sortBy: params.sortBy ?? "startTime",
        sortDirection: params.sortDirection ?? "ASC",
      },
    );
  },

  getWorkShiftById: async (id: string): Promise<WorkShiftResponse> => {
    return client.request<WorkShiftResponse>(`/api/work-shifts/${id}`);
  },

  createWorkShift: async (
    data: WorkShiftWriteRequest,
  ): Promise<WorkShiftResponse> => {
    return client.request<WorkShiftResponse>("/api/work-shifts", {
      method: "POST",
      body: data,
    });
  },

  updateWorkShift: async (
    id: string,
    data: WorkShiftWriteRequest,
  ): Promise<WorkShiftResponse> => {
    return client.request<WorkShiftResponse>(`/api/work-shifts/${id}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Bật/tắt ca làm việc — backend dùng **PATCH** `/is-active`. */
  updateWorkShiftIsActive: async (
    id: string,
    isActive: boolean,
  ): Promise<WorkShiftResponse> => {
    return client.request<WorkShiftResponse>(`/api/work-shifts/${id}/is-active`, {
      method: "PATCH",
      body: { isActive },
    });
  },

  /** Xoá ca làm việc. */
  deleteWorkShift: async (id: string): Promise<void> => {
    await client.request<void>(`/api/work-shifts/${id}`, { method: "DELETE" });
  },
};

// =========================
// Ngày nghỉ
// =========================

export const staffAbsenceApi = {
  /**
   * Danh sách ngày nghỉ trong khoảng thời gian.
   *
   * <p>`from` / `to` là **bắt buộc** (backend không có `required = false`),
   * và phải là ISO instant — VD `2026-11-01T00:00:00Z`.
   */
  listAbsences: async (
    staffId: string,
    from: string,
    to: string,
  ): Promise<StaffAbsenceResponse[]> => {
    const qs = new URLSearchParams({ from, to });
    return client.request<StaffAbsenceResponse[]>(
      `/api/staff/${staffId}/absences?${qs.toString()}`,
    );
  },

  createAbsence: async (
    staffId: string,
    data: StaffAbsenceWriteRequest,
  ): Promise<StaffAbsenceResponse> => {
    return client.request<StaffAbsenceResponse>(
      `/api/staff/${staffId}/absences`,
      { method: "POST", body: data },
    );
  },

  updateAbsence: async (
    staffId: string,
    absenceId: string,
    data: StaffAbsenceWriteRequest,
  ): Promise<StaffAbsenceResponse> => {
    return client.request<StaffAbsenceResponse>(
      `/api/staff/${staffId}/absences/${absenceId}`,
      { method: "PUT", body: data },
    );
  },

  deleteAbsence: async (
    staffId: string,
    absenceId: string,
  ): Promise<void> => {
    await client.request<void>(`/api/staff/${staffId}/absences/${absenceId}`, {
      method: "DELETE",
    });
  },
};

// =========================
// Ngoại lệ lịch trình
// =========================

export const staffScheduleExceptionApi = {
  /**
   * Danh sách ngoại lệ lịch trình trong khoảng ngày.
   *
   * <p>`from` / `to` là **bắt buộc**, định dạng `yyyy-MM-dd` (Java `LocalDate`).
   */
  listExceptions: async (
    staffId: string,
    from: string,
    to: string,
  ): Promise<StaffScheduleExceptionResponse[]> => {
    const qs = new URLSearchParams({ from, to });
    return client.request<StaffScheduleExceptionResponse[]>(
      `/api/staff/${staffId}/schedule-exceptions?${qs.toString()}`,
    );
  },

  createException: async (
    staffId: string,
    data: StaffScheduleExceptionWriteRequest,
  ): Promise<StaffScheduleExceptionResponse> => {
    return client.request<StaffScheduleExceptionResponse>(
      `/api/staff/${staffId}/schedule-exceptions`,
      { method: "POST", body: data },
    );
  },

  updateException: async (
    staffId: string,
    exceptionId: string,
    data: StaffScheduleExceptionWriteRequest,
  ): Promise<StaffScheduleExceptionResponse> => {
    return client.request<StaffScheduleExceptionResponse>(
      `/api/staff/${staffId}/schedule-exceptions/${exceptionId}`,
      { method: "PUT", body: data },
    );
  },

  deleteException: async (
    staffId: string,
    exceptionId: string,
  ): Promise<void> => {
    await client.request<void>(
      `/api/staff/${staffId}/schedule-exceptions/${exceptionId}`,
      { method: "DELETE" },
    );
  },
};

// =========================
// Lịch trình
// =========================

export const staffScheduleApi = {
  /** Lịch trình lặp lại của một nhân viên. */
  listRecurringSchedules: async (
    staffId: string,
  ): Promise<StaffRecurringScheduleResponse[]> => {
    return client.request<StaffRecurringScheduleResponse[]>(
      `/api/staff/${staffId}/recurring-schedules`,
    );
  },

  /**
   * Thay thế toàn bộ lịch trình lặp lại của nhân viên.
   *
   * <p>Đây là **PUT thay thế toàn bộ**, không phải cập nhật từng dòng — những
   * lịch cũ ngoài payload sẽ bị xoá.
   */
  replaceRecurringSchedules: async (
    staffId: string,
    data: RecurringScheduleReplaceRequest,
  ): Promise<StaffRecurringScheduleResponse[]> => {
    return client.request<StaffRecurringScheduleResponse[]>(
      `/api/staff/${staffId}/recurring-schedules`,
      { method: "PUT", body: data },
    );
  },

  /**
   * Lịch trình đã tổng hợp của một nhân viên trong khoảng ngày.
   *
   * <p>Đã gộp lịch lặp lại + ngoại lệ + ngày nghỉ thành các khoảng thời gian
   * thực tế (`ScheduleIntervalResponse`).
   */
  getStaffSchedule: async (
    staffId: string,
    from: string,
    to: string,
  ): Promise<StaffScheduleResponse> => {
    const qs = new URLSearchParams({ from, to });
    return client.request<StaffScheduleResponse>(
      `/api/staff/${staffId}/schedules?${qs.toString()}`,
    );
  },

  /** Lịch trình tổng hợp của toàn bộ xưởng trong khoảng ngày. */
  getGarageSchedule: async (
    from: string,
    to: string,
  ): Promise<StaffScheduleResponse[]> => {
    const qs = new URLSearchParams({ from, to });
    return client.request<StaffScheduleResponse[]>(
      `/api/schedules?${qs.toString()}`,
    );
  },

  /**
   * Nhân viên đang rảnh trong khoảng thời gian.
   *
   * <p>`startAt` / `endAt` là **ISO instant** (khác với `/schedules` dùng ngày).
   */
  findAvailableStaff: async (
    startAt: string,
    endAt: string,
  ): Promise<StaffAvailabilityResponse[]> => {
    const qs = new URLSearchParams({ startAt, endAt });
    return client.request<StaffAvailabilityResponse[]>(
      `/api/staff/availability?${qs.toString()}`,
    );
  },
};
