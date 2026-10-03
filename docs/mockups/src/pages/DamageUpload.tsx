import { useState } from "react";
import { Link } from "react-router-dom";
import {
  IconCamera,
  IconUpload,
  IconSparkles,
  IconCheck,
  IconArrowRight,
} from "../components/icons";
import Card from "../components/Card";
import Button from "../components/Button";
import Badge from "../components/Badge";

type AnalysisResult = {
  detections: Array<{
    type: string;
    confidence: number;
    location: string;
    severity: "nhẹ" | "trung bình" | "nặng";
  }>;
  estimatedCost: [number, number];
};

const mockAnalysis = (): AnalysisResult => ({
  detections: [
    {
      type: "Trầy xước",
      confidence: 0.94,
      location: "Cánh cửa trước bên trái",
      severity: "nhẹ",
    },
    {
      type: "Móp",
      confidence: 0.87,
      location: "Cản sau",
      severity: "trung bình",
    },
    {
      type: "Vỡ đèn",
      confidence: 0.92,
      location: "Đèn hậu phải",
      severity: "nặng",
    },
  ],
  estimatedCost: [2500000, 4500000],
});

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN").format(n) + "đ";

export default function DamageUpload() {
  const [stage, setStage] = useState<
    "upload" | "analyzing" | "result"
  >("upload");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  };

  const handleAnalyze = () => {
    setStage("analyzing");
    setTimeout(() => {
      setResult(mockAnalysis());
      setStage("result");
    }, 1800);
  };

  const handleReset = () => {
    setPreview(null);
    setResult(null);
    setStage("upload");
  };

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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-lg">Kết quả phân tích</h2>
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Phân tích ảnh khác
                  </Button>
                </div>
                {preview && (
                  <div className="aspect-video rounded-2xl overflow-hidden bg-bgsoft mb-5 relative">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    {/* Mock bounding boxes */}
                    {result.detections.map((_, i) => (
                      <div
                        key={i}
                        className="absolute border-2 border-accent-hover rounded-md"
                        style={{
                          left: `${15 + i * 22}%`,
                          top: `${30 + (i % 2) * 25}%`,
                          width: `${18 + (i % 3) * 5}%`,
                          height: `${25 + (i % 2) * 10}%`,
                        }}
                      >
                        <span className="absolute -top-5 left-0 bg-accent-hover text-ink text-[10px] font-bold px-1.5 py-0.5 rounded">
                          {i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  {result.detections.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl bg-bgsoft"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold">{d.type}</span>
                          <Badge
                            tone={
                              d.severity === "nhẹ"
                                ? "primary"
                                : d.severity === "trung bình"
                                  ? "warning"
                                  : "accent"
                            }
                          >
                            {d.severity}
                          </Badge>
                        </div>
                        <div className="text-xs text-ink-muted">
                          {d.location}
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
              </div>
            </Card>

            <Card>
              <div className="p-6 bg-bgsoft rounded-2xl">
                <div className="flex items-start gap-3">
                  <IconSparkles size={22} className="text-primary mt-1" />
                  <div className="flex-1">
                    <div className="text-sm text-ink-muted">Chi phí sửa chữa ước tính</div>
                    <div className="text-xl md:text-2xl font-bold text-primary">
                      {formatVND(result.estimatedCost[0])} - {formatVND(result.estimatedCost[1])}
                    </div>
                    <p className="text-xs text-ink-muted mt-1">
                      * Ước tính dựa trên giá thị trường, có thể thay đổi tuỳ garage.
                    </p>
                  </div>
                </div>
                <Link to="/garages?service=S%E1%BB%ADa%20ch%E1%BB%AFa">
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
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-ink/8">
                    <span className="text-ink-light">Phân tích hôm nay · 09:14</span>
                    <Badge>3 vấn đề phát hiện</Badge>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-ink/8">
                    <span className="text-ink-light">28/09/2026 · 15:22</span>
                    <Badge>1 vấn đề phát hiện</Badge>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}