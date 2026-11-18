import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconCamera,
  IconUpload,
  IconSparkles,
  IconCheck,
  IconArrowRight,
  IconWarning,
  IconCar,
} from "../../components/icons";
import Card from "../../components/Card";
import Button from "../../components/Button";
import Badge from "../../components/Badge";
import { damageApi } from "../../api/endpoints/ai";
import type { DetectionResponse, Severity } from "../../api/endpoints/ai";

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
    label: "Sedan / Hatchback phổ thông Hạng B–C: Vios / City / Accent / Mazda 3 (Hệ số 1.0x)",
    brand: "Toyota Vios / Sedan Hạng B-C",
    segment: "standard",
  },
  {
    label: "Xe cỡ nhỏ Hạng A: Kia Morning / Grand i10 / VF3 / VF5 (Hệ số 0.85x)",
    brand: "Kia Morning / Hạng A",
    segment: "economy",
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
  dent: "#ffd700",
  scratch: "#ff8c00",
  crack: "#e60000",
  "glass shatter": "#00c8ff",
  "lamp broken": "#3b82f6",
  "tire flat": "#ef4444",
  glass_damage: "#00c8ff",
  lamp_damage: "#b432c8",
  tire_damage: "#32b432",
  rust: "#a05a1e",
  deformation: "#dc00b4",
};

function labelVi(className: string, apiLabelVi?: string): string {
  if (apiLabelVi && apiLabelVi.trim()) return apiLabelVi;
  return CLASS_LABEL_VI[className] ?? className;
}

function formatVND(amount?: number): string {
  if (amount === undefined || amount === null) return "0 VNĐ";
  return `${amount.toLocaleString("vi-VN")} VNĐ`;
}

