"use client";

import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";

// Renders a field label in the active language. (CLAUDE.md §8)
export function FieldLabel({
  k,
  htmlFor,
}: {
  k: StringKey;
  htmlFor?: string;
}) {
  const { t } = useLang();
  return (
    <label
      htmlFor={htmlFor}
      className="mb-2 block text-[15px] font-bold text-ink"
    >
      {t(k)}
    </label>
  );
}
