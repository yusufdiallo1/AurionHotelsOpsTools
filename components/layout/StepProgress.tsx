"use client";

import { displayDigits } from "@/lib/digits";
import { useLang } from "@/lib/i18n";

// Numbered step indicator. Active step = gold; completed = gold-deep; upcoming = muted.
// (CLAUDE.md §5, §8)
export function StepProgress({
  steps,
  current,
}: {
  steps: number;
  current: number; // 1-based
}) {
  const { lang } = useLang();

  return (
    <ol className="flex items-center gap-2" aria-label={`Step ${current} of ${steps}`}>
      {Array.from({ length: steps }, (_, i) => {
        const n = i + 1;
        const isActive = n === current;
        const isDone = n < current;
        return (
          <li key={n} className="flex items-center gap-2">
            <span
              aria-current={isActive ? "step" : undefined}
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold transition-colors",
                isActive
                  ? "bg-gold text-navy-deep"
                  : isDone
                    ? "bg-gold-deep text-cream"
                    : "bg-white/15 text-cream/60",
              ].join(" ")}
            >
              {displayDigits(n, lang)}
            </span>
            {n < steps ? (
              <span
                className={[
                  "h-[2px] w-5 rounded-full",
                  n < current ? "bg-gold-deep" : "bg-white/20",
                ].join(" ")}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
