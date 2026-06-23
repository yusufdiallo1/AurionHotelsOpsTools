"use client";

import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import { propertySnapshots, dashboardTotals } from "@/lib/manager";
import { riyadhToday, addDays } from "@/lib/riyadhDate";
import type { WidgetScope } from "@/lib/homeWidgets";
import { useScopedHandovers } from "./useScopedHandovers";

function sar(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `SAR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
const propK = (slug: string): StringKey => (slug === "al_aqeeq" ? "propAlAqeeq" : "propAsSalaam");

export function CashPanel({ scope, variant = "full" }: { scope: WidgetScope; variant?: "card" | "full" }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  // Snapshot = latest completed state; query a recent window to capture the latest.
  const today = riyadhToday();
  const { rows, error } = useScopedHandovers(
    scope,
    { fromDate: addDays(today, -30), toDate: today },
    "widget-cash",
  );

  const loading = rows === null;
  const snaps = rows ? propertySnapshots(rows) : [];
  const totals = dashboardTotals(snaps);

  if (variant === "card") {
    return (
      <>
        <h2 className="text-[14px] font-bold text-ink">{t("widgetCashInDrawer")}</h2>
        <p className="mt-1 text-[22px] font-bold leading-tight text-ink">
          {loading ? "…" : error ? "—" : sar(totals.cashInDrawer)}
        </p>
        <p className="text-[12px] text-ink-soft">{t("widgetPortfolioTotal")}</p>
      </>
    );
  }

  if (loading) return <p className="text-[14px] text-ink-soft">{t("widgetLoading")}</p>;
  if (error) return <p className="text-[14px] text-red-700">{t("widgetError")}</p>;

  return (
    <div>
      <h2 className="text-[15px] font-bold text-ink">{t("widgetCashInDrawer")}</h2>
      <p className="mt-2 text-[28px] font-bold leading-tight text-ink">{sar(totals.cashInDrawer)}</p>
      <p className="text-[13px] text-ink-soft">{t("widgetPortfolioTotal")}</p>
      <ul className="mt-3 flex flex-col divide-y divide-line/70 border-t border-line/70">
        {snaps.map((s) => (
          <li key={s.slug} className="flex items-center justify-between py-2 text-[14px]">
            <span className="text-ink">{t(propK(s.slug))}</span>
            <span className="font-bold text-ink">{sar(s.cashInDrawer)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
