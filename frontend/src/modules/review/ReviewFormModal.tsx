import { useState } from "react";
import { IconClose, IconWrench } from "../../components/icons";
import Button from "../../components/Button";
import StarRating from "./StarRating";

/** Nhãn mô tả mức điểm — giúp khách hiểu mình đang chọn gì. */
const RATING_LABELS: Record<number, string> = {
  1: "Rất không hài lòng",
  2: "Không hài lòng",
  3: "Bình thường",
  4: "Hài lòng",
  5: "Rất hài lòng",
};

/** Backend chặn comment dài hơn 1000 ký tự (`@Size(max = 1000)`). */
const MAX_COMMENT_LENGTH = 1000;

export interface ReviewFormTarget {
  workOrderId: string;
  workOrderCode: string;
}

export default function ReviewFormModal({
  target,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  target: ReviewFormTarget;
  submitting: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (data: { rating: number; comment: string | null }) => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [touched, setTouched] = useState(false);

  const ratingError = touched && rating === 0 ? "Vui lòng chọn số sao" : null;
  const commentTooLong = comment.length > MAX_COMMENT_LENGTH;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (rating === 0 || commentTooLong) return;
    onSubmit({
      rating,
      comment: comment.trim() ? comment.trim() : null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-cardHover w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-ink/10">
          <div>
            <h3 className="font-semibold text-ink">Đánh giá trải nghiệm</h3>
            <p className="text-xs text-ink-muted mt-0.5">
              Phiếu sửa chữa{" "}
              <span className="font-mono font-medium text-ink">
                {target.workOrderCode}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="text-ink-muted hover:text-ink transition-colors"
          >
            <IconClose size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          <div>
            <label className="text-sm font-medium text-ink mb-2 block">
              Bạn hài lòng với dịch vụ này?
            </label>
            <div className="flex items-center gap-3 flex-wrap">
              <StarRating value={rating} onChange={setRating} size={34} />
              {rating > 0 && (
                <span className="text-sm text-ink-light">
                  {RATING_LABELS[rating]}
                </span>
              )}
            </div>
            {ratingError && (
              <p className="text-xs text-red-500 mt-2">{ratingError}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="review-comment"
              className="text-sm font-medium text-ink mb-2 block"
            >
              Nhận xét của bạn{" "}
              <span className="text-ink-muted font-normal">(không bắt buộc)</span>
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              maxLength={MAX_COMMENT_LENGTH}
              placeholder="Chia sẻ trải nghiệm của bạn về dịch vụ, thời gian và kỹ thuật viên..."
              className="w-full px-3 py-2.5 rounded-xl border border-ink/15 focus:border-primary outline-none text-sm resize-y"
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-xs text-ink-muted">
                {commentTooLong
                  ? `Tối đa ${MAX_COMMENT_LENGTH} ký tự`
                  : "Nhận xét sẽ hiển thị công khai"}
              </span>
              <span className="text-xs text-ink-muted">
                {comment.length}/{MAX_COMMENT_LENGTH}
              </span>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 text-sm rounded-xl px-3 py-2.5">
              <IconWrench size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Huỷ
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang gửi..." : "Gửi đánh giá"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
