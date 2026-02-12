interface RatingStarsProps {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}

export function RatingStars({ value, onChange, size = "md" }: RatingStarsProps) {
  const starSize = size === "sm" ? "text-sm" : "text-lg";

  return (
    <div className="inline-flex items-center gap-1" aria-label={`Rating ${value} out of 5`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const score = index + 1;
        const isActive = score <= value;

        if (!onChange) {
          return (
            <span
              key={score}
              className={`${starSize} leading-none ${isActive ? "text-[var(--color-accent)]" : "text-[var(--color-line-strong)]"}`}
            >
              {isActive ? "*" : "o"}
            </span>
          );
        }

        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`${starSize} leading-none transition ${isActive ? "text-[var(--color-accent)]" : "text-[var(--color-line-strong)]"}`}
          >
            {isActive ? "*" : "o"}
          </button>
        );
      })}
    </div>
  );
}
