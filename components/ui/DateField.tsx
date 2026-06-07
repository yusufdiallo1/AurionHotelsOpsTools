"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { FieldLabel } from "./FieldLabel";
import type { StringKey } from "@/lib/strings";

// Branded Aurion date picker — glass popover, gold selection, Latin numerals,
// RTL-aware. Value is a YYYY-MM-DD string (or "" when empty). Replaces the native
// <input type="date"> so the calendar matches the brand across browsers.

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTHS_AR = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const WEEKDAYS_EN = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_AR = ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"];

function ymd(d: Date): string {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
function parse(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function DateField({
  labelKey,
  value,
  onChange,
}: {
  labelKey?: StringKey;
  value: string;
  onChange: (value: string) => void;
}) {
  const { lang, dir } = useLang();
  const id = useId();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selected = parse(value);
  const today = new Date();
  const [view, setView] = useState(() => selected ?? today);

  // Keep the view month in sync when the value changes externally. Deferred a
  // microtask so it isn't a synchronous setState within the effect body.
  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      const d = parse(value);
      if (d) setView(d);
    });
    return () => {
      cancelled = true;
    };
  }, [value]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const months = lang === "ar" ? MONTHS_AR : MONTHS_EN;
  const weekdays = lang === "ar" ? WEEKDAYS_AR : WEEKDAYS_EN;

  const year = view.getFullYear();
  const month = view.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const isSameDay = (a: Date | null, d: number) =>
    !!a && a.getFullYear() === year && a.getMonth() === month && a.getDate() === d;

  function pick(day: number) {
    onChange(ymd(new Date(year, month, day)));
    setOpen(false);
  }

  return (
    <div ref={wrapRef} className="relative">
      {labelKey ? <FieldLabel k={labelKey} htmlFor={id} /> : null}
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[52px] w-full items-center justify-between rounded-aurion border border-line bg-paper px-4 text-ink outline-none transition-colors focus:border-gold-deep"
      >
        <span dir="ltr" className={value ? "text-ink" : "text-muted"}>
          {value || "—"}
        </span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5 text-gold-deep">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" strokeLinecap="round" />
        </svg>
      </button>

      {open ? (
        <div
          dir={dir}
          className="glass absolute z-50 mt-2 w-[300px] rounded-aurion p-3 shadow-xl"
        >
          {/* Header: month/year + prev/next */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[15px] font-bold text-ink">
              {months[month]} <span dir="ltr">{year}</span>
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setView(new Date(year, month - 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line/60"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setView(new Date(year, month + 1, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft hover:bg-line/60"
              >
                ›
              </button>
            </div>
          </div>

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekdays.map((w, i) => (
              <span key={i} className="py-1 text-[11px] font-bold text-muted">
                {w}
              </span>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {cells.map((day, i) =>
              day === null ? (
                <span key={i} />
              ) : (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(day)}
                  dir="ltr"
                  className={[
                    "flex h-9 items-center justify-center rounded-full text-[14px] transition-colors",
                    isSameDay(selected, day)
                      ? "bg-gold font-bold text-navy-deep"
                      : isSameDay(today, day)
                        ? "font-bold text-gold-deep ring-1 ring-gold-deep"
                        : "text-ink hover:bg-gold-tint",
                  ].join(" ")}
                >
                  {day}
                </button>
              ),
            )}
          </div>

          {/* Footer: Clear / Today */}
          <div className="mt-2 flex items-center justify-between border-t border-line/70 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="text-[13px] font-bold text-ink-soft"
            >
              {lang === "ar" ? "مسح" : "Clear"}
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(ymd(today));
                setOpen(false);
              }}
              className="text-[13px] font-bold text-gold-deep"
            >
              {lang === "ar" ? "اليوم" : "Today"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