function classColor(className: string): string {
  return CLASS_COLOR_HEX[className] ?? "#00c8ff";
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

export default function DamageUpload() {
  const [stage, setStage] = useState<"upload" | "analyzing" | "result">("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
  const [customBrand, setCustomBrand] = useState<string>("");
  const [viewMode, setViewMode] = useState<"annotated" | "original">("annotated");
  const [showBoxesOnOriginal, setShowBoxesOnOriginal] = useState<boolean>(true);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn file ảnh (JPG, PNG, WEBP).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Ảnh tối đa 10MB.");
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    setPickedFile(file);
  };

  const handleAnalyze = async () => {
    if (!pickedFile) return;
    setStage("analyzing");
    setError(null);
    const preset = VEHICLE_PRESETS[selectedPresetIdx] ?? VEHICLE_PRESETS[0];
    const effectiveBrand = customBrand.trim() || preset.brand;
    const effectiveSegment = customBrand.trim() ? undefined : preset.segment;

    try {
      const res = await damageApi.upload(
        pickedFile,
        0.25,
        effectiveBrand,
        effectiveSegment,
      );
      setResult(res);
      setViewMode(res.annotated_image_base64 ? "annotated" : "original");
      setStage("result");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Phân tích thất bại. Vui lòng thử lại.",
      );
      setStage("upload");
    }
  };

  const handleReset = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPickedFile(null);
    setResult(null);
    setError(null);
    setStage("upload");
    setViewMode("annotated");
  };

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  return (
    <div className="container-page py-8 md:py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary text-white items-center justify-center mb-4">
            <IconCamera size={28} />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            Phân tích Diện tích Hư hỏng (cm²) & Báo giá theo Dòng xe
          </h1>
          <p className="text-ink-light max-w-lg mx-auto">
            Mô hình YOLOv8-seg tự động đo diện tích thực tế (cm², %, pixel), áp dụng hệ số phân khúc dòng xe và tính chiết khấu combo sửa chữa.
          </p>
        </div>

        {stage === "upload" && (
          <Card>
            <div className="p-6 md:p-10">
              {/* Chọn dòng xe trước khi phân tích */}
              <div className="mb-6 p-4 rounded-2xl bg-bgsoft border border-ink/10 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <IconCar size={18} className="text-primary" />
                  <span>Chọn phân khúc hoặc nhập tên dòng xe để định giá chính xác:</span>
                </div>
                <div className="grid sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-7">
                    <select
                      value={selectedPresetIdx}
                      onChange={(e) => setSelectedPresetIdx(Number(e.target.value))}
                      className="w-full h-10 px-3 rounded-xl border border-ink/15 bg-white text-xs text-ink outline-none focus:border-primary"
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
                      value={customBrand}
                      onChange={(e) => setCustomBrand(e.target.value)}
                      placeholder="Hoặc nhập tên xe (VD: Mazda CX-5, C300...)"
                      className="w-full h-10 px-3 rounded-xl border border-ink/15 bg-white text-xs text-ink outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <label
                htmlFor="file-upload"
                className="block border-2 border-dashed border-ink/20 rounded-2xl p-10 text-center cursor-pointer hover:bg-bgsoft hover:border-primary transition-colors"
              >
                <IconUpload size={48} className="text-primary mx-auto mb-4" />
                <p className="font-medium mb-1">
                  Kéo thả ảnh vào đây hoặc nhấn để chọn
                </p>
                <p className="text-sm text-ink-muted">
                  Hỗ trợ JPG, PNG · Tối đa 10MB
                </p>
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>

              {error && (
                <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
                  <IconWarning size={16} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {preview && (
                <div className="mt-6">
                  <div className="aspect-video rounded-2xl overflow-hidden bg-bgsoft mb-4">
                    <img
                      src={preview}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAnalyze} fullWidth>
                      <IconSparkles size={16} />
                      Đo diện tích (cm²) & Báo giá theo dòng xe ngay
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      Chọn lại
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-ink/10">
                <h3 className="font-semibold text-sm mb-3">
                  Mẹo để đo diện tích (cm²) chính xác nhất
                </h3>
                <ul className="grid sm:grid-cols-2 gap-2 text-sm text-ink-light">
                  {[
                    "Chụp ảnh rõ nét, đủ sáng ở khoảng cách 1 – 1.5m",
                    "Chụp cận cảnh vết trầy xước, móp méo",
                    "Chọn đúng dòng xe để áp dụng đúng hệ số vật tư",
                    "Tránh bóng đổ gắt che vết hư hỏng",
                  ].map((t) => (
                    <li key={t} className="flex items-start gap-2">
                      <span className="w-4 h-4 mt-0.5 rounded-full bg-accent text-ink flex items-center justify-center shrink-0">
                        <IconCheck size={10} />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {stage === "analyzing" && (
          <Card>
            <div className="p-10 text-center">
              {preview && (
                <div className="aspect-video rounded-2xl overflow-hidden bg-bgsoft mb-6 max-w-md mx-auto">
                  <img src={preview} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="inline-flex w-16 h-16 rounded-full bg-accent items-center justify-center mb-4 animate-pulse">
                <IconSparkles size={28} className="text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                AI đang đo diện tích phân đoạn (cm²) & tính giá theo dòng xe...
              </h3>
              <p className="text-sm text-ink-light">
                Đang giải mã ONNX mask prototype, quy đổi diện tích cm² và áp dụng hệ số phân khúc xe (~1-2 giây)
              </p>
            </div>
          </Card>
        )}

        {stage === "result" && result && (
          <div className="space-y-5">
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-semibold text-lg">Kết quả phân tích & định giá AI</h2>
                    <Badge tone={overallTone(result.overall_severity)}>
                      Mức độ: {result.overall_severity.toUpperCase()}
                    </Badge>
                    {result.vehicle_info && (
                      <span className="text-xs font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <IconCar size={14} />
                        {result.vehicle_info} (Hệ số {result.price_multiplier ?? 1}x)
                      </span>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Phân tích ảnh khác
                  </Button>
                </div>

                <p className="text-sm text-ink-light mb-4">{result.summary}</p>

                {/* Thanh chuyển đổi chế độ xem */}
                <div className="flex items-center justify-between bg-bgsoft p-1.5 rounded-xl mb-3 flex-wrap gap-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("annotated")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === "annotated"
                          ? "bg-primary text-white shadow-sm"
                          : "text-ink-light hover:text-ink hover:bg-white/50"
                      }`}
                    >
                      🎨 Ảnh AI tô màu diện tích (cm² & VNĐ)
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("original")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        viewMode === "original"
                          ? "bg-primary text-white shadow-sm"
                          : "text-ink-light hover:text-ink hover:bg-white/50"
                      }`}
                    >
                      📷 Ảnh gốc ban đầu
                    </button>
                  </div>

                  {viewMode === "original" && (
                    <label className="flex items-center gap-2 text-xs text-ink-light cursor-pointer select-none px-2">
                      <input
                        type="checkbox"
                        checked={showBoxesOnOriginal}
                        onChange={(e) => setShowBoxesOnOriginal(e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>Hiện khung vị trí</span>
                    </label>
                  )}
                </div>

                {/* Khung hiển thị ảnh kết quả */}
                <div className="relative rounded-2xl overflow-hidden bg-bgsoft mb-5 border border-ink/10 shadow-sm">
                  {viewMode === "annotated" && result.annotated_image_base64 ? (
                    <div>
                      <img
                        src={`data:image/jpeg;base64,${result.annotated_image_base64}`}
                        alt="Ảnh phân đoạn tô màu AI"
                        className="w-full h-auto block"
                      />
                      <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur text-white text-[11px] px-2.5 py-1 rounded-md font-mono">
                        YOLOv8s-seg · {result.num_detections} vùng phân đoạn
                      </div>
                    </div>
                  ) : preview ? (
                    <div className="relative">
                      <img
                        src={preview}
                        alt="Ảnh gốc"
                        className="w-full h-auto block"
                      />
                      {showBoxesOnOriginal &&
                        result.damages.map((d, i) => {
                          const [x1, y1, x2, y2] = d.bbox;
                          const borderColor = classColor(d.class_name);
                          return (
                            <div
                              key={i}
                              className="absolute border-2 rounded-md pointer-events-none transition-all"
                              style={{
                                borderColor: borderColor,
                                left: `${x1 * 100}%`,
                                top: `${y1 * 100}%`,
                                width: `${(x2 - x1) * 100}%`,
                                height: `${(y2 - y1) * 100}%`,
                              }}
                            >
                              <span
                                className="absolute -top-5 left-0 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow"
                                style={{ backgroundColor: borderColor }}
                              >
                                #{i + 1} {labelVi(d.class_name, d.class_label_vi)}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  ) : null}
                </div>

                {/* Bảng chi tiết từng vùng phân đoạn hư hỏng */}
                {result.damages.length === 0 ? (
                  <div className="p-6 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 flex items-start gap-2">
                    <IconCheck size={18} className="mt-0.5 shrink-0" />
                    Không phát hiện hư hỏng rõ ràng trên ảnh. Vui lòng thử ảnh ở góc khác hoặc chụp cận hơn.
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold text-sm mb-3 flex items-center justify-between flex-wrap gap-2">
                      <span>Chi tiết diện tích (cm², %, px) & đơn giá từng vùng</span>
                      <span className="text-xs text-ink-muted font-normal">
                        {result.segment_label_vi}
                      </span>
                    </h3>

                    <div className="space-y-3">
                      {result.damages.map((d, i) => {
                        const colorHex = classColor(d.class_name);
                        return (
                          <div
                            key={i}
                            className="flex items-start gap-3 p-3.5 rounded-xl bg-bgsoft border border-ink/5 hover:border-primary/20 transition-all"
                          >
                            <div
                              className="w-8 h-8 rounded-full text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-sm mt-0.5"
                              style={{ backgroundColor: colorHex }}
                            >
                              {i + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-sm">
                                  {labelVi(d.class_name, d.class_label_vi)}
                                </span>
                                <Badge tone={severityTone[d.severity]}>
                                  Mức độ: {d.severity}
                                </Badge>
                                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                                  Diện tích: ~{(d.estimated_area_cm2 ?? 0).toFixed(1)} cm² ({(d.area_ratio * 100).toFixed(2)}%)
                                </span>
                                {d.estimated_cost_vnd !== undefined && (
                                  <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-md">
                                    Giá dự kiến: {formatVND(d.estimated_cost_vnd)}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-ink-muted flex items-center gap-3 flex-wrap">
                                {d.dimensions_cm_str && (
                                  <span>
                                    Kích thước: <strong>{d.dimensions_cm_str}</strong>
                                  </span>
                                )}
                                <span>
                                  Mask pixel:{" "}
                                  <strong>
                                    {d.mask_area_px
                                      ? d.mask_area_px.toLocaleString("vi-VN")
                                      : "N/A"}{" "}
                                    px
                                  </strong>
                                </span>
                                {d.min_cost_vnd !== undefined &&
                                  d.max_cost_vnd !== undefined && (
                                    <span>
                                      Khoảng giá: {formatVND(d.min_cost_vnd)} –{" "}
                                      {formatVND(d.max_cost_vnd)}
                                    </span>
                                  )}
                              </div>
                              {d.unit_price_note && (
                                <p className="text-xs text-primary font-medium mt-1">
                                  📐 {d.unit_price_note}
                                </p>
                              )}
                              {d.repair_recommendation && (
                                <p className="text-xs text-ink-light mt-1">
                                  🔧 {d.repair_recommendation}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[11px] text-ink-muted">Độ tin cậy</div>
                              <div className="font-bold text-sm text-primary">
                                {(d.confidence * 100).toFixed(0)}%
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-ink/10 text-xs text-ink-muted flex justify-between flex-wrap gap-2">
                  <span>
                    Độ phân giải: <strong>{result.image_width}×{result.image_height} px</strong>
                  </span>
                  <span>
                    Thời gian suy luận ONNX: <strong>{result.processing_time_ms.toFixed(0)} ms</strong>
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6 bg-bgsoft rounded-2xl space-y-4">
                <div className="flex items-start gap-3">
                  <IconSparkles size={22} className="text-primary mt-1" />
                  <div className="flex-1">
                    <div className="text-sm text-ink-muted">
                      {result.vehicle_info} · Phát hiện {result.num_detections} vùng hư hỏng · Tổng diện tích: ~
                      {(result.total_estimated_area_cm2 ?? 0).toFixed(1)} cm² (
                      {(
                        (result.total_area_ratio ??
                          result.damages.reduce((s, d) => s + d.area_ratio, 0)) *
                        100
                      ).toFixed(2)}
                      %)
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-primary mt-0.5">
                      Tổng chi phí sửa chữa ước tính:{" "}
                      {formatVND(result.total_estimated_cost_vnd ?? 0)}
                    </div>
                    {result.combo_discount_vnd !== undefined &&
                      result.combo_discount_vnd > 0 && (
                        <div className="text-xs font-semibold text-green-700 mt-1">
                          🎁 {result.combo_discount_note}
                        </div>
                      )}
                    {result.total_min_cost_vnd !== undefined &&
                      result.total_max_cost_vnd !== undefined &&
                      result.total_max_cost_vnd > 0 && (
                        <div className="text-xs font-medium text-ink-light mt-0.5">
                          Khoảng giá tham khảo: {formatVND(result.total_min_cost_vnd)} –{" "}
                          {formatVND(result.total_max_cost_vnd)}
                        </div>
                      )}
                  </div>
                </div>

                {result.recommended_items && result.recommended_items.length > 0 && (
                  <div className="pt-2 border-t border-ink/10 space-y-2">
                    <div className="text-xs font-semibold text-ink">
                      🛠️ Gói Dịch vụ & Phụ tùng khuyến nghị trên sàn:
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {result.recommended_items.map((item) => (
                        <Link
                          key={item.id}
                          to={item.link}
                          className="p-3 rounded-xl bg-white hover:bg-primary/5 border border-ink/10 flex items-center justify-between gap-2 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-primary truncate">
                              {item.name}
                            </div>
                            <div className="text-[11px] text-ink-muted truncate">
                              {item.category} · {formatVND(item.estimated_price_vnd)}
                            </div>
                          </div>
                          <IconArrowRight size={14} className="text-primary shrink-0" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <Link to="/services?category=S%E1%BB%ADa%20ch%E1%BB%AFa" className="block">
                  <Button fullWidth size="lg">
                    Tìm garage sửa chữa gần bạn
                    <IconArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
