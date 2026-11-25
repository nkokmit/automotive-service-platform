/**
 * Endpoint client cho `booking-service` — lịch hẹn của khách hàng.
 *
 * Yêu cầu authority (xem V11__seed_booking_service_permissions.sql):
 *  - `BOOKING_AVAILABILITY_READ` cho GET /api/bookings/availability
 *  - `CUSTOMER_BOOKING_CREATE`     cho POST /api/bookings
 *  - `CUSTOMER_BOOKING_READ`       cho GET /api/bookings/me
 *  - `CUSTOMER_BOOKING_CANCEL`     cho POST /api/bookings/{id}/cancel
 *  - `CUSTOMER_BOOKING_RESCHEDULE` cho PATCH /api/bookings/{id}/reschedule
 */
import client from "../client";
import type {
  AvailabilitySlotResponse,
  BookingCancelRequest,
  BookingCreateRequest,
  BookingResponse,
  BookingRescheduleRequest,
  BookingSource,
  BookingStatus,
  StaffBookingCreateRequest,
  StaffBookingPageResponse,
  StaffBookingResponse,
  StaffBookingVehicleRequest,
} from "../types";

export interface AvailabilityParams {
  /** ISO date `YYYY-MM-DD`. */
  from: string;
  /** ISO date `YYYY-MM-DD`. */
  to: string;
  /** Danh sách id dịch vụ — backend giới hạn khoảng 14 ngày. */
  serviceIds: string[];
}

export const bookingApi = {
  /**
   * Các khung giờ còn trống trong khoảng from..to cho các dịch vụ đã chọn.
   * Backend bỏ qua slot đã qua và slot vượt sức chứa kỹ thuật viên.
   */
  getAvailability: async (
    params: AvailabilityParams,
  ): Promise<AvailabilitySlotResponse[]> => {
    const qs = new URLSearchParams();
    qs.append("from", params.from);
    qs.append("to", params.to);
    for (const id of params.serviceIds) qs.append("serviceIds", id);
    return client.request<AvailabilitySlotResponse[]>(
      `/api/bookings/availability?${qs.toString()}`,
    );
  },

  /** Tạo lịch hẹn cho khách hàng đang đăng nhập. */
  createBooking: async (
    payload: BookingCreateRequest,
  ): Promise<BookingResponse> => {
    return client.request<BookingResponse>("/api/bookings", {
      method: "POST",
      body: payload,
    });
  },

  /** Danh sách lịch hẹn của chính khách hàng đang đăng nhập. */
  getMyBookings: async (): Promise<BookingResponse[]> => {
    return client.request<BookingResponse[]>("/api/bookings/me");
  },

  getBooking: async (id: string): Promise<BookingResponse> => {
    return client.request<BookingResponse>(`/api/bookings/${id}`);
  },

  cancelBooking: async (
    id: string,
    reason?: string,
  ): Promise<BookingResponse> => {
    const body: BookingCancelRequest = reason ? { reason } : {};
    return client.request<BookingResponse>(`/api/bookings/${id}/cancel`, {
      method: "POST",
      body,
    });
  },

  rescheduleBooking: async (
    id: string,
    startAt: string,
  ): Promise<BookingResponse> => {
    const body: BookingRescheduleRequest = { startAt };
    return client.request<BookingResponse>(`/api/bookings/${id}/reschedule`, {
      method: "PATCH",
      body,
    });
  },
};

// =========================
// API của xưởng (staff) — dùng ở khu vực admin
// Cần authority: BOOKING_READ / BOOKING_STATUS_UPDATE / BOOKING_CHECK_IN
// =========================

export interface StaffBookingParams {
  status?: BookingStatus;
  source?: BookingSource;
  customerId?: string;
  licensePlate?: string;
  /** ISO date `YYYY-MM-DD`. */
  from?: string;
  /** ISO date `YYYY-MM-DD`. */
  to?: string;
  page?: number;
  size?: number;
  newestFirst?: boolean;
}

