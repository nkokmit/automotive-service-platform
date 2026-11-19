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
