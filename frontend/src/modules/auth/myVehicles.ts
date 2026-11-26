/**
 * Suy ra danh sách "xe đã từng mang đến xưởng" từ lịch sử bảo dưỡng thật.
 *
 * Vì sao không có endpoint "xe của tôi"?
 * ----------------------------------
 * Backend **cố ý** bỏ khái niệm sở hữu xe: migration
 * `V3__decouple_customer_from_vehicle.sql` đã `DROP COLUMN customer_id` khỏi
 * bảng `vehicles`. Nghiệp vụ ghi rõ: *"Customer là hồ sơ người liên hệ /
 * người mang xe đến gara, KHÔNG phải chủ sở hữu pháp lý"* — bất kỳ ai cũng
 * có thể mang bất kỳ xe nào đến.
 *
 * Liên kết Customer–Vehicle vì thế được ghi theo **từng lần tiếp nhận**, nằm
 * ở bảng `vehicle_service_histories.customer_id`. Nguồn dữ liệu duy nhất cho
 * "những chiếc xe của tôi" là `GET /api/service-history/me` — endpoint này đã
 * tồn tại, đã hoạt động, và được backend giới hạn đúng phạm vi (chỉ lịch sử
 * của chính người gọi, qua `SERVICE_HISTORY_READ_SELF`).
 *
 * Vì vậy ở UI, tab "Xe của tôi" được đổi tên thành "Xe của tôi" theo nghĩa
 * *"những xe tôi từng mang đến"* — dựng từ lịch sử, không phải danh sách xe
 * được xưởng quản lý sở hữu.
 */

import type { ServiceHistoryResponse } from "../../api/types";

/** Một chiếc xe đã từng được khách mang đến xưởng. */
export interface MyVehicle {
  /** id xe trong `vehicles` — có thể null nếu bản ghi lịch sử trỏ tới xe đã xoá mềm. */
  id: string | null;
  /** Biển số. */
  plate: string;
  /** Hãng xe. */
  brand: string;
  /** Dòng xe. */
  model: string;
  /** Số lần đã bảo dưỡng tại xưởng. */
  serviceCount: number;
  /** Số km ghi nhận ở lần bảo dưỡng gần nhất. */
  lastOdometerKm: number | null;
  /** Ngày bảo dưỡng gần nhất (ISO). */
  lastServiceDate: string | null;
  /** Tổng chi phí không có — backend chưa trả, để trống. */
  totalSpentVND: number | null;
}

/**
 * Gom các bản ghi lịch sử thành danh sách xe duy nhất.
 *
 * Một chiếc xe có thể xuất hiện trong nhiều bản ghi (mỗi lần bảo dưỡng một
 * dòng), nên phải gom theo `vehicleId`. Bản ghi nào không có `vehicleId` (xe
 * đã xoá mềm) thì bỏ qua — không gom được xe thì không hiển thị, vì hiển thị
 * một dòng "xe không xác định" chỉ gây nhiễu.
 *
 * @param items danh sách lịch sử bảo dưỡng của chính khách, đã sắp xếp
 *              mới nhất trước.
 */
export function buildMyVehicles(items: ServiceHistoryResponse[]): MyVehicle[] {
  const byVehicle = new Map<string, MyVehicle>();

  for (const item of items) {
    if (!item.vehicleId) continue;

    const existing = byVehicle.get(item.vehicleId);
    if (existing) {
      // Lịch sử đã sắp xếp mới nhất trước nên lần đầu thấy là lần gần nhất.
      existing.serviceCount += 1;
      continue;
    }

    byVehicle.set(item.vehicleId, {
      id: item.vehicleId,
      plate: item.licensePlate?.trim() || "Chưa có biển số",
      brand: item.vehicleMake?.trim() || "",
      model: item.vehicleModel?.trim() || "",
      serviceCount: 1,
      lastOdometerKm: item.odometerKm,
      lastServiceDate: item.serviceDate,
      totalSpentVND: null,
    });
  }

  return Array.from(byVehicle.values());
}

/** Tên hiển thị gọn của một chiếc xe: "Toyota Vios 1.5G" hoặc biển số. */
export function vehicleLabel(vehicle: MyVehicle): string {
  const parts = [vehicle.brand, vehicle.model].filter(Boolean).join(" ").trim();
  return parts || vehicle.plate;
}