export const staffBookingApi = {
  /** Tra cứu lịch hẹn toàn hệ thống. */
  listBookings: async (
    params: StaffBookingParams = {},
  ): Promise<StaffBookingPageResponse> => {
    return client.requestPage<StaffBookingPageResponse>("/api/staff/bookings", {
      status: params.status,
      source: params.source,
      customerId: params.customerId,
      licensePlate: params.licensePlate,
      from: params.from,
      to: params.to,
      page: params.page ?? 0,
      size: params.size ?? 20,
      newestFirst: params.newestFirst ?? true,
    });
  },

  getBooking: async (bookingId: string): Promise<StaffBookingResponse> => {
    return client.request<StaffBookingResponse>(
      `/api/staff/bookings/${bookingId}`,
    );
  },

  /**
   * Tạo lịch hẹn hộ khách — `POST /api/staff/bookings`.
   * Cần authority `BOOKING_CREATE`.
   *
   * <p>Dùng khi khách đến xưởng mà không đặt qua web (source `WALK_IN`), hoặc
   * nhân viên tạo hộ khi khách gọi điện (`PHONE`).
   *
   * <p>Khác `bookingApi.createBooking` (khách tự đặt): endpoint này **bắt
   * buộc** có `customerId` và `licensePlate` — nhân viên nhập tay biển số và
   * chọn khách đã có trong hệ thống. Khách phải **đã tồn tại** trong
   * customer-vehicle-service, nếu không sẽ nhận lỗi 404/400.
   */
  createBooking: async (
    payload: StaffBookingCreateRequest,
  ): Promise<StaffBookingResponse> => {
    return client.request<StaffBookingResponse>("/api/staff/bookings", {
      method: "POST",
      body: payload,
    });
  },

  /**
   * Đổi lịch hẹn — `PATCH /api/staff/bookings/{id}/reschedule`.
   * Cần authority `BOOKING_RESCHEDULE`.
   *
   * <p>`startAt` phải nằm trong **tương lai** (backend `@Future`) và là ISO
   * instant. Backend sẽ kiểm tra lại sức chứa kỹ thuật viên cho khung giờ
   * mới — nếu đầy sẽ trả lỗi 409.
   *
   * <p>Khác `bookingApi.rescheduleBooking` (khách tự đổi lịch): endpoint này
   * dành cho nhân viên, và quyền là `BOOKING_RESCHEDULE` chứ không phải
   * `CUSTOMER_BOOKING_RESCHEDULE`.
   */
  rescheduleBooking: async (
    bookingId: string,
    startAt: string,
  ): Promise<StaffBookingResponse> => {
    const body: BookingRescheduleRequest = { startAt };
    return client.request<StaffBookingResponse>(
      `/api/staff/bookings/${bookingId}/reschedule`,
      {
        method: "PATCH",
        body,
      },
    );
  },

  /** Cập nhật trạng thái lịch hẹn (tiếp nhận xe, hoàn thành, huỷ…). */
  updateStatus: async (
    bookingId: string,
    status: BookingStatus,
    reason?: string,
  ): Promise<StaffBookingResponse> => {
    return client.request<StaffBookingResponse>(
      `/api/staff/bookings/${bookingId}/status`,
      {
        method: "PATCH",
        body: { status, reason: reason ?? null },
      },
    );
  },

  /**
   * Tiếp nhận xe — **endpoint riêng**, KHÔNG dùng `updateStatus("CHECKED_IN")`.
   *
   * Backend trả lỗi 5003 nếu đặt CHECKED_IN qua `/status` ("Trạng thái
   * CHECKED_IN không được đặt trực tiếp"). Endpoint này bắt buộc có:
   *  - `vehicleId`: xe thực tế đưa vào xưởng — booking chưa gắn xe thì không
   *    tạo được Work Order (lỗi 6203).
   *  - `odometerIn`: số km vào xưởng.
   *
   * Cần authority `BOOKING_CHECK_IN`.
   */
  checkIn: async (
    bookingId: string,
    data: StaffBookingVehicleRequest,
  ): Promise<StaffBookingResponse> => {
    return client.request<StaffBookingResponse>(
      `/api/staff/bookings/${bookingId}/check-in`,
      {
        method: "POST",
        body: data,
      },
    );
  },

  /** Huỷ lịch hẹn. */
  cancelBooking: async (
    bookingId: string,
    reason?: string,
  ): Promise<StaffBookingResponse> => {
    return client.request<StaffBookingResponse>(
      `/api/staff/bookings/${bookingId}/cancel`,
      {
        method: "POST",
        body: reason ? { reason } : {},
      },
    );
  },
};
