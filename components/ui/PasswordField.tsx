"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";

// Password input with a show/hide (eye) toggle. The toggle sits on the trailing
// side and respects RTL.
export function PasswordField({
  value,
  onChange,
  placeholder,
  autoComplete = "current-password",
  onEnter,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  onEnter?: () => void;
  className?: string;
}) {
  const { dir } = useLang();
  const [show, setShow] = useState(false);
  const rtl = dir === "rtl";

  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        dir="ltr"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
        placeholder={placeholder}
        className={[
          "min-h-[52px] w-full rounded-aurion border border-line bg-paper text-ink placeholder:text-muted outline-none focus:border-gold-deep",
          rtl ? "pe-4 ps-12" : "ps-4 pe-12",
          className,
        ].join(" ")}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        tabIndex={-1}
        className={[
          "absolute top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:text-ink",
          rtl ? "left-2" : "right-2",
        ].join(" ")}
      >
        {show ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.4 5.2A9.5 9.5 0 0 1 12 5c5 0 9 4.5 9 7a12 12 0 0 1-2.4 3.3M6.1 6.1A12.6 12.6 0 0 0 3 12c0 2.5 4 7 9 7a9.4 9.4 0 0 0 3.1-.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
