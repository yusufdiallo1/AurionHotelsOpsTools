"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import { createClient } from "@/lib/supabase/client";
import { useHandoverRealtime } from "@/lib/useHandoverRealtime";
import type { ManagerRow } from "@/lib/manager";
import {
  buildDailyDigest,
  type DailyDigest,
  type CellStatus,
} from "@/lib/dailyDigest";
import { riyadhToday, riyadhYesterday, addDays } from "@/lib/riyadhDate";

// Latin numerals + SAR-on-left in every language (client requirement).
function sar(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `SAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_DOT: Record<DailyDigest["status"], string> = {
  clear: "bg-green-500",
  attention: "bg-amber-500",
  alert: "bg-red-500",
};
const MARK: Record<CellStatus, string> = {
  submitted: "✅",
  unfinished: "⏳",
  missing: "❌",
  not_due: "·",
};

export function DailyDigestCard() {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);

  const [date, setDate] = useState<string>(() => riyadhYesterday());
  const today = riyadhToday();
  const [rows, setRows] = useState<ManagerRow[] | null>(null);
  const [error, setError] = useState(false);
  const [open, setOpen] = useState<null | "subs" | "mis" | "flags">(null);

  const load = useCallback(async (d: string) => {
    setError(false);
    const supabase = createClient();
    const { data, error: err } = await supabase
      .from("handovers")
      .select("*, properties(name_en, name_ar, code)")
      .eq("shift_date", d);
    if (err) {
      setError(true);
      setRows([]);
      return;
    }
    setRows((data ?? []) as ManagerRow[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(date);
  }, [date, load]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateRef = useRef(date);
  useEffect(() => {
    dateRef.current = date;
  }, [date]);
  useHandoverRealtime(
    {
      onUpsert: () => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => load(dateRef.current), 300);
      },
      onReconcile: () => load(dateRef.current),
    },
    { channelName: "daily-digest" },
  );

  const digest =
    rows === null ? null : buildDailyDigest(rows, date, new Date());

  const titleK: StringKey =
    date === today
      ? "digestTitleToday"
      : date === addDays(today, -1)
        ? "digestTitleYesterday"
        : "digestTitleOther";

  // One-line summary
  function summaryLine(d: DailyDigest): string {
    if (d.expected === 0) return t("digestNoneExpected");
    if (d.status === "clear") return t("digestAllClear");
    const parts: string[] = [];
    const missing = d.expected - d.submitted;
    if (missing > 0) parts.push(`${missing} ${t("digestMissingN")}`);
    if (d.mismatches.length > 0)
      parts.push(`${d.mismatches.length} ${t("digestMismatchesN")}`);
    if (d.flags.length > 0) parts.push(`${d.flags.length} ${t("digestFlagsN")}`);
    const emoji = d.status === "alert" ? "🔴" : "⚠️";
    return `${parts.join(" · ")} ${emoji}`;
  }

  return (
    <section className="glass rounded-aurion p-4">
      {/* Header: title + date stepper + status dot */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-bold text-ink">{t(titleK)}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="previous day"
            onClick={() => setDate((dd) => addDays(dd, -1))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-ink-soft"
          >
            ‹
          </button>
          <span className="min-w-[92px] text-center text-[13px] font-medium text-ink-soft">
            {date}
          </span>
          <button
            type="button"
            aria-label="next day"
            disabled={date >= today}
            onClick={() => setDate((dd) => (dd >= today ? dd : addDays(dd, 1)))}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-ink-soft disabled:opacity-40"
          >
            ›
          </button>
          {digest ? (
            <span
              className={`ml-1 h-3 w-3 rounded-full ${STATUS_DOT[digest.status]}`}
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      {/* Body */}
      {digest === null ? (
        <p className="mt-3 text-[14px] text-ink-soft">{t("digestLoading")}</p>
      ) : error ? (
        <p className="mt-3 text-[14px] text-red-700">{t("digestError")}</p>
      ) : (
        <>
          <p className="mt-2 text-[20px] font-bold text-ink">
            {t("digestCount")}: {digest.submitted} {t("digestOf")} {digest.expected}{" "}
            {t("digestSubmittedWord")}
          </p>
          <p className="mt-0.5 text-[13px] text-ink-soft">{summaryLine(digest)}</p>

          <div className="mt-3 flex flex-col divide-y divide-line/70 border-t border-line/70">
            {/* Submissions */}
            <IndicatorRow
              label={t("digestIndSubmissions")}
              value={`${digest.submitted}/${digest.expected}`}
              expanded={open === "subs"}
              onToggle={() => setOpen(open === "subs" ? null : "subs")}
            >
              <div className="flex flex-col gap-2 pb-2">
                {digest.hotels.map((h) => (
                  <div key={h.slug}>
                    <p className="text-[13px] font-bold text-ink">
                      {t(h.propertyK)} {h.submitted}/{h.expected}
                    </p>
                    <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                      {h.cells.map((c) => {
                        const label = `${t(c.shiftK)} ${MARK[c.status]}`;
                        return c.row && c.status === "submitted" ? (
                          <li key={c.shift}>
                            <Link
                              href={`/history/${c.row.id}`}
                              className="text-[13px] text-gold-deep"
                            >
                              {label}
                            </Link>
                          </li>
                        ) : (
                          <li
                            key={c.shift}
                            className={`text-[13px] ${c.status === "missing" ? "text-red-700" : "text-ink-soft"}`}
                          >
                            {label}
                            {c.status === "missing" ? ` ${t("digestNotSubmitted")}` : ""}
                            {c.status === "unfinished" ? ` ${t("digestUnfinished")}` : ""}
                            {c.status === "not_due" ? ` ${t("digestNotDue")}` : ""}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </IndicatorRow>

            {/* Mismatches */}
            <IndicatorRow
              label={t("digestIndMismatches")}
              value={String(digest.mismatches.length)}
              flag={digest.mismatches.length > 0}
              expanded={open === "mis"}
              onToggle={() => setOpen(open === "mis" ? null : "mis")}
            >
              <ul className="flex flex-col gap-2 pb-2">
                {digest.mismatches.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/history/${m.id}`}
                      className="flex items-center justify-between gap-3 rounded-aurion border border-red-200 bg-red-50/80 p-2.5"
                    >
                      <span className="text-[13px] text-red-900">
                        {t(m.hotelK)} · {t(m.shiftK)} · {m.outgoing_name}
                        <br />
                        <span className="text-ink-soft">
                          {t("digestExpected")} {sar(m.expected)} → {t("digestCounted")}{" "}
                          {sar(m.counted)}
                        </span>
                      </span>
                      <span className="font-bold text-red-700">{sar(m.variance)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </IndicatorRow>

            {/* Flagged notes */}
            <IndicatorRow
              label={t("digestIndFlags")}
              value={String(digest.flags.length)}
              flag={digest.flags.length > 0}
              expanded={open === "flags"}
              onToggle={() => setOpen(open === "flags" ? null : "flags")}
            >
              <ul className="flex flex-col gap-2 pb-2">
                {digest.flags.map((f) => (
                  <li key={f.id}>
                    <Link
                      href={`/history/${f.id}`}
                      className="block rounded-aurion border border-line bg-paper-tint p-2.5"
                    >
                      <span className="text-[13px] font-bold text-ink">
                        {t(f.hotelK)} · {t(f.shiftK)} · {f.outgoing_name}
                      </span>
                      {f.fields.map((fl, i) => (
                        <span key={i} className="mt-1 block text-[13px] text-ink-soft">
                          <span className="font-medium text-ink">{t(fl.labelK)}:</span>{" "}
                          {fl.text}
                        </span>
                      ))}
                    </Link>
                  </li>
                ))}
              </ul>
            </IndicatorRow>
          </div>
        </>
      )}
    </section>
  );
}

function IndicatorRow({
  label,
  value,
  flag,
  expanded,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  flag?: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 py-1 text-start"
      >
        <span className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <span className={`transition-transform ${expanded ? "rotate-90" : ""}`}>›</span>
          {label}
        </span>
        <span className={`text-[14px] font-bold ${flag ? "text-red-700" : "text-ink-soft"}`}>
          {value}
        </span>
      </button>
      {expanded ? <div className="px-1">{children}</div> : null}
    </div>
  );
}
