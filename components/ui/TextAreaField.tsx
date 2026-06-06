"use client";

import { useId } from "react";
import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";
import { FieldLabel } from "./FieldLabel";

// Multi-line text input, vertically resizable. (CLAUDE.md §8)
export function TextAreaField({
  labelKey,
  placeholderKey,
  value,
  onChange,
  rows = 3,
  maxLength,
}: {
  labelKey: StringKey;
  placeholderKey?: StringKey;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  maxLength?: number;
}) {
  const { t } = useLang();
  const id = useId();

  return (
    <div>
      <FieldLabel k={labelKey} htmlFor={id} />
      <textarea
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderKey ? t(placeholderKey) : undefined}
        className="min-h-[52px] w-full resize-y rounded-aurion border border-line bg-paper px-4 py-3 text-ink placeholder:text-muted outline-none transition-colors focus:border-gold-deep"
      />
    </div>
  );
}
