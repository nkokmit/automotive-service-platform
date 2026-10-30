import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconChat,
  IconSend,
  IconSparkles,
  IconUser,
  IconArrowRight,
  IconWarning,
  IconCamera,
  IconClose,
  IconCheck,
  IconWrench,
  IconCar,
} from "../../components/icons";
import Button from "../../components/Button";
import Card from "../../components/Card";
import Badge from "../../components/Badge";
import { chatSuggestions } from "../../data/mock";
import { agentApi } from "../../api/endpoints/ai";
import type {
  ChatRequest,
  DetectionResponse,
  Severity,
} from "../../api/endpoints/ai";

type Tone = "primary" | "warning" | "accent" | "default";

const severityTone: Record<Severity, Tone> = {
  low: "primary",
  medium: "warning",
  high: "accent",
};

const VEHICLE_PRESETS: Array<{
  label: string;
  brand: string;
  segment: string;
}> = [
  {
    label: "Tự động nhận diện dòng xe từ tin nhắn (Mặc định 1.0x)",
    brand: "",
    segment: "",
  },
  {
    label: "Hạng A cỡ nhỏ: Kia Morning / Grand i10 / VF3 / VF5 (Hệ số 0.85x)",
    brand: "Kia Morning / Hạng A",
    segment: "economy",
  },
  {
    label: "Sedan/Hatchback Hạng B–C: Vios / City / Accent / Mazda 3 (Hệ số 1.0x)",
    brand: "Toyota Vios / Sedan Hạng B-C",
    segment: "standard",
  },
  {
    label: "SUV / CUV / Bán tải: Mazda CX-5 / CR-V / VF8 / SantaFe / Ranger (Hệ số 1.3x)",
    brand: "Mazda CX-5 / SUV-CUV",
    segment: "suv_mpv",
  },
  {
    label: "Xe sang Cao cấp: Mercedes / BMW / Lexus / Audi / Porsche (Hệ số 2.2x)",
    brand: "Mercedes-Benz / Xe sang",
    segment: "luxury",
  },
];

const CLASS_LABEL_VI: Record<string, string> = {
  dent: "Móp méo thân vỏ (Dent)",
  scratch: "Trầy xước sơn (Scratch)",
  crack: "Nứt vỡ thân vỏ / cản (Crack)",
  "glass shatter": "Nứt / Vỡ kính xe (Glass Shatter)",
  "lamp broken": "Vỡ / Hư hỏng cụm đèn (Lamp Broken)",
  "tire flat": "Xẹp lốp / Hư hỏng lốp (Tire Flat)",
  glass_damage: "Vỡ kính (Glass)",
  lamp_damage: "Hư đèn (Lamp)",
  tire_damage: "Hư lốp (Tire)",
  rust: "Rỉ sét (Rust)",
  deformation: "Biến dạng khung (Deformation)",
};

const CLASS_COLOR_HEX: Record<string, string> = {
  dent: "#f59e0b",
  scratch: "#eab308",
  crack: "#ec4899",
  "glass shatter": "#06b6d4",
  "lamp broken": "#3b82f6",
  "tire flat": "#ef4444",
  glass_damage: "#06b6d4",
  lamp_damage: "#8b5cf6",
  tire_damage: "#22c55e",
};

function labelVi(className: string, apiLabelVi?: string): string {
  if (apiLabelVi && apiLabelVi.trim()) return apiLabelVi;
  return CLASS_LABEL_VI[className] ?? className;
}

function classColor(className: string): string {
  return CLASS_COLOR_HEX[className] ?? "#0284c7";
}

function formatVND(amount?: number): string {
  if (amount === undefined || amount === null) return "Đang cập nhật";
  return `${amount.toLocaleString("vi-VN")} VNĐ`;
}

function overallTone(severity: DetectionResponse["overall_severity"]): Tone {
  switch (severity) {
    case "critical":
    case "high":
      return "accent";
    case "medium":
      return "warning";
    case "low":
      return "primary";
    case "none":
    default:
      return "default";
  }
}

