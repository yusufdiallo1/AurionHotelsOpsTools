"use client";

import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";

export type SegmentedOption = {
  value: string;
  k: StringKey;
};

// Card-style single-select. Selected = 2px gold ring + tint + bold ink label.
// (CLAUDE.md §5, §8)
export function SegmentedSelect({
  options,
  value,
  onChange,
  columns = 3,
}: {
  options: SegmentedOption[];
  value: string | null;
  onChange: (value: string) => void;
  columns?: 2 | 3;
}) {
  const { t } = useLang();
  const gridCols = columns === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <div className={`grid gap-3 ${gridCols}`}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(opt.value)}
            className={[
              "flex min-h-[52px] items-center justify-center rounded-aurion px-3 text-center text-[15px] transition-colors",
              selected
                ? "border-2 border-gold bg-gold-tint font-bold text-ink"
                : "border border-line bg-paper font-medium text-ink-soft hover:border-line-strong",
            ].join(" ")}
          >
            {t(opt.k)}
          </button>
        );
      })}
    </div>
  );
}
