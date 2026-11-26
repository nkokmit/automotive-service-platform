/**
 * Types phản ánh response thật của AI services.
 *
 * Nguồn: ai-services/damage-detection-service/app/schemas.py và
 *        ai-services/agent-service/app/routers/chat.py.
 */
import client from "../client";

// ── Damage Detection ──────────────────────────────────────────────────────────

export type DamageClassName =
  | "dent"
  | "scratch"
  | "crack"
  | "glass shatter"
  | "lamp broken"
  | "tire flat"
  | "glass_damage"
  | "lamp_damage"
  | "tire_damage"
  | "rust"
  | "deformation";

export type Severity = "low" | "medium" | "high";
export type OverallSeverity = "none" | "low" | "medium" | "high" | "critical";
export type VehicleSegment = "economy" | "standard" | "suv_mpv" | "luxury";

export interface RecommendedItem {
  id: string;
  name: string;
  item_type: "service" | "part" | string;
  category: string;
  estimated_price_vnd: number;
  link: string;
  reason: string;
}

export interface DamageRegion {
  class_name: DamageClassName | string;
  class_label_vi?: string;
  class_id: number;
  confidence: number;
  /** [x1, y1, x2, y2] đã được chuẩn hoá trong khoảng 0–1. */
  bbox: [number, number, number, number];
  bbox_area_ratio?: number;
  /** Số pixel thực tế của mask phân đoạn hư hỏng. */
  mask_area_px?: number;
  /** Tỉ lệ diện tích hư hỏng thực tế so với toàn bộ ảnh (từ mask segmentation). */
  area_ratio: number;
  /** Diện tích vật lý thực tế ước tính theo cm². */
  estimated_area_cm2?: number;
  /** Kích thước bao tương đương (rộng × cao cm). */
  dimensions_cm_str?: string;
  severity: Severity;
  /** Chi phí chuẩn cơ sở trước khi nhân hệ số dòng xe. */
  base_cost_vnd?: number;
  /** Chi phí sửa chữa ước tính (VNĐ) tính theo diện tích hư hỏng & hệ số dòng xe. */
  estimated_cost_vnd?: number;
  min_cost_vnd?: number;
  max_cost_vnd?: number;
  /** Ghi chú công thức tính giá theo diện tích (cm²) và hệ số dòng xe. */
  unit_price_note?: string;
  /** Đánh giá kỹ thuật và phương án khắc phục đề xuất. */
  repair_recommendation?: string;
}

export interface DetectionResponse {
  success: boolean;
  num_detections: number;
  damages: DamageRegion[];
  overall_severity: OverallSeverity;
  vehicle_info?: string;
  vehicle_segment?: VehicleSegment | string;
  segment_label_vi?: string;
  price_multiplier?: number;
  total_area_ratio?: number;
  total_mask_area_px?: number;
  total_estimated_area_cm2?: number;
  subtotal_cost_vnd?: number;
  combo_discount_vnd?: number;
  combo_discount_note?: string;
  total_estimated_cost_vnd?: number;
  total_min_cost_vnd?: number;
  total_max_cost_vnd?: number;
  recommended_items?: RecommendedItem[];
  overall_assessment?: string;
  /** Câu tóm tắt bằng tiếng Việt do service build sẵn. */
  summary: string;
  image_width: number;
  image_height: number;
  processing_time_ms: number;
  /** Ảnh JPEG đã vẽ mask phân đoạn bán trong suốt + bounding box (dạng base64). */
  annotated_image_base64?: string;
}

// ── Chat (LangGraph ReAct Agent) ──────────────────────────────────────────────

export interface ChatToolCallInfo {
  /** Tên tool được gọi — vd: search_used_cars, check_slots. */
  name: string;
}

export interface ChatResponse {
  session_id: string;
  /** Câu trả lời cuối cùng của agent (tiếng Việt). */
  response: string;
  /** Các tool đã được gọi trong lượt này, không trùng lặp. */
  tool_calls: string[];
  /** Kết quả phân tích diện tích hư hỏng & báo giá nếu người dùng gửi kèm ảnh xe. */
  damage_report?: DetectionResponse | null;
}

// ── API surface ──────────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  session_id?: string;
  user_id?: string;
  image_url?: string;
  image_base64?: string;
  vehicle_brand?: string;
  vehicle_segment?: string;
  /** Bật SSE streaming. Mặc định false — nếu true cần dùng `streamChat()`. */
  stream?: boolean;
}

export const damageApi = {
  /**
   * Upload file trực tiếp tới damage-detection-service.
   * Endpoint backend: `POST /api/v1/detect/upload` (multipart).
   */
  upload(
    file: File,
    confThreshold?: number,
    vehicleBrand?: string,
    vehicleSegment?: string,
  ): Promise<DetectionResponse> {
    const form = new FormData();
    form.append("file", file);
    if (typeof confThreshold === "number") {
      form.append("conf_threshold", String(confThreshold));
    }
    if (vehicleBrand && vehicleBrand.trim()) {
      form.append("vehicle_brand", vehicleBrand.trim());
    }
    if (vehicleSegment && vehicleSegment.trim()) {
      form.append("vehicle_segment", vehicleSegment.trim());
    }
    return client.request<DetectionResponse>("/ai/detect/upload", {
      method: "POST",
      formData: form,
    });
  },

  /**
   * Gửi ảnh từ URL công khai.
   * Endpoint backend: `POST /api/v1/detect` (application/json).
   */
  fromUrl(
    imageUrl: string,
    confThreshold?: number,
    vehicleBrand?: string,
    vehicleSegment?: string,
  ): Promise<DetectionResponse> {
    return client.request<DetectionResponse>("/ai/detect", {
      method: "POST",
      body: {
        image_url: imageUrl,
        ...(typeof confThreshold === "number"
          ? { conf_threshold: confThreshold }
          : {}),
        ...(vehicleBrand ? { vehicle_brand: vehicleBrand } : {}),
        ...(vehicleSegment ? { vehicle_segment: vehicleSegment } : {}),
      },
    });
  },
};

export const agentApi = {
  /**
   * Gửi câu hỏi tới AI Agent. KHÔNG hỗ trợ streaming ở đây — nếu cần SSE,
   * dùng `streamChat()`.
   */
  send(req: ChatRequest): Promise<ChatResponse> {
    if (req.stream) {
      throw new Error(
        "stream=true yêu cầu streamChat() — req này là một lời gọi blocking",
      );
    }
    return client.request<ChatResponse>("/ai/chat", {
      method: "POST",
      body: { ...req, stream: false },
    });
  },

  toMessage(role: "user" | "assistant", content: string, toolCalls: string[] = []) {
    return {
      role,
      content,
      toolCalls,
    };
  },
};