interface Msg {
  role: "user" | "assistant";
  content: string;
  imagePreviewUrl?: string;
  damageReport?: DetectionResponse | null;
  sources?: Array<{ title: string; url: string }>;
}

function randomUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1400;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.max(1, Math.round(width * scale));
            height = Math.max(1, Math.round(height * scale));
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL("image/jpeg", 0.88);
            const commaIdx = compressed.indexOf(",");
            resolve(commaIdx >= 0 ? compressed.slice(commaIdx + 1) : compressed);
            return;
          }
        } catch {
          // Fallback to original dataUrl if canvas fails
        }
        const commaIdx = dataUrl.indexOf(",");
        resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
      };
      img.onerror = () => {
        const commaIdx = dataUrl.indexOf(",");
        resolve(commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl);
      };
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("Không thể đọc file ảnh."));
    reader.readAsDataURL(file);
  });
}

let sessionId: string = randomUUID();
const SOURCES: Array<{ title: string; url: string }> = [];

const DEFAULT_IMAGE_QUESTION =
  "Phân tích ảnh xe này, lấy ra diện tích bị hư hỏng (cm², %, px) và đưa ra đánh giá kèm giá tiền sửa chữa tương ứng.";

export default function ChatAssistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Xin chào! Tôi là trợ lý AI của AutoCare. Bạn có thể hỏi đáp bảo dưỡng, tìm xe cũ, đặt lịch hẹn hoặc **gửi trực tiếp ảnh xe kèm tên dòng xe** (VD: *Kia Morning, Toyota Vios, Mazda CX-5, Mercedes C200...*) để tôi đo **diện tích hư hỏng thực tế ($\\text{cm}^2$, %, pixel)**, áp dụng **hệ số giá theo phân khúc xe** và báo giá sửa chữa tương ứng ngay lập tức!",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [customVehicleBrand, setCustomVehicleBrand] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const selectImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn định dạng file ảnh (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Kích thước ảnh tối đa là 10MB.");
      return;
    }
    setError(null);
    if (attachedPreview) {
      URL.revokeObjectURL(attachedPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setAttachedFile(file);
    setAttachedPreview(previewUrl);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectImageFile(file);
    }
    e.target.value = "";
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setAttachedPreview(null);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          selectImageFile(file);
          break;
        }
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      selectImageFile(file);
    }
  };

  const send = async (text?: string) => {
    const rawText = (text ?? input).trim();
    const currentFile = attachedFile;
    const currentPreview = attachedPreview;

    if (!rawText && !currentFile) return;

    const preset = VEHICLE_PRESETS[selectedPresetIdx] ?? VEHICLE_PRESETS[0];
    const effectiveBrand =
      customVehicleBrand.trim() || preset.brand || undefined;
    const effectiveSegment = preset.segment || undefined;

    const vehicleTag = effectiveBrand ? ` [Dòng xe: ${effectiveBrand}]` : "";
    const displayContent =
      (rawText ||
        "📷 Phân tích diện tích hư hỏng (cm², %, px) trên ảnh xe này và báo giá sửa chữa tương ứng.") +
      (currentFile && vehicleTag ? vehicleTag : "");
    const effectiveMessage = rawText || DEFAULT_IMAGE_QUESTION;

    const userMsg: Msg = {
      role: "user",
      content: displayContent,
      imagePreviewUrl: currentPreview ?? undefined,
    };

    setMessages((m) => [...m, userMsg]);
    setInput("");
    setAttachedFile(null);
    setAttachedPreview(null);
    setError(null);
    setTyping(true);

    try {
      let imageBase64: string | undefined;
      if (currentFile) {
        imageBase64 = await fileToBase64(currentFile);
      }

      const payload: ChatRequest = {
        message: effectiveMessage,
        session_id: sessionId,
        ...(imageBase64 ? { image_base64: imageBase64 } : {}),
        ...(effectiveBrand ? { vehicle_brand: effectiveBrand } : {}),
        ...(effectiveSegment ? { vehicle_segment: effectiveSegment } : {}),
      };

      const res = await agentApi.send(payload);
      sessionId = res.session_id;
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.response,
          imagePreviewUrl: currentPreview ?? undefined,
          damageReport: res.damage_report ?? null,
          sources: SOURCES,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Agent không phản hồi.";
      setError(msg);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content:
            "Xin lỗi, hiện tại không thể xử lý yêu cầu phân tích. Vui lòng kiểm tra kết nối AI Service và thử lại.",
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  return (
    <div className="container-page py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Title */}
        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
              <IconChat size={22} />
            </div>
            <div>
              <h1 className="font-bold text-xl">
                Trợ lý AI & Định giá Hư hỏng theo Dòng xe & Diện tích
              </h1>
              <p className="text-xs text-ink-muted">
                Đo diện tích hư hỏng thực tế (cm², %, pixel) bằng YOLOv8-seg kết hợp hệ số phân khúc dòng xe & chiết khấu combo
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={typing}
          >
            <IconCamera size={16} />
            <span>Tải ảnh xe cần báo giá</span>
          </Button>
        </div>

        {/* Chat container */}
        <Card>
          <div
            className={`h-[580px] md:h-[700px] flex flex-col relative transition-colors ${
              isDragging ? "bg-primary/5 ring-2 ring-primary rounded-2xl" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {isDragging && (
              <div className="absolute inset-3 z-20 rounded-2xl border-2 border-dashed border-primary bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center pointer-events-none">
                <IconCamera size={42} className="text-primary mb-2" />
                <p className="font-bold text-base text-primary">
                  Thả ảnh xe vào đây để đo diện tích hư hỏng (cm²) & báo giá theo dòng xe
                </p>
                <p className="text-xs text-ink-muted mt-1">
                  Hỗ trợ JPG, PNG, WEBP (tối đa 10MB)
                </p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 1 && (
                <div className="mb-3 space-y-3">
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <IconCamera size={18} />
                      </div>
                      <div className="text-xs">
                        <div className="font-semibold text-ink">
                          Báo giá chính xác theo Diện tích (cm²) & Phân khúc dòng xe
                        </div>
                        <div className="text-ink-muted">
                          Gửi ảnh kèm tên xe (VD: &ldquo;Xe Mazda CX-5 bị móp cửa&rdquo; hoặc chọn phân khúc bên dưới) để AI tự nhân hệ số giá tương ứng.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity shrink-0"
                    >
                      + Chọn ảnh xe
                    </button>
                  </div>

                  <div>
                    <p className="text-xs text-ink-muted mb-2">
                      Hoặc chọn câu hỏi gợi ý:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {chatSuggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="px-3 py-1.5 text-xs rounded-full bg-bgsoft hover:bg-accent text-ink transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  msg={m}
                  onQuickAsk={(q) => send(q)}
                />
              ))}

              {typing && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shrink-0">
                    <IconSparkles size={16} />
                  </div>
                  <div className="bg-bgsoft rounded-2xl rounded-tl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-ink-muted">
                        AI đang đo diện tích phân đoạn (cm²) & tính giá theo dòng xe...
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {error && (
              <div className="mx-5 mb-3 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                <IconWarning size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Preview ảnh đính kèm + Chọn phân khúc dòng xe trước khi gửi */}
            {attachedFile && attachedPreview && (
              <div className="mx-4 mb-2 p-3 rounded-xl bg-bgsoft border border-primary/25 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={attachedPreview}
                      alt="Preview xe"
                      className="w-14 h-14 rounded-lg object-cover border border-ink/10 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-ink truncate">
                          {attachedFile.name}
                        </span>
                        <span className="text-[11px] text-ink-muted shrink-0">
                          ({(attachedFile.size / 1024).toFixed(0)} KB)
                        </span>
                      </div>
                      <p className="text-xs text-primary font-medium mt-0.5">
                        ✨ Sẵn sàng trích xuất diện tích (cm², %, px) & định giá theo dòng xe
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="w-7 h-7 rounded-full bg-white hover:bg-red-50 text-ink-muted hover:text-red-600 flex items-center justify-center border border-ink/10 shrink-0 transition-colors"
                    title="Xoá ảnh đính kèm"
                  >
                    <IconClose size={14} />
                  </button>
                </div>

                {/* Bộ chọn dòng xe / phân khúc xe để nhân hệ số giá chính xác */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-ink/10 items-center">
                  <div className="sm:col-span-7 flex items-center gap-1.5">
                    <IconCar size={16} className="text-primary shrink-0" />
                    <select
                      value={selectedPresetIdx}
                      onChange={(e) =>
                        setSelectedPresetIdx(Number(e.target.value))
                      }
                      className="w-full h-9 px-2.5 rounded-lg border border-ink/15 bg-white text-xs text-ink outline-none focus:border-primary"
                    >
                      {VEHICLE_PRESETS.map((p, idx) => (
                        <option key={idx} value={idx}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-5">
                    <input
                      type="text"
                      value={customVehicleBrand}
                      onChange={(e) => setCustomVehicleBrand(e.target.value)}
                      placeholder="Hoặc nhập tên xe (VD: Mazda CX-5, C200...)"
                      className="w-full h-9 px-3 rounded-lg border border-ink/15 bg-white text-xs text-ink outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="border-t border-ink/8 p-4 flex gap-2 items-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={typing}
                title="Đính kèm ảnh xe để phân tích diện tích hư hỏng & báo giá"
                className={`h-11 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition-colors shrink-0 ${
                  attachedFile
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-ink/15 bg-bgsoft hover:bg-accent/50 text-ink"
                }`}
              >
                <IconCamera size={18} />
                <span className="hidden sm:inline">Gửi ảnh</span>
              </button>

              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={(e) => e.key === "Enter" && !typing && send()}
                placeholder={
                  attachedFile
                    ? "Nhập thêm ghi chú (VD: Xe tôi là Mazda CX-5 bị móp cửa sau) hoặc bấm Phân tích ngay..."
                    : "Nhập câu hỏi hoặc nhấn 'Gửi ảnh' / dán ảnh (Ctrl+V) để đo diện tích & báo giá..."
                }
                className="flex-1 h-11 px-4 rounded-xl border border-ink/15 bg-white outline-none text-sm focus:border-primary"
              />
              <Button
                onClick={() => send()}
                disabled={typing || (!input.trim() && !attachedFile)}
              >
                <IconSend size={16} />
                <span className="hidden sm:inline">
                  {attachedFile ? "Phân tích & Báo giá" : "Gửi"}
                </span>
              </Button>
            </div>
          </div>
        </Card>

        <p className="text-xs text-ink-muted text-center mt-4">
          Định giá tự động kết hợp diện tích phân đoạn thực tế (cm², %, px) từ YOLOv8-seg và hệ số phân khúc dòng xe (Hạng A 0.85x · Hạng B-C 1.0x · SUV/CUV 1.3x · Xe sang 2.2x).
        </p>
      </div>
    </div>
  );
}

function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={idx}>{part}</span>;
  });
}

function MessageBubble({
  msg,
  onQuickAsk,
}: {
  msg: Msg;
  onQuickAsk: (question: string) => void;
}) {
  const isUser = msg.role === "user";
  const [viewMode, setViewMode] = useState<"annotated" | "original">(
    "annotated",
  );

  const report = msg.damageReport;

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={[
          "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          isUser ? "bg-accent text-ink" : "bg-primary text-white",
        ].join(" ")}
      >
        {isUser ? <IconUser size={16} /> : <IconSparkles size={16} />}
      </div>

      <div
        className={[
          "max-w-[90%] md:max-w-[84%] px-4 py-3 rounded-2xl text-sm",
          isUser
            ? "bg-primary text-white rounded-tr-md"
            : "bg-bgsoft text-ink rounded-tl-md border border-ink/5",
        ].join(" ")}
      >
        {/* Nếu là tin nhắn của User có đính kèm ảnh */}
        {isUser && msg.imagePreviewUrl && (
          <div className="mb-2.5 rounded-xl overflow-hidden border border-white/20 max-w-xs">
            <img
              src={msg.imagePreviewUrl}
              alt="Ảnh xe người dùng gửi"
              className="w-full h-auto block object-cover max-h-56"
            />
          </div>
        )}

        {/* Nếu là phản hồi của Assistant có kèm Báo cáo phân tích diện tích hư hỏng & Giá tiền */}
        {!isUser && report && (
          <div className="mb-4 bg-white rounded-xl border border-ink/10 overflow-hidden shadow-sm text-ink">
            {/* Header báo cáo */}
            <div className="px-4 py-3 bg-primary/5 border-b border-ink/10 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm text-primary">
                  🔍 Báo cáo Diện tích Hư hỏng & Định giá AI
                </span>
                <Badge tone={overallTone(report.overall_severity)}>
                  Mức độ: {report.overall_severity.toUpperCase()}
                </Badge>
                {report.vehicle_info && (
                  <span className="text-xs font-semibold bg-white border border-primary/20 text-primary px-2 py-0.5 rounded-md flex items-center gap-1">
                    <IconCar size={12} />
                    {report.vehicle_info} ({report.price_multiplier ?? 1}x)
                  </span>
                )}
              </div>
              <span className="text-[11px] text-ink-muted font-mono">
                {report.image_width}×{report.image_height}px ·{" "}
                {report.processing_time_ms.toFixed(0)}ms
              </span>
            </div>

            <div className="p-3.5 space-y-3.5">
              {/* Ảnh phân đoạn AI vs Ảnh gốc */}
              {(report.annotated_image_base64 || msg.imagePreviewUrl) && (
                <div>
                  {report.annotated_image_base64 && msg.imagePreviewUrl && (
                    <div className="flex gap-1 bg-bgsoft p-1 rounded-lg mb-2 w-fit">
                      <button
                        type="button"
                        onClick={() => setViewMode("annotated")}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          viewMode === "annotated"
                            ? "bg-primary text-white shadow-sm"
                            : "text-ink-light hover:text-ink"
                        }`}
                      >
                        🎨 Ảnh tô màu diện tích (cm² & VNĐ)
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode("original")}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                          viewMode === "original"
                            ? "bg-primary text-white shadow-sm"
                            : "text-ink-light hover:text-ink"
                        }`}
                      >
                        📷 Ảnh gốc
                      </button>
                    </div>
                  )}

                  <div className="relative rounded-xl overflow-hidden border border-ink/10 bg-black/5">
                    {viewMode === "annotated" &&
                    report.annotated_image_base64 ? (
                      <img
                        src={`data:image/jpeg;base64,${report.annotated_image_base64}`}
                        alt="Ảnh phân đoạn hư hỏng AI"
                        className="w-full max-h-80 object-contain mx-auto block"
                      />
                    ) : msg.imagePreviewUrl ? (
                      <img
                        src={msg.imagePreviewUrl}
                        alt="Ảnh gốc"
                        className="w-full max-h-80 object-contain mx-auto block"
                      />
                    ) : null}
                    <div className="absolute bottom-2 right-2 bg-black/75 text-white text-[11px] px-2 py-0.5 rounded font-mono">
                      {report.num_detections} vùng hư hỏng
                    </div>
                  </div>
                </div>
              )}

              {/* Thống kê tổng diện tích (cm², %, px) & Tổng chi phí sửa chữa */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-bgsoft border border-ink/5">
                  <div className="text-[11px] text-ink-muted uppercase font-semibold">
                    Tổng diện tích bị hư hỏng
                  </div>
                  <div className="text-lg font-bold text-ink mt-0.5">
                    ~
                    {(
                      report.total_estimated_area_cm2 ??
                      report.damages.reduce(
                        (acc, d) => acc + (d.estimated_area_cm2 ?? 0),
                        0,
                      )
                    ).toFixed(1)}{" "}
                    cm²{" "}
                    <span className="text-xs font-semibold text-primary">
                      (
                      {(
                        (report.total_area_ratio ??
                          report.damages.reduce(
                            (acc, d) => acc + d.area_ratio,
                            0,
                          )) * 100
                      ).toFixed(2)}
                      %)
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-muted mt-0.5">
                    Tổng điểm ảnh mask:{" "}
                    <strong>
                      {(
                        report.total_mask_area_px ??
                        report.damages.reduce(
                          (acc, d) => acc + (d.mask_area_px ?? 0),
                          0,
                        )
                      ).toLocaleString("vi-VN")}{" "}
                      px
                    </strong>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="text-[11px] text-primary uppercase font-semibold flex items-center justify-between">
                    <span>Tổng chi phí dự kiến</span>
                    {report.price_multiplier && report.price_multiplier !== 1 && (
                      <span className="text-[10px] bg-primary text-white px-1.5 py-0.5 rounded">
                        Hệ số xe {report.price_multiplier}x
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-bold text-primary mt-0.5">
                    {formatVND(report.total_estimated_cost_vnd ?? 0)}
                  </div>
                  {report.combo_discount_vnd && report.combo_discount_vnd > 0 ? (
                    <div className="text-[11px] text-green-700 font-medium mt-0.5">
                      🎁 Đã giảm combo: -{formatVND(report.combo_discount_vnd)}
                    </div>
                  ) : (
                    report.total_min_cost_vnd !== undefined &&
                    report.total_max_cost_vnd !== undefined &&
                    report.total_max_cost_vnd > 0 && (
                      <div className="text-[11px] text-ink-muted mt-0.5">
                        Dao động: {formatVND(report.total_min_cost_vnd)} –{" "}
                        {formatVND(report.total_max_cost_vnd)}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Thông tin phân khúc xe & chiết khấu combo nếu có */}
              {(report.segment_label_vi ||
                (report.combo_discount_vnd &&
                  report.combo_discount_vnd > 0)) && (
                <div className="px-3 py-2 rounded-lg bg-accent/40 border border-ink/5 text-xs space-y-1">
                  {report.segment_label_vi && (
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-ink-light">
                        🚘 Phân khúc định giá:{" "}
                        <strong className="text-ink">
                          {report.vehicle_info}
                        </strong>{" "}
                        — {report.segment_label_vi}
                      </span>
                    </div>
                  )}
                  {report.combo_discount_vnd !== undefined &&
                    report.combo_discount_vnd > 0 && (
                      <div className="text-green-700 font-medium">
                        ✨ {report.combo_discount_note}
                      </div>
                    )}
                </div>
              )}

              {/* Danh sách từng vùng hư hỏng kèm diện tích (cm², %, px) & giá tiền */}
              {report.damages.length === 0 ? (
                <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700 flex items-center gap-2">
                  <IconCheck size={16} />
                  <span>
                    Không phát hiện vết hư hỏng nào trên xe. Chi phí dự kiến: 0 VNĐ.
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-ink flex items-center justify-between">
                    <span>
                      Bảng chi tiết diện tích (cm², %, px) & báo giá từng vùng:
                    </span>
                    <span className="text-[11px] text-ink-muted font-normal">
                      {report.damages.length} vùng hư hỏng
                    </span>
                  </div>
                  {report.damages.map((d, idx) => {
                    const colorHex = classColor(d.class_name);
                    return (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-bgsoft/70 border border-ink/8 space-y-1.5"
                      >
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                              style={{ backgroundColor: colorHex }}
                            >
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-xs text-ink">
                              {labelVi(d.class_name, d.class_label_vi)}
                            </span>
                            <Badge tone={severityTone[d.severity]}>
                              {d.severity.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                              {formatVND(d.estimated_cost_vnd)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-wrap text-[11px] text-ink-muted pl-7">
                          <span>
                            Diện tích:{" "}
                            <strong className="text-ink">
                              ~{(d.estimated_area_cm2 ?? 0).toFixed(1)} cm²
                            </strong>{" "}
                            {d.dimensions_cm_str ? `(${d.dimensions_cm_str})` : ""}
                          </span>
                          <span>
                            Tỷ lệ mask:{" "}
                            <strong className="text-ink">
                              {(d.area_ratio * 100).toFixed(2)}%
                            </strong>{" "}
                            ({(d.mask_area_px ?? 0).toLocaleString("vi-VN")} px)
                          </span>
                          <span>
                            Độ tin cậy: {(d.confidence * 100).toFixed(0)}%
                          </span>
                        </div>

                        {d.unit_price_note && (
                          <div className="text-[11px] text-primary/90 pl-7 font-medium">
                            📐 {d.unit_price_note}
                          </div>
                        )}

                        {d.repair_recommendation && (
                          <div className="text-xs text-ink-light pl-7 pt-0.5 flex items-start gap-1.5">
                            <IconWrench
                              size={13}
                              className="text-primary shrink-0 mt-0.5"
                            />
                            <span>{d.repair_recommendation}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Gợi ý Dịch vụ & Phụ tùng tương ứng trên sàn */}
              {report.recommended_items &&
                report.recommended_items.length > 0 && (
                  <div className="pt-1 space-y-1.5">
                    <div className="text-xs font-semibold text-ink">
                      🛠️ Gói Dịch vụ & Phụ tùng đề xuất tương ứng:
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {report.recommended_items.map((item) => (
                        <Link
                          key={item.id}
                          to={item.link}
                          className="p-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 border border-primary/15 flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-primary truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-ink-muted truncate">
                              {item.reason}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-xs font-bold text-ink">
                              {formatVND(item.estimated_price_vnd)}
                            </div>
                            <div className="text-[10px] text-primary flex items-center justify-end gap-0.5">
                              <span>Xem ngay</span>
                              <IconArrowRight size={10} />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

              {/* Nút hành động nhanh */}
              {report.damages.length > 0 && (
                <div className="pt-1 flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      onQuickAsk(
                        `Kiểm tra lịch trống tại garage vào ngày mai để tôi đặt lịch sửa chữa xe ${report.vehicle_info || ""} theo báo giá vừa phân tích.`,
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                  >
                    <IconWrench size={13} />
                    <span>Đặt lịch sửa chữa trên Chat</span>
                  </button>
                  <Link
                    to="/services?category=S%E1%BB%ADa%20ch%E1%BB%AFa"
                    className="px-3 py-1.5 rounded-lg bg-bgsoft hover:bg-accent text-ink text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <span>Xem danh sách Garage</span>
                    <IconArrowRight size={12} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nội dung văn bản */}
        <div className="whitespace-pre-wrap leading-relaxed">
          {renderFormattedText(msg.content)}
        </div>

        {msg.sources && msg.sources.length > 0 && (
          <div
            className={[
              "mt-3 pt-3 border-t",
              isUser ? "border-white/20" : "border-ink/10",
            ].join(" ")}
          >
            <div className="text-xs opacity-80 mb-1.5">Nguồn tham khảo:</div>
            {msg.sources.map((s, i) => (
              <a
                key={i}
                href={s.url}
                className="flex items-center gap-1 text-xs hover:underline opacity-90"
              >
                <IconArrowRight size={12} /> {s.title}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
