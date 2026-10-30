/**
 * Types phản ánh response thật của AI services.
 *
 * Nguồn: ai-services/damage-detection-service/app/schemas.py và
 *        ai-services/agent-service/app/routers/chat.py.
 *
 * Lưu ý:
 *  - AI services KHÔNG bọc response trong ApiResponse<T>. Đây là sai khác
 *    cố ý so với gateway Spring — frontend phải gọi trực tiếp tới AI qua
 *    /ai/* proxy (không qua gateway), nên có 2 envelope khác nhau.
 *  - Cả 2 service đều chạy ở prefix /api/v1 bên trong; Vite proxy sẽ
 *    rewrite /ai/... ↔ /api/v1/... .
 */
import client from "../client";

// ── Damage Detection ──────────────────────────────────────────────────────────

export type DamageClassName =
  | "dent"
  | "scratch"
  | "crack"
  | "glass_damage"
  | "lamp_damage"
  | "tire_damage"
  | "rust"
  | "deformation";

export type Severity = "low" | "medium" | "high";
export type OverallSeverity = "none" | "low" | "medium" | "high" | "critical";

export interface DamageRegion {
  class_name: DamageClassName | string;
  class_id: number;
  confidence: number;
  /** [x1, y1, x2, y2] đã được chuẩn hoá trong khoảng 0–1. */
  bbox: [number, number, number, number];
  /** Tỉ lệ diện tích hư hỏng so với ảnh. */
  area_ratio: number;
  severity: Severity;
}

export interface DetectionResponse {
  success: boolean;
  num_detections: number;
  damages: DamageRegion[];
  overall_severity: OverallSeverity;
  /** Câu tóm tắt bằng tiếng Việt do service build sẵn. */
  summary: string;
  image_width: number;
  image_height: number;
  processing_time_ms: number;
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
}

// ── API surface ──────────────────────────────────────────────────────────────

export interface ChatRequest {
  message: string;
  session_id?: string;
  user_id?: string;
  /** Bật SSE streaming. Mặc định false — nếu true cần dùng `streamChat()`. */
  stream?: boolean;
}

export const damageApi = {
  /**
   * Upload file trực tiếp tới damage-detection-service.
   * Endpoint backend: `POST /api/v1/detect/upload` (multipart).
   */
  upload(file: File, confThreshold?: number): Promise<DetectionResponse> {
    const form = new FormData();
    form.append("file", file);
    if (typeof confThreshold === "number") {
      form.append("conf_threshold", String(confThreshold));
    }
    return client.request<DetectionResponse>("/ai/detect/upload", {
      method: "POST",
      formData: form,
      // Multipart không nên refresh token ở giữa chừng — set timeout qua AbortSignal
      // là việc của component, mặc định client không có timeout.
    });
  },

  /**
   * Gửi ảnh từ URL công khai.
   * Endpoint backend: `POST /api/v1/detect` (application/json).
   */
  fromUrl(imageUrl: string, confThreshold?: number): Promise<DetectionResponse> {
    return client.request<DetectionResponse>("/ai/detect", {
      method: "POST",
      body: {
        image_url: imageUrl,
        ...(typeof confThreshold === "number"
          ? { conf_threshold: confThreshold }
          : {}),
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

  /**
   * Helper biến kết quả từ agent thành cấu trúc phù hợp `Msg` của component.
   * Tách riêng để dễ mock khi test.
   */
  toMessage(role: "user" | "assistant", content: string, toolCalls: string[] = []) {
    return {
      role,
      content,
      // `tool_calls` được backend trả về — không phải trích dẫn nguồn.
      // UI hiện tại dùng `sources` riêng nên tạm không gắn vào.
      toolCalls,
    };
  },
};