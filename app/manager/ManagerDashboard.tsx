"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/sign-out";
import { DateField } from "@/components/ui";
import { ActivityLog } from "./ActivityLog";
import { useHandoverRealtime } from "@/lib/useHandoverRealtime";
import { useIdleLock } from "@/lib/useIdleLock";
import { PROPERTIES, type PropertySlug } from "@/lib/properties";
import { todayIso } from "@/lib/handover";
import {
  dashboardTotals,
  isoDaysBefore,
  missingShifts,
  propertySnapshots,
  varianceFlags,
  weekStats,
  type ManagerRow,
} from "@/lib/manager";
import {
  MANAGER_LANGS,
  managerDir,
  mt,
  type ManagerKey,
  type ManagerLang,
} from "@/lib/manager-i18n";

const PAGE = 25;

type Scope = "day" | "week" | "month" | "all";

// Latin numerals + SAR-on-left in every language (client requirement).
function dg(value: string | number): string {
  return String(value);
}
function sar(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const grouped = value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `SAR ${grouped}`;
}

const SHIFT_KEY: Record<string, ManagerKey> = {
  night: "shiftNight",
  morning: "shiftMorning",
  afternoon: "shiftAfternoon",
};
const propKey = (slug: string): ManagerKey =>
  slug === "al_aqeeq" ? "propAlAqeeq" : "propAsSalaam";
function propName(r: ManagerRow, lang: ManagerLang): string {
  if (!r.properties) return "—";
  return lang === "ar" ? r.properties.name_ar : r.properties.name_en;
}

