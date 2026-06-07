"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useHandoverRealtime, type RealtimeStatus } from "@/lib/useHandoverRealtime";
import { PROPERTIES, type PropertySlug } from "@/lib/properties";
import { formatSAR, todayIso } from "@/lib/handover";
import {
  isoDaysBefore,
  missingShifts,
  varianceFlags,
  weekStats,
  type ManagerRow,
} from "@/lib/manager";
import { toArabicIndicDigits } from "@/lib/digits";
import {
  MANAGER_LANGS,
  managerDir,
  mt,
  type ManagerKey,
  type ManagerLang,
} from "@/lib/manager-i18n";

const PAGE = 25;

// Date/number display in the manager's own language (en/ar/sv). SV uses Western digits.
function mDigits(value: string | number, lang: ManagerLang): string {
  const s = String(value);
  return lang === "ar" ? toArabicIndicDigits(s) : s;
}
function mSAR(value: number | string | null | undefined, lang: ManagerLang): string {
  // Reuse the app SAR formatter for en/ar; for sv fall back to en-style with "SAR".
  if (lang === "ar") return formatSAR(value, "ar");
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return `SAR ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const SHIFT_KEY: Record<string, ManagerKey> = {
  night: "shiftNight",
  morning: "shiftMorning",
  afternoon: "shiftAfternoon",
};

function propName(r: ManagerRow, lang: ManagerLang): string {
  if (!r.properties) return "—";
  // Arabic uses the AR name; en/sv use the English name.
  return lang === "ar" ? r.properties.name_ar : r.properties.name_en;
}

export function ManagerDashboard() {
  const router = useRouter();
  const { lang: globalLang } = useLang();

  // Manager language (en/ar/sv). Defaults to the app's language (so an Arabic app
  // opens the manager in Arabic) and can be overridden locally — including SV,
  // which is exclusive to this page.
  const [lang, setLang] = useState<ManagerLang>(globalLang);
  const t = (k: ManagerKey) => mt(k, lang);
  const dir = managerDir(lang);

  const [scope, setScope] = useState<"week" | "all">("week");
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [property, setProperty] = useState<PropertySlug | null>(null);
  const [rows, setRows] = useState<ManagerRow[]>([]);
  const [visible, setVisible] = useState(PAGE);

  const argsRef = useRef({ scope, selectedDate, property });
  useEffect(() => {
    argsRef.current = { scope, selectedDate, property };
  }, [scope, selectedDate, property]);

  // Fetch handovers. Week scope = 7-day window ending on the selected date.
  // All scope = every handover (manager sees ALL data).
  const load = useCallback(
    async (s: "week" | "all", date: string, prop: PropertySlug | null) => {
      await Promise.resolve();
      const supabase = createClient();
      let q = supabase
        .from("handovers")
        .select("*, properties(name_en, name_ar, code)")
        .order("created_at", { ascending: false });
      if (s === "week") {
        q = q.gte("shift_date", isoDaysBefore(date, 6)).lte("shift_date", date);
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
    // load() awaits a microtask before any setState, so this is not a synchronous
    // setState in an effect; the rule can't see through the async hop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(scope, selectedDate, property);
  }, [scope, selectedDate, property, load]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status: RealtimeStatus = useHandoverRealtime(
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

  async function handleLock() {
    await fetch("/api/manager-auth", { method: "DELETE" });
    router.refresh();
  }

  const dayRows = rows.filter((r) => r.shift_date === selectedDate);
  const missing = missingShifts(dayRows);
  const flags = varianceFlags(rows);
  const stats = weekStats(rows);

  return (
    <main
      dir={dir}
      className={`mx-auto flex w-full max-w-[640px] flex-col gap-4 px-4 py-5 ${lang === "ar" ? "font-ar" : ""}`}
    >
      {/* Top bar: live + language + lock */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-soft">
          <span
            className={`h-2 w-2 rounded-full ${status === "live" ? "bg-green-500" : "animate-pulse bg-amber-500"}`}
            aria-hidden
          />
          {status === "live" ? t("live") : t("reconnecting")}
        </span>

        <div className="flex items-center gap-2">
          <LangPicker lang={lang} onChange={setLang} />
          <button
            type="button"
            onClick={handleLock}
            className="rounded-full glass px-3 py-1.5 text-[13px] font-bold text-ink-soft"
          >
            {t("lock")}
          </button>
        </div>
      </div>

      {/* Scope + filters */}
      <section className="glass flex flex-col gap-4 rounded-aurion p-4">
        <ScopeToggle scope={scope} onChange={setScope} t={t} />

        {scope === "week" ? (
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink">{t("date")}</span>
            <input
              type="date"
              dir="ltr"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="min-h-[48px] w-full rounded-aurion border border-line bg-paper px-4 text-ink outline-none focus:border-gold-deep"
            />
          </label>
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
                  {mt(p.slug === "al_aqeeq" ? "propAlAqeeq" : "propAsSalaam", lang)}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Stats */}
      <Card title={`${t("stats")} · ${scope === "week" ? t("scopeWeek") : t("scopeAll")}`}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("statHandovers")} value={mDigits(stats.count, lang)} />
          <Stat label={t("statMismatches")} value={mDigits(stats.mismatches, lang)} flag={stats.mismatches > 0} />
          <Stat label={t("statTotalVariance")} value={mSAR(stats.totalVariance, lang)} flag={Math.abs(stats.totalVariance) > 0.005} />
          <Stat label={t("statAvgVariance")} value={mSAR(stats.avgVariance, lang)} />
        </div>
      </Card>

      {/* Missing shifts (always relative to the selected day) */}
      <Card title={`${t("missingShifts")} · ${mDigits(selectedDate, lang)}`}>
        {missing.length === 0 ? (
          <p className="text-[14px] text-ink-soft">{t("missingNone")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {missing.map((m) => (
              <li
                key={`${m.propertySlug}-${m.shift}`}
                className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[13px] font-medium text-amber-900"
              >
                {mt(m.propertySlug === "al_aqeeq" ? "propAlAqeeq" : "propAsSalaam", lang)} · {t(SHIFT_KEY[m.shift])}
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
                  <span className="font-bold text-red-700">{mSAR(f.cash_variance, lang)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* All / recent handovers — manager sees everything (paginated) */}
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
                      <span className="text-[12px] text-ink-soft">{mDigits(r.shift_date, lang)}</span>
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

function LangPicker({
  lang,
  onChange,
}: {
  lang: ManagerLang;
  onChange: (l: ManagerLang) => void;
}) {
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
  scope: "week" | "all";
  onChange: (s: "week" | "all") => void;
  t: (k: ManagerKey) => string;
}) {
  return (
    <div className="relative grid grid-cols-2 rounded-full bg-line/60 p-1">
      <span
        className="absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-full bg-paper shadow-sm transition-transform duration-300 ease-out"
        style={{ transform: scope === "all" ? "translateX(calc(100% + 0.5rem))" : "translateX(0)" }}
        aria-hidden
      />
      {(["week", "all"] as const).map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          className={`relative z-10 min-h-[40px] rounded-full text-[14px] font-bold transition-colors ${scope === s ? "text-ink" : "text-ink-soft"}`}
        >
          {s === "week" ? t("scopeWeek") : t("scopeAll")}
        </button>
      ))}
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
