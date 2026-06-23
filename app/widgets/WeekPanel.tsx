"use client";

import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import { weekStats } from "@/lib/manager";
import { riyadhToday, addDays } from "@/lib/riyadhDate";
import type { WidgetScope } from "@/lib/homeWidgets";
import { useScopedHandovers } from "./useScopedHandovers";

function sar(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `SAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function WeekPanel({ scope, variant = "full" }: { scope: WidgetScope; variant?: "card" | "full" }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  const today = riyadhToday();
  const { rows, error } = useScopedHandovers(
    scope,
    { fromDate: addDays(today, -6), toDate: today },
    "widget-week",
  );

  const loading = rows === null;
  const stats = rows ? weekStats(rows) : null;

  if (variant === "card") {
    return (
      <>
        <h2 className="text-[14px] font-bold text-ink">{t("widgetWeekTitle")}</h2>
        <p className="mt-1 text-[22px] font-bold leading-tight text-ink">
          {loading ? "…" : error || !stats ? "—" : stats.count}
        </p>
        <p className="text-[12px] text-ink-soft">
          {loading || error || !stats ? "" : t("widgetWeekHandovers")}
        </p>
      </>
    );
  }

  if (loading) return <p className="text-[14px] text-ink-soft">{t("widgetLoading")}</p>;
  if (error || !stats) return <p className="text-[14px] text-red-700">{t("widgetError")}</p>;

  return (
    <div>
      <h2 className="text-[15px] font-bold text-ink">{t("widgetWeekTitle")}</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label={t("widgetWeekHandovers")} value={String(stats.count)} />
        <Stat label={t("widgetWeekVariance")} value={sar(stats.totalVariance)} flag={Math.abs(stats.totalVariance) > 0.005} />
        <Stat label={t("widgetWeekMismatches")} value={String(stats.mismatches)} flag={stats.mismatches > 0} />
      </div>
    </div>
  );
}

function Stat({ label, value, flag }: { label: string; value: string; flag?: boolean }) {
  return (
    <div className="glass-cream rounded-aurion px-3 py-3">
      <p className="text-[12px] text-ink-soft">{label}</p>
      <p className={`mt-1 text-[16px] font-bold ${flag ? "text-red-700" : "text-ink"}`}>{value}</p>
    </div>
  );
}
