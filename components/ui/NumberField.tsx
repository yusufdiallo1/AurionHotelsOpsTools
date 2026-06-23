"use client";

import { useId } from "react";
import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";
import { normalizeNumericInput } from "@/lib/digits";
import { sanitizeIntInput, sanitizeMoneyInput } from "@/lib/handover";
import { FieldLabel } from "./FieldLabel";

// Numeric input with a tinted fill. (CLAUDE.md §8)
//
// `value` is always a Western-digit string (the source of truth). In AR mode we
// DISPLAY Arabic-Indic digits, but any typed input is normalised back to Western
// and hardened (integer-only or money) before being passed up. (CLAUDE.md §6, reliability)
export function NumberField({
  labelKey,
  placeholderKey,
  value,
  onChange,
  mode = "money",
  suffix,
}: {
  labelKey: StringKey;
  placeholderKey?: StringKey;
  value: string;
  onChange: (westernValue: string) => void;
  mode?: "money" | "integer";
  suffix?: string;
}) {
  const { t, dir } = useLang();
  const id = useId();
  const rtl = dir === "rtl";

  // Numerals are always Latin/Western (client requirement); input stays LTR.
  const shown = value;

  function handleChange(raw: string) {
    // 1) Arabic-Indic → Western, 2) strip to the allowed shape (no negatives).
    const western = normalizeNumericInput(raw);
    onChange(mode === "integer" ? sanitizeIntInput(western) : sanitizeMoneyInput(western));
  }

  return (
    <div>
      <FieldLabel k={labelKey} htmlFor={id} />
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode={mode === "integer" ? "numeric" : "decimal"}
          // Digits are Latin and read LTR; in AR the field right-aligns so the
          // number sits on the right and the suffix sits on the left without overlap.
          dir="ltr"
          style={{ textAlign: rtl ? "right" : "left" }}
          value={shown}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholderKey ? t(placeholderKey) : undefined}
          className={[
            "min-h-[52px] w-full rounded-aurion border border-line bg-paper text-ink placeholder:text-muted outline-none transition-colors focus:border-gold-deep",
            // Reserve room for the suffix on the side it sits on.
            suffix ? (rtl ? "ps-14 pe-4" : "pe-14 ps-4") : "px-4",
          ].join(" ")}
        />
        {suffix ? (
          <span
            className={[
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm font-medium text-ink-soft",
              rtl ? "left-4" : "right-4",
            ].join(" ")}
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
