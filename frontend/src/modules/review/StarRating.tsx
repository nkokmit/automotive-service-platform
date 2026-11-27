import { useState } from "react";
import { IconStar } from "../../components/icons";

export default function StarRating({
  value,
  onChange,
  size = 32,
}: {
  value: number;
  onChange?: (next: number) => void;
  size?: number;
}) {
  const [hovered, setHovered] = useState(0);
  const shown = hovered || value;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!onChange}
          aria-label={`${star} sao`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={
            onChange
              ? "transition-transform hover:scale-110 cursor-pointer"
              : "cursor-default"
          }
        >
          <IconStar
            size={size}
            className={
              star <= shown ? "text-accent-hover" : "text-ink/15"
            }
          />
        </button>
      ))}
    </div>
  );
}
