"use client";

import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";

// Primary action button. Active = navy / cream; disabled = taupe.
// Arrow points in the reading direction (flips for RTL). (CLAUDE.md §5, §8)
export function PrimaryButton({
  labelKey,
  onClick,
  type = "button",
  disabled = false,
  showArrow = true,
}: {
  labelKey: StringKey;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  showArrow?: boolean;
}) {
  const { t, dir } = useLang();
  // In RTL "forward" points left; in LTR it points right.
  const arrow = dir === "rtl" ? "←" : "→";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-aurion px-5 text-[17px] font-bold transition-colors",
        disabled
          ? "cursor-not-allowed bg-line-strong text-[#8A8270]"
          : "bg-navy text-cream hover:bg-navy-deep",
      ].join(" ")}
    >
      <span>{t(labelKey)}</span>
      {showArrow && !disabled ? (
        <span aria-hidden className="text-[18px] leading-none">
          {arrow}
        </span>
      ) : null}
    </button>
  );
}
