import { useCallback, useEffect, useState } from "react";
import { IconRefresh, IconStar, IconWrench } from "../../components/icons";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import Card from "../../components/Card";
import { useToast } from "../../components/Toast";
import { workOrderFeedbackApi } from "../../api/endpoints/workOrder";
import type { FeedbackEligibleWorkOrderResponse } from "../../api/types";
import ReviewFormModal, {
  type ReviewFormTarget,
} from "./ReviewFormModal";
import StarRating from "./StarRating";

export default function ReviewsTab() {
  const t = useToast();
  const [items, setItems] = useState<FeedbackEligibleWorkOrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [target, setTarget] = useState<ReviewFormTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await workOrderFeedbackApi.getEligibleWorkOrders(0, 50);
      setItems(page.items ?? []);
    } catch (err) {
      setItems([]);
      setError(
        err instanceof Error
          ? err.message
          : "Không tải được danh sách phiếu sửa chữa cần đánh giá",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = (item: FeedbackEligibleWorkOrderResponse) => {
    setSubmitError(null);
    setTarget({
      workOrderId: item.workOrderId,
      workOrderCode: item.workOrderCode,
    });
  };

  const handleSubmit = async (data: {
    rating: number;
    comment: string | null;
  }) => {
    if (!target) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await workOrderFeedbackApi.submitFeedback(target.workOrderId, data);
      t.success("Cảm ơn bạn đã đánh giá trải nghiệm!");
      setTarget(null);
      await load();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Không gửi được đánh giá",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-bgsoft rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-10 text-center">
          <p className="font-semibold mb-2">
            Không tải được danh sách đánh giá
          </p>
          <p className="text-sm text-ink-light mb-5">{error}</p>
          <Button variant="outline" onClick={() => void load()}>
            <IconRefresh size={14} /> Thử lại
          </Button>
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <div className="p-12 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-bgsoft flex items-center justify-center mb-4">
            <IconStar size={32} className="text-ink-muted" />
          </div>
          <p className="font-semibold text-lg mb-1">Chưa có phiếu chờ đánh giá</p>
          <p className="text-sm text-ink-light mb-5 max-w-sm mx-auto">
            Khi lần sửa chữa của bạn hoàn tất và hóa đơn được thanh toán, bạn
            sẽ được mời đánh giá trải nghiệm tại đây.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        Có{" "}
        <strong className="text-ink">{items.length}</strong> phiếu sửa chữa đã
        hoàn tất đang chờ bạn đánh giá.
      </p>

      {items.map((item) => (
        <Card key={item.workOrderId}>
          <div className="p-4 md:p-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <IconWrench size={20} />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-ink">
                  Phiếu sửa chữa {item.workOrderCode}
                </div>
                <div className="text-xs text-ink-muted mt-0.5">
                  Đã hoàn tất — hãy cho chúng tôi biết trải nghiệm của bạn
                </div>
              </div>
            </div>
            <Button size="sm" onClick={() => openReview(item)}>
              <IconStar size={14} /> Đánh giá
            </Button>
          </div>
        </Card>
      ))}

      {target && (
        <ReviewFormModal
          target={target}
          submitting={submitting}
          error={submitError}
          onClose={() => setTarget(null)}
          onSubmit={(data) => void handleSubmit(data)}
        />
      )}
    </div>
  );
}
