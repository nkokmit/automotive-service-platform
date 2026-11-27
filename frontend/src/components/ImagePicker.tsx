/**
 * ImagePicker — chọn ảnh từ máy và tải lên kho ảnh của news-service.
 *
 * Luồng:
 *  1. Người dùng bấm "Chọn ảnh" → mở hộp thoại chọn file (input type=file).
 *  2. File được tải lên `POST /api/news-images/upload` (multipart).
 *  3. Backend trả về URL công khai → truyền qua `onChange`.
 *
 * Ảnh được lưu trong kho của news-service (volume Docker `news-uploads`) và
 * phục vụ lại qua `GET /api/news-images/{filename}` — không phụ thuộc dịch vụ
 * bên thứ ba nên hoạt động ổn định và không rò rỉ ảnh ra ngoài.
 */
import { useCallback, useRef, useState } from "react";
import { IconCamera, IconRefresh, IconTrash, IconUpload } from "./icons";
import { newsApi } from "../api/endpoints/news";
import { resolveMediaUrl } from "../api/media";
import { useToast } from "./Toast";

interface Props {
  /** URL ảnh hiện tại (đã lưu) — dùng để hiển thị preview. */
  value: string;
  /** Gọi khi có URL ảnh mới (upload thành công). */
  onChange: (url: string) => void;
  /** Gọi khi người dùng xoá ảnh. */
  onClear?: () => void;
  /** Nhãn nút chọn ảnh. */
  label?: string;
  /** Ẩn nút xoá (dùng khi ảnh là bắt buộc). */
  hideClear?: boolean;
}

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
].join(",");

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export default function ImagePicker({
  value,
  onChange,
  onClear,
  label = "Chọn ảnh",
  hideClear = false,
}: Props) {
  const t = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;

      if (!ACCEPTED_TYPES.split(",").includes(file.type)) {
        t.error("Chỉ hỗ trợ ảnh JPEG, PNG, WEBP hoặc GIF.");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        t.error("Kích thước ảnh tối đa 5 MB.");
        return;
      }

      setUploading(true);
      try {
        const uploaded = await newsApi.uploadImage(file);
        onChange(uploaded.url);
        t.success("Đã tải lên ảnh");
      } catch (err) {
        t.error(
          err instanceof Error ? err.message : "Không tải lên được ảnh",
        );
      } finally {
        setUploading(false);
        // Reset input để chọn lại cùng một file vẫn kích hoạt sự kiện change.
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [onChange, t],
  );

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />

      <div className="flex items-start gap-3">
        {/* Preview */}
        <div className="w-28 h-28 rounded-xl overflow-hidden bg-bgsoft border border-ink/10 shrink-0 flex items-center justify-center">
          {value ? (
            <img
              src={resolveMediaUrl(value)}
              alt="Ảnh đã chọn"
              className="w-full h-full object-cover"
            />
          ) : (
            <IconCamera size={24} className="text-ink-muted" />
          )}
        </div>

        {/* Nút thao tác */}
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 h-9 px-3 text-sm rounded-xl border border-ink/20 text-ink hover:bg-bgsoft hover:border-ink/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {uploading ? (
                <IconRefresh size={14} className="animate-spin" />
              ) : (
                <IconUpload size={14} />
              )}
              {uploading ? "Đang tải lên..." : label}
            </button>

            {!hideClear && value && (
              <button
                type="button"
                onClick={() => onClear?.()}
                className="inline-flex items-center gap-1.5 h-9 px-3 text-sm rounded-xl text-ink-muted hover:bg-red-50 hover:text-red-500 transition-all"
              >
                <IconTrash size={14} />
                Xoá ảnh
              </button>
            )}
          </div>

          <p className="text-xs text-ink-muted">
            JPEG, PNG, WEBP hoặc GIF — tối đa 5 MB. Ảnh được lưu trong hệ
            thống và dùng lại được cho các bài viết khác.
          </p>

          {value && (
            <p className="text-[11px] text-ink-muted break-all">{value}</p>
          )}
        </div>
      </div>
    </div>
  );
}
