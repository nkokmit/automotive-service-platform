import { IconStar } from "../../components/icons";
import StarRating from "./StarRating";
import { useHomepageReviewSummary } from "./useHomepageReviewSummary";

export default function HomeReviewsSection() {
  const { summary, loading } = useHomepageReviewSummary(5);

  if (loading || !summary || summary.reviewCount === 0) {
    return null;
  }

  return (
    <section className="container-page py-12 md:py-16">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <IconStar size={18} className="text-accent-hover" />
            <span className="text-sm font-semibold text-ink">
              {summary.averageRating.toFixed(2)} / 5
            </span>
            <span className="text-xs text-ink-muted">
              ({summary.reviewCount} đánh giá)
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-ink">
            Khách hàng nói gì về chúng tôi
          </h2>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {summary.recentReviews.map((review, index) => (
          <div
            key={`${review.createdAt}-${index}`}
            className="bg-white border border-ink/8 rounded-2xl shadow-card p-5 flex flex-col"
          >
            <div className="flex items-center gap-1 mb-3">
              <StarRating value={review.rating} size={16} />
            </div>

            {review.comment ? (
              <p className="text-sm text-ink-light flex-1">
                “{review.comment}”
              </p>
            ) : (
              <p className="text-sm text-ink-muted italic flex-1">
                Khách hàng không để lại nhận xét
              </p>
            )}

            {review.completedServices.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {review.completedServices.map((service) => (
                  <span
                    key={service}
                    className="text-[11px] bg-bgsoft text-ink-muted px-2 py-0.5 rounded-md"
                  >
                    {service}
                  </span>
                ))}
              </div>
            )}

            <div className="text-xs text-ink-muted mt-4 pt-3 border-t border-ink/8">
              {new Date(review.createdAt).toLocaleDateString("vi-VN")}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
