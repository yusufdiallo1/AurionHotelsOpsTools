"use client";

import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import { propertySnapshots, dashboardTotals } from "@/lib/manager";
import { riyadhToday, addDays } from "@/lib/riyadhDate";
import type { WidgetScope } from "@/lib/homeWidgets";
import { useScopedHandovers } from "./useScopedHandovers";

const propK = (slug: string): StringKey => (slug === "al_aqeeq" ? "propAlAqeeq" : "propAsSalaam");

export function OccupancyPanel({ scope, variant = "full" }: { scope: WidgetScope; variant?: "card" | "full" }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  const today = riyadhToday();
  const { rows, error } = useScopedHandovers(
    scope,
    { fromDate: addDays(today, -30), toDate: today },
    "widget-occupancy",
  );

  const loading = rows === null;
  const allSnaps = rows ? propertySnapshots(rows) : [];
  const snaps = scope.kind === "hotel" ? allSnaps.filter((s) => s.slug === scope.slug) : allSnaps;
  const totals = dashboardTotals(snaps);

  if (variant === "card") {
    return (
      <>
        <h2 className="text-[14px] font-bold text-ink">{t("widgetOccupancyPct")}</h2>
        <p className="mt-1 text-[22px] font-bold leading-tight text-ink">
          {loading ? "…" : error ? "—" : `${totals.occupancyPct}%`}
        </p>
        <p className="text-[12px] text-ink-soft">
          {loading || error ? "" : `${totals.roomsOccupied} / ${totals.totalRooms} ${t("widgetRoomsOccupied")}`}
        </p>
      </>
    );
  }

  if (loading) return <p className="text-[14px] text-ink-soft">{t("widgetLoading")}</p>;
  if (error) return <p className="text-[14px] text-red-700">{t("widgetError")}</p>;

  return (
    <div>
      <h2 className="text-[15px] font-bold text-ink">{t("widgetOccupancyPct")}</h2>
      <p className="mt-2 text-[28px] font-bold leading-tight text-ink">{totals.occupancyPct}%</p>
      <p className="text-[13px] text-ink-soft">
        {totals.roomsOccupied} / {totals.totalRooms} {t("widgetRoomsOccupied")}
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gold transition-all duration-500" style={{ width: `${totals.occupancyPct}%` }} />
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-line/70 border-t border-line/70">
        {snaps.map((s) => (
          <li key={s.slug} className="flex items-center justify-between py-2 text-[14px]">
            <span className="text-ink">{t(propK(s.slug))}</span>
            <span className="font-bold text-ink">
              {s.roomsOccupied === null ? "—" : `${s.roomsOccupied} / ${s.totalRooms}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