export function ManagerDashboard({ greetingName = "" }: { greetingName?: string }) {
  const { lang: globalLang } = useLang();

  const [lang, setLang] = useState<ManagerLang>(globalLang);
  const t = (k: ManagerKey) => mt(k, lang);
  const dir = managerDir(lang);

  const [scope, setScope] = useState<Scope>("week");
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [property, setProperty] = useState<PropertySlug | null>(null);
  const [rows, setRows] = useState<ManagerRow[]>([]);
  const [visible, setVisible] = useState(PAGE);

  // Auto-lock after 5 min idle → sign out.
  useIdleLock(() => {
    signOut();
  });

  const argsRef = useRef({ scope, selectedDate, property });
  useEffect(() => {
    argsRef.current = { scope, selectedDate, property };
  }, [scope, selectedDate, property]);

  const load = useCallback(
    async (s: Scope, date: string, prop: PropertySlug | null) => {
      await Promise.resolve();
      const supabase = createClient();
      let q = supabase
        .from("handovers")
        .select("*, properties(name_en, name_ar, code)")
        .order("created_at", { ascending: false });
      const windowDays = s === "day" ? 0 : s === "week" ? 6 : s === "month" ? 29 : null;
      if (windowDays !== null) {
        q = q.gte("shift_date", isoDaysBefore(date, windowDays)).lte("shift_date", date);
      }
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
      setVisible(PAGE);
    },
    [],
  );

  useEffect(() => {
    // load() awaits a microtask before any setState (not a sync setState-in-effect).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(scope, selectedDate, property);
  }, [scope, selectedDate, property, load]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Realtime keeps KPIs fresh; no live/reconnecting badge is shown.
  useHandoverRealtime(
    {
      onUpsert: () => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => {
          const a = argsRef.current;
          load(a.scope, a.selectedDate, a.property);
        }, 300);
      },
      onReconcile: () => {
        const a = argsRef.current;
        load(a.scope, a.selectedDate, a.property);
      },
    },
    { channelName: "manager-dashboard" },
  );

  function handleLock() {
    signOut();
  }

  // Snapshots use ALL handovers (latest state per property), regardless of the
  // week/all toggle, so "cash in drawer" + occupancy always reflect reality.
  const [snapshotRows, setSnapshotRows] = useState<ManagerRow[]>([]);
  useEffect(() => {
    let cancelled = false;
    createClient()
      .from("handovers")
      .select("*, properties(name_en, name_ar, code)")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (!cancelled) setSnapshotRows((data ?? []) as ManagerRow[]);
      });
    return () => {
      cancelled = true;
    };
  }, [rows]);

  const snaps = propertySnapshots(snapshotRows);
  const totals = dashboardTotals(snaps);

  const dayRows = rows.filter((r) => r.shift_date === selectedDate);
  const missing = missingShifts(dayRows);
  const flags = varianceFlags(rows);
  const stats = weekStats(rows);
  const scopeLabel =
    scope === "day"
      ? t("scopeDay")
      : scope === "week"
        ? t("scopeWeek")
        : scope === "month"
          ? t("scopeMonth")
          : t("scopeAll");

  return (
    <main
      dir={dir}
      className={`mx-auto flex w-full max-w-[680px] flex-col gap-4 px-4 py-5 ${lang === "ar" ? "font-ar" : ""}`}
    >
      {/* Top bar */}
      <div className="flex items-center justify-end gap-3">
        <div className="flex items-center gap-2">
          <LangPicker lang={lang} onChange={setLang} />
          <Link
            href="/admin"
            className="glass rounded-full px-3.5 py-2 text-[13px] font-bold text-ink-soft"
          >
            {t("employees")}
          </Link>
          <button
            type="button"
            onClick={handleLock}
            className="glass rounded-full px-3.5 py-2 text-[13px] font-bold text-ink-soft"
          >
            {t("lock")}
          </button>
        </div>
      </div>

      {/* Greeting */}
      {greetingName ? (
        <p className="text-[15px] text-ink-soft">
          {t("greeting")}, <span className="font-bold text-ink">{greetingName}</span>
        </p>
      ) : null}

      {/* HERO — portfolio KPIs */}
      <section className="glass-navy overflow-hidden rounded-[20px] p-5 text-cream">
        <p className="text-[12px] font-medium uppercase tracking-wide text-gold-soft">
          {t("overview")} · {t("acrossProperties")}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Hero label={t("cashInDrawer")} value={sar(totals.cashInDrawer)} />
          <Hero
            label={t("occupancy")}
            value={`${dg(totals.occupancyPct)}%`}
            sub={`${dg(totals.roomsOccupied)} / ${dg(totals.totalRooms)} ${t("rooms")}`}
          />
        </div>
        {/* portfolio occupancy bar */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-cream/20">
          <div
            className="h-full rounded-full bg-gold transition-all duration-500"
            style={{ width: `${totals.occupancyPct}%` }}
          />
        </div>
      </section>

      {/* By-property snapshot cards */}
      <div className="grid gap-3 sm:grid-cols-2">
        {snaps.map((s) => (
          <div key={s.slug} className="glass rounded-aurion p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-ink">{mt(propKey(s.slug), lang)}</h3>
              <span className="text-[13px] font-bold text-gold-deep">
                {s.occupancyPct === null ? "—" : `${dg(s.occupancyPct)}%`}
              </span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-gold-deep transition-all duration-500"
                style={{ width: `${s.occupancyPct ?? 0}%` }}
              />
            </div>
            <dl className="mt-3 flex items-end justify-between">
              <div>
                <dt className="text-[11px] text-ink-soft">{t("cashInDrawer")}</dt>
                <dd className="text-[15px] font-bold text-ink">{sar(s.cashInDrawer)}</dd>
              </div>
              <div className="text-end">
                <dt className="text-[11px] text-ink-soft">{t("roomsOccupied")}</dt>
                <dd className="text-[15px] font-bold text-ink">
                  {s.roomsOccupied === null
                    ? "—"
                    : `${dg(s.roomsOccupied)} / ${dg(s.totalRooms)}`}
                </dd>
              </div>
            </dl>
            {s.latest ? (
              <p className="mt-2 text-[11px] text-muted">
                {t("lastUpdated")}: {dg(s.latest.shift_date)}
              </p>
            ) : (
              <p className="mt-2 text-[11px] text-muted">{t("noData")}</p>
            )}
          </div>
        ))}
      </div>

      {/* Scope + filters */}
      <section className="glass flex flex-col gap-4 rounded-aurion p-4">
        <ScopeToggle scope={scope} onChange={setScope} t={t} />
        {scope !== "all" ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink">{t("date")}</span>
            <DateField value={selectedDate} onChange={setSelectedDate} />
          </div>
        ) : null}
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-bold text-ink">{t("property")}</span>
          <div className="grid grid-cols-2 gap-2">
            {PROPERTIES.map((p) => {
              const active = property === p.slug;
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setProperty(active ? null : p.slug)}
                  className={[
                    "min-h-[48px] rounded-aurion px-3 text-[15px] transition-colors",
                    active
                      ? "border-2 border-gold bg-gold-tint font-bold text-ink"
                      : "border border-line bg-paper font-medium text-ink-soft",
                  ].join(" ")}
                >
                  {mt(propKey(p.slug), lang)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Period stats */}
      <Card title={`${t("stats")} · ${scopeLabel}`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("statHandovers")} value={dg(stats.count)} />
          <Stat label={t("statMismatches")} value={dg(stats.mismatches)} flag={stats.mismatches > 0} />
          <Stat label={t("statTotalVariance")} value={sar(stats.totalVariance)} flag={Math.abs(stats.totalVariance) > 0.005} />
          <Stat label={t("statAvgVariance")} value={sar(stats.avgVariance)} />
        </div>
      </Card>

      {/* Missing shifts */}
      <Card title={`${t("missingShifts")} · ${dg(selectedDate)}`}>
        {missing.length === 0 ? (
          <p className="text-[14px] text-ink-soft">{t("missingNone")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {missing.map((m) => (
              <li
                key={`${m.propertySlug}-${m.shift}`}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[13px] font-medium text-amber-900"
              >
                {mt(propKey(m.propertySlug), lang)} · {t(SHIFT_KEY[m.shift])}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Variance flags */}
      <Card title={t("varianceFlags")}>
        {flags.length === 0 ? (
          <p className="text-[14px] text-ink-soft">{t("varianceNone")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {flags.map((f) => (
              <li key={f.id}>
                <Link
                  href={`/history/${f.id}`}
                  className="flex items-center justify-between gap-3 rounded-aurion border border-red-200 bg-red-50/80 p-3"
                >
                  <span className="text-[14px] text-red-900">
                    {propName(f, lang)} · {t(SHIFT_KEY[f.shift_type] ?? "shiftNight")} · {f.outgoing_name}
                    {f.incoming_name ? ` → ${f.incoming_name}` : ""}
                  </span>
                  <span className="font-bold text-red-700">{sar(f.cash_variance)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Live activity feed (audit log) */}
      <ActivityLog lang={lang} />

      {/* All / recent handovers */}
      <Card title={scope === "all" ? t("allHandovers") : t("recent")}>
        {rows.length === 0 ? (
          <p className="text-[14px] text-ink-soft">{t("empty")}</p>
        ) : (
          <>
            <ul className="flex flex-col">
              {rows.slice(0, visible).map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/history/${r.id}`}
                    className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 last:border-0"
                  >
                    <span className="flex flex-col">
                      <span className="text-[14px] font-medium text-ink">
                        {propName(r, lang)} · {t(SHIFT_KEY[r.shift_type] ?? "shiftNight")}
                      </span>
                      <span className="text-[12px] text-ink-soft">{dg(r.shift_date)}</span>
                    </span>
                    <span className="text-[13px] font-bold text-gold-deep">{t("view")}</span>
                  </Link>
                </li>
              ))}
            </ul>
            {visible < rows.length ? (
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE)}
                className="mt-3 min-h-[44px] w-full rounded-aurion border border-line-strong bg-paper text-[15px] font-bold text-ink"
              >
                {t("loadMore")}
              </button>
            ) : null}
          </>
        )}
      </Card>
    </main>
  );
}

function Hero({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-[12px] font-medium text-cream/70">{label}</p>
      <p className="mt-1 text-[24px] font-bold leading-tight text-cream">{value}</p>
      {sub ? <p className="mt-0.5 text-[12px] text-cream/60">{sub}</p> : null}
    </div>
  );
}

function LangPicker({ lang, onChange }: { lang: ManagerLang; onChange: (l: ManagerLang) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full glass-navy p-1">
      {MANAGER_LANGS.map((l) => {
        const active = l.value === lang;
        return (
          <button
            key={l.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(l.value)}
            className={[
              "min-h-[32px] min-w-[36px] rounded-full px-2.5 text-[13px] font-bold transition-colors",
              active ? "bg-gold text-navy-deep" : "text-cream/75 hover:text-cream",
            ].join(" ")}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}

function ScopeToggle({
  scope,
  onChange,
  t,
}: {
  scope: Scope;
  onChange: (s: Scope) => void;
  t: (k: ManagerKey) => string;
}) {
  const items: { value: Scope; key: ManagerKey }[] = [
    { value: "day", key: "scopeDay" },
    { value: "week", key: "scopeWeek" },
    { value: "month", key: "scopeMonth" },
    { value: "all", key: "scopeAll" },
  ];
  return (
    <div className="grid grid-cols-4 gap-1 rounded-full bg-line/60 p-1">
      {items.map((it) => {
        const on = scope === it.value;
        return (
          <button
            key={it.value}
            type="button"
            onClick={() => onChange(it.value)}
            className={[
              "min-h-[40px] rounded-full text-[13px] font-bold transition-colors",
              on ? "bg-paper text-ink shadow-sm" : "text-ink-soft",
            ].join(" ")}
          >
            {t(it.key)}
          </button>
        );
      })}
    </div>
  );
}

function Stat({ label, value, flag }: { label: string; value: string; flag?: boolean }) {
  return (
    <div className="glass-cream rounded-aurion px-3 py-3">
      <p className="text-[12px] text-ink-soft">{label}</p>
      <p className={`mt-1 text-[18px] font-bold ${flag ? "text-red-700" : "text-ink"}`}>{value}</p>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-aurion p-4">
      <h2 className="mb-3 text-[15px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}
