import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  IconCamera,
  IconUpload,
  IconSparkles,
  IconCheck,
  IconArrowRight,
  IconWarning,
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

/** Ánh xạ các class_name phổ biến sang label tiếng Việt hiển thị trên UI.
 *  Nếu backend đổi / thêm class mới mà chưa có ở đây → fallback sang raw name. */
const CLASS_LABEL_VI: Record<string, string> = {
  dent: "Móp",
  scratch: "Trầy xước",
  crack: "Nứt / Vỡ",
  glass_damage: "Vỡ kính",
  lamp_damage: "Hư đèn",
  tire_damage: "Hư lốp",
  rust: "Rỉ sét",
  deformation: "Biến dạng",
};

function labelVi(className: string): string {
  return CLASS_LABEL_VI[className] ?? className;
}

function overallTone(severity: DetectionResponse["overall_severity"]): Tone {
  switch (severity) {
    case "critical":
      return "accent";
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
  const [stage, setStage] = useState<
    "upload" | "analyzing" | "result"
  >("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DetectionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickedFile, setPickedFile] = useState<File | null>(null);

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
    // URL.createObjectURL cần được revoke khi không còn dùng để tránh leak.
    const url = URL.createObjectURL(file);
    setPreview(url);
    setPickedFile(file);
  };

  const handleAnalyze = async () => {
    if (!pickedFile) return;
    setStage("analyzing");
    setError(null);
    try {
      const res = await damageApi.upload(pickedFile, 0.25);
      setResult(res);
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
  };

  // Cleanup khi component unmount giữa chừng.
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
            Phân tích hư hỏng bằng AI
          </h1>
          <p className="text-ink-light max-w-lg mx-auto">
            Upload ảnh xe, AI sẽ tự động phát hiện các vết trầy xước, móp, vỡ
            và gợi ý chi phí sửa chữa ước tính.
          </p>
        </div>

        {stage === "upload" && (
          <Card>
            <div className="p-6 md:p-10">
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
                      Phân tích ngay
                    </Button>
                    <Button variant="outline" onClick={handleReset}>
                      Chọn lại
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-ink/10">
                <h3 className="font-semibold text-sm mb-3">
                  Mẹo để có kết quả tốt nhất
                </h3>
                <ul className="grid sm:grid-cols-2 gap-2 text-sm text-ink-light">
                  {[
                    "Chụp ảnh rõ nét, đủ sáng",
                    "Chụp nhiều góc (trước, sau, hai bên)",
                    "Tránh bóng đổ che vết hư hỏng",
                    "Khoảng cách 1-2m từ xe",
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
                AI đang phân tích ảnh của bạn...
              </h3>
              <p className="text-sm text-ink-light">
                Thường mất khoảng 10-15 giây
              </p>
              <div className="mt-6 flex justify-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          </Card>
        )}

        {stage === "result" && result && (
          <div className="space-y-5">
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <h2 className="font-semibold text-lg">Kết quả phân tích</h2>
                    <Badge tone={overallTone(result.overall_severity)}>
                      Tổng thể: {result.overall_severity}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Phân tích ảnh khác
                  </Button>
                </div>
                <p className="text-sm text-ink-light mb-4">{result.summary}</p>
                {preview && (
                  <div className="relative rounded-2xl overflow-hidden bg-bgsoft mb-5">
                    <img
                      src={preview}
                      alt="Kết quả phân tích"
                      className="w-full h-auto block"
                    />
                    {/* Bounding box thật từ backend. bbox đã được chuẩn hoá 0-1
                       nên nhân với kích thước thật của ảnh hiển thị. */}
                    {result.damages.map((d, i) => {
                      const [x1, y1, x2, y2] = d.bbox;
                      // Service trả về kích thước ảnh gốc (image_width/height)
                      // nhưng UI hiển thị ảnh theo kích thước chứa (object-contain
                      // hoặc object-cover). Dùng tỉ lệ bbox là đủ rồi vì img
                      // sẽ được browser scale theo container.
                      return (
                        <div
                          key={i}
                          className="absolute border-2 border-accent-hover rounded-md pointer-events-none"
                          style={{
                            left: `${x1 * 100}%`,
                            top: `${y1 * 100}%`,
                            width: `${(x2 - x1) * 100}%`,
                            height: `${(y2 - y1) * 100}%`,
                          }}
                        >
                          <span className="absolute -top-5 left-0 bg-accent-hover text-ink text-[10px] font-bold px-1.5 py-0.5 rounded">
                            {i + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {result.damages.length === 0 ? (
                  <div className="p-6 rounded-xl bg-green-50 border border-green-200 text-sm text-green-700 flex items-start gap-2">
                    <IconCheck size={18} className="mt-0.5 shrink-0" />
                    Không phát hiện hư hỏng rõ ràng trên ảnh. Vui lòng thử ảnh ở
                    góc khác hoặc chụp cận hơn.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {result.damages.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 rounded-xl bg-bgsoft"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <span className="font-semibold">
                              {labelVi(d.class_name)}
                            </span>
                            <Badge tone={severityTone[d.severity]}>
                              {d.severity}
                            </Badge>
                            <span className="text-xs text-ink-muted">
                              {(d.area_ratio * 100).toFixed(1)}% diện tích
                            </span>
                          </div>
                          <div className="text-xs text-ink-muted">
                            Class: <code>{d.class_name}</code>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-xs text-ink-muted">Tin cậy</div>
                          <div className="font-semibold text-primary">
                            {(d.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 text-xs text-ink-muted flex justify-between">
                  <span>
                    Ảnh gốc: {result.image_width}×{result.image_height} px
                  </span>
                  <span>Xử lý: {result.processing_time_ms.toFixed(0)}ms</span>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-6 bg-bgsoft rounded-2xl">
                <div className="flex items-start gap-3">
                  <IconSparkles size={22} className="text-primary mt-1" />
                  <div className="flex-1">
                    <div className="text-sm text-ink-muted">
                      Phát hiện {result.num_detections} vấn đề
                    </div>
                    <div className="text-xl md:text-2xl font-bold text-primary">
                      Mức độ: {result.overall_severity}
                    </div>
                    <p className="text-xs text-ink-muted mt-1">
                      Gợi ý: gửi kết quả này cho garage để nhận báo giá chính xác.
                    </p>
                  </div>
                </div>
                <Link to="/services?category=S%E1%BB%ADa%20ch%E1%BB%AFa">
                  <Button fullWidth size="lg" className="mt-4">
                    Tìm garage sửa chữa gần bạn
                    <IconArrowRight size={16} />
                  </Button>
                </Link>
              </div>
            </Card>

            <Card hover={false}>
              <div className="p-5">
                <h3 className="font-semibold mb-3">Lịch sử phân tích</h3>
                <div className="text-xs text-ink-muted">
                  Backend hiện chưa có API lịch sử (sẽ thuộc commerce-service
                  hoặc notification-service sau khi các service đó được tích hợp).
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}