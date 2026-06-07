"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LiveIndicator, SegmentedSelect } from "@/components/ui";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useHandoverRealtime } from "@/lib/useHandoverRealtime";
import { PROPERTIES, type PropertySlug } from "@/lib/properties";
import {
  SHIFT_OPTIONS,
  formatDate,
  formatSAR,
  todayIso,
} from "@/lib/handover";
import {
  isoDaysBefore,
  missingShifts,
  varianceFlags,
  weekStats,
  type ManagerRow,
} from "@/lib/manager";
import { displayDigits } from "@/lib/digits";

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="glass rounded-aurion p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[15px] font-bold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ManagerDashboard() {
  const { t, lang } = useLang();
  const router = useRouter();

  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [property, setProperty] = useState<PropertySlug | null>(null);
  const [rows, setRows] = useState<ManagerRow[]>([]);

  // Refs so realtime callbacks read current filters without re-subscribing.
  const dateRef = useRef(selectedDate);
  const propRef = useRef(property);
  useEffect(() => {
    dateRef.current = selectedDate;
  }, [selectedDate]);
  useEffect(() => {
    propRef.current = property;
  }, [property]);

  // Fetch the week window up to (and including) the selected date; filter by
  // property if set. Stats use the week; missing-shifts/recent use the day.
  const load = useCallback(async (date: string, prop: PropertySlug | null) => {
    await Promise.resolve();
    const supabase = createClient();
    const from = isoDaysBefore(date, 6);
    let q = supabase
      .from("handovers")
      .select("*, properties(name_en, name_ar, code)")
      .gte("shift_date", from)
      .lte("shift_date", date)
      .order("created_at", { ascending: false });
    if (prop) {
      const meta = PROPERTIES.find((p) => p.slug === prop);
      const { data: pr } = await supabase
        .from("properties")
        .select("id")
        .eq("code", meta!.slug)
        .maybeSingle();
      if (pr) q = q.eq("property_id", pr.id);
    }
    const { data } = await q;
    setRows((data ?? []) as ManagerRow[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(selectedDate, property);
  }, [selectedDate, property, load]);

  // Realtime: any handover change recomputes the dashboard. Light debounce so a
  // burst of events triggers a single refetch.
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status = useHandoverRealtime(
    {
      onUpsert: () => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => {
          load(dateRef.current, propRef.current);
        }, 300);
      },
      onReconcile: () => load(dateRef.current, propRef.current),
    },
    { channelName: "manager-dashboard" },
  );

  async function handleLock() {
    await fetch("/api/manager-auth", { method: "DELETE" });
    router.refresh();
  }

  const dayRows = rows.filter((r) => r.shift_date === selectedDate);
  const missing = missingShifts(dayRows);
  const flags = varianceFlags(rows);
  const stats = weekStats(rows);

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 py-6">
      <div className="flex items-center justify-between">
        <LiveIndicator status={status} />
        <button
          type="button"
          onClick={handleLock}
          className="text-[13px] font-bold text-gold-deep"
        >
          {t("logout")}
        </button>
      </div>

      {/* Controls */}
      <section className="flex flex-col gap-4 glass rounded-aurion p-4">
        <div>
          <FieldLabel k="managerDate" htmlFor="manager-date" />
          <input
            id="manager-date"
            type="date"
            dir="ltr"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="min-h-[52px] w-full rounded-aurion border border-line bg-paper px-4 text-ink outline-none focus:border-gold-deep"
          />
        </div>
        <div>
          <FieldLabel k="propertyLabel" />
          <SegmentedSelect
            options={PROPERTIES.map((p) => ({ value: p.slug, k: p.k }))}
            value={property}
            onChange={(v) =>
              setProperty((cur) => (cur === v ? null : (v as PropertySlug)))
            }
            columns={3}
          />
        </div>
      </section>

      {/* Quick stats */}
      <Card title={t("quickStats")}>
        <div className="grid grid-cols-2 gap-3">
          <Stat label={t("statHandovers")} value={displayDigits(stats.count, lang)} />
          <Stat label={t("statMismatches")} value={displayDigits(stats.mismatches, lang)} flag={stats.mismatches > 0} />
          <Stat label={t("statTotalVariance")} value={formatSAR(stats.totalVariance, lang)} flag={Math.abs(stats.totalVariance) > 0.005} />
          <Stat label={t("statAvgVariance")} value={formatSAR(stats.avgVariance, lang)} />
        </div>
      </Card>

      {/* Missing shifts */}
      <Card title={`${t("missingShifts")} · ${formatDate(selectedDate, lang)}`}>
        {missing.length === 0 ? (
          <p className="text-[14px] text-ink-soft">{t("missingShiftsNone")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {missing.map((m) => (
              <li
                key={`${m.propertySlug}-${m.shift}`}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[13px] font-medium text-amber-900"
              >
                {t(m.propertyK)} · {t(m.shiftK)}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Variance flags */}
      <Card title={t("varianceFlags")}>
        {flags.length === 0 ? (
          <p className="text-[14px] text-ink-soft">{t("varianceFlagsNone")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {flags.map((f) => {
              const propName = lang === "ar" ? f.properties?.name_ar : f.properties?.name_en;
              const shiftK = SHIFT_OPTIONS.find((s) => s.value === f.shift_type)?.k ?? "shiftLabel";
              return (
                <li key={f.id}>
                  <Link
                    href={`/history/${f.id}`}
                    className="flex items-center justify-between gap-3 rounded-aurion border border-red-200 bg-red-50 p-3"
                  >
                    <span className="text-[14px] text-red-900">
                      {propName} · {t(shiftK)} · {f.outgoing_name}
                      {f.incoming_name ? ` → ${f.incoming_name}` : ""}
                    </span>
                    <span className="font-bold text-red-700">
                      {formatSAR(f.cash_variance, lang)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Recent handovers */}
      <Card title={t("recentHandovers")}>
        {rows.length === 0 ? (
          <p className="text-[14px] text-ink-soft">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.slice(0, 10).map((r) => {
              const propName = lang === "ar" ? r.properties?.name_ar : r.properties?.name_en;
              const shiftK = SHIFT_OPTIONS.find((s) => s.value === r.shift_type)?.k ?? "shiftLabel";
              return (
                <li key={r.id}>
                  <Link
                    href={`/history/${r.id}`}
                    className="flex items-center justify-between gap-3 border-b border-line py-2 last:border-0"
                  >
                    <span className="text-[14px] text-ink">
                      {propName} · {t(shiftK)}
                    </span>
                    <span className="text-[13px] text-gold-deep">
                      {formatDate(r.shift_date, lang)} · {t("viewDetail")}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </main>
  );
}

function Stat({ label, value, flag }: { label: string; value: string; flag?: boolean }) {
  return (
    <div className="rounded-aurion bg-cream px-3 py-3">
      <p className="text-[12px] text-ink-soft">{label}</p>
      <p className={`mt-1 text-[18px] font-bold ${flag ? "text-red-700" : "text-ink"}`}>
        {value}
      </p>
    </div>
  );
}
