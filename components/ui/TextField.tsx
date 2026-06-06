"use client";

import { useId } from "react";
import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";
import { FieldLabel } from "./FieldLabel";

// Single-line text input with a translated label + placeholder. (CLAUDE.md §8)
// Inputs render ≥16px (globals.css) and ≥52px tall to meet mobile rules.
export function TextField({
  labelKey,
  placeholderKey,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  maxLength,
}: {
  labelKey: StringKey;
  placeholderKey?: StringKey;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "tel" | "email";
  inputMode?: "text" | "tel" | "email" | "numeric" | "decimal";
  autoComplete?: string;
  maxLength?: number;
}) {
  const { t } = useLang();
  const id = useId();

  return (
    <div>
      <FieldLabel k={labelKey} htmlFor={id} />
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholderKey ? t(placeholderKey) : undefined}
        className="min-h-[52px] w-full rounded-aurion border border-line bg-paper px-4 text-ink placeholder:text-muted outline-none transition-colors focus:border-gold-deep"
      />
    </div>
  );
}
