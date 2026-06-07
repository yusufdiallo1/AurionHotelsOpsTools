"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LiveIndicator, SegmentedSelect, SyncBadge } from "@/components/ui";
import { FieldLabel } from "@/components/ui/FieldLabel";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { PROPERTIES, type PropertySlug } from "@/lib/properties";
import { useHandoverRealtime } from "@/lib/useHandoverRealtime";
import {
  SHIFT_OPTIONS,
  formatDate,
  formatSAR,
  hasCashMismatch,
  isoDaysBeforeToday,
  syncState,
  todayIso,
  type Handover,
} from "@/lib/handover";
import { displayDigits } from "@/lib/digits";

const PAGE_SIZE = 20;

type PropMeta = { name_en: string; name_ar: string; code: string };
type Row = Handover & {
  properties: { name_en: string; name_ar: string } | null;
};

function nameMatches(h: Handover, name: string): boolean {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  return (
    h.outgoing_name.toLowerCase().includes(n) ||
    (h.incoming_name ?? "").toLowerCase().includes(n)
  );
}

// Does a row satisfy the active filters? Reused for the live path so realtime
// never injects a row the user has filtered out. (CLAUDE.md realtime)
function matchesFilters(h: Handover, f: Filters, propCode: string | undefined): boolean {
  if (f.shift && h.shift_type !== f.shift) return false;
  if (f.status && h.status !== f.status) return false;
  if (f.from && h.shift_date < f.from) return false;
  if (f.to && h.shift_date > f.to) return false;
  if (f.mismatchOnly && !(h.cash_variance !== null && h.cash_variance !== 0)) return false;
  if (f.property && propCode !== f.property) return false;
  if (!nameMatches(h, f.name)) return false;
  return true;
}

type Filters = {
  property: PropertySlug | null;
  shift: string | null;
  status: string | null;
  from: string;
  to: string;
  mismatchOnly: boolean;
  name: string;
};

const EMPTY_FILTERS: Filters = {
  property: null,
  shift: null,
  status: null,
  from: "",
  to: "",
  mismatchOnly: false,
  name: "",
};

export function HistoryList() {
  const { t, lang } = useLang();
  const searchParams = useSearchParams();
  const initialName = searchParams.get("name") ?? "";
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS, name: initialName });
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  // Aggregates over ALL matching rows (not just the loaded page).
  const [totals, setTotals] = useState<{ count: number; cash: number }>({ count: 0, cash: 0 });
  // property_id -> meta, loaded once (only 3 properties). Lets the live path
  // attach property names + evaluate the property filter without a join.
  const [propMap, setPropMap] = useState<Record<string, PropMeta>>({});

  // Latest filters in a ref so realtime callbacks read current values without
  // re-subscribing the channel. Updated in an effect (not during render).
  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    let active = true;
    createClient()
      .from("properties")
      .select("id, code, name_en, name_ar")
      .then(({ data }) => {
        if (!active || !data) return;
        const map: Record<string, PropMeta> = {};
        for (const p of data) {
          map[p.id] = { name_en: p.name_en, name_ar: p.name_ar, code: p.code };
        }
        setPropMap(map);
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchPage = useCallback(
    async (pageIndex: number, f: Filters) => {
      // Yield a microtask first so this isn't a synchronous setState in an effect.
      await Promise.resolve();
      setLoading(true);
      const supabase = createClient();
      const q = supabase
        .from("handovers")
        .select("*, properties(name_en, name_ar)")
        .order("created_at", { ascending: false })
        .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

      // Resolve property filter to an id once, shared by list + totals queries.
      let propertyId: string | null = null;
      if (f.property) {
        const prop = PROPERTIES.find((p) => p.slug === f.property);
        const { data: pr } = await supabase
          .from("properties")
          .select("id")
          .eq("code", prop!.slug)
          .maybeSingle();
        propertyId = pr?.id ?? null;
      }

      // PostgREST filter builders chain mutably; apply to any builder.
      const term = f.name.trim() ? `%${f.name.trim()}%` : null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const applyFilters = (qq: any) => {
        if (f.shift) qq = qq.eq("shift_type", f.shift);
        if (f.status) qq = qq.eq("status", f.status);
        if (f.from) qq = qq.gte("shift_date", f.from);
        if (f.to) qq = qq.lte("shift_date", f.to);
        if (f.mismatchOnly) qq = qq.neq("cash_variance", 0);
        if (propertyId) qq = qq.eq("property_id", propertyId);
        if (term) qq = qq.or(`outgoing_name.ilike.${term},incoming_name.ilike.${term}`);
        return qq;
      };

      const { data } = await applyFilters(q);
      const batch = (data ?? []) as Row[];
      setHasMore(batch.length === PAGE_SIZE);
      setRows((prev) => (pageIndex === 0 ? batch : [...prev, ...batch]));
      setPage(pageIndex);
      setLoading(false);

      // Aggregates over ALL matching rows (count + total cash in drawer).
      const { data: allRows, count } = await applyFilters(
        supabase.from("handovers").select("cash_drawer", { count: "exact" }),
      );
      const cash = (allRows ?? []).reduce(
        (sum: number, r: { cash_drawer: number }) => sum + Number(r.cash_drawer ?? 0),
        0,
      );
      setTotals({ count: count ?? allRows?.length ?? 0, cash });
    },
    [],
  );

  // Realtime: upsert by id, honouring active filters; reconcile on reconnect.
  const status = useHandoverRealtime(
    {
      onUpsert: (incoming) => {
        const meta = propMap[incoming.property_id];
        const keep = matchesFilters(incoming, filtersRef.current, meta?.code);
        setRows((prev) => {
          const idx = prev.findIndex((r) => r.id === incoming.id);
          if (!keep) {
            // No longer matches the filter — drop it if present.
            return idx === -1 ? prev : prev.filter((r) => r.id !== incoming.id);
          }
          const merged: Row = {
            ...incoming,
            properties: meta
              ? { name_en: meta.name_en, name_ar: meta.name_ar }
              : (prev[idx]?.properties ?? null),
          };
          if (idx === -1) return [merged, ...prev]; // new row → top
          const next = [...prev];
          next[idx] = merged; // update in place → no scroll jump
          return next;
        });
      },
      onReconcile: () => {
        // Catch anything missed while disconnected.
        fetchPage(0, filtersRef.current);
      },
    },
    { channelName: "history-list" },
  );

  useEffect(() => {
    // Debounce so typing in the name field doesn't fire a query per keystroke.
    const handle = setTimeout(() => fetchPage(0, filters), 250);
    return () => clearTimeout(handle);
  }, [filters, fetchPage]);

  function loadMore() {
    fetchPage(page + 1, filters);
  }

  const filtersActive =
    !!filters.property ||
    !!filters.shift ||
    !!filters.status ||
    !!filters.from ||
    !!filters.to ||
    filters.mismatchOnly ||
    !!filters.name;

  // Active date-range preset (for highlighting the preset buttons).
  const activeRange =
    filters.from === "" && filters.to === ""
      ? "all"
      : filters.from === todayIso() && filters.to === todayIso()
        ? "today"
        : filters.from === isoDaysBeforeToday(6) && filters.to === todayIso()
          ? "7d"
          : filters.from === isoDaysBeforeToday(29) && filters.to === todayIso()
            ? "30d"
            : "custom";

  function setRange(preset: "today" | "7d" | "30d" | "all") {
    setFilters((f) => {
      if (preset === "all") return { ...f, from: "", to: "" };
      if (preset === "today") return { ...f, from: todayIso(), to: todayIso() };
      if (preset === "7d") return { ...f, from: isoDaysBeforeToday(6), to: todayIso() };
      return { ...f, from: isoDaysBeforeToday(29), to: todayIso() };
    });
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 py-6">
      <div className="flex justify-end">
        <LiveIndicator status={status} />
      </div>

      {/* Filters */}
      <section className="flex flex-col gap-4 glass rounded-aurion p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-bold text-ink">{t("filters")}</h2>
          {filtersActive ? (
            <button
              type="button"
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-[13px] font-bold text-gold-deep"
            >
              {t("clearFilters")}
            </button>
          ) : null}
        </div>

        {/* Reception name search */}
        <div>
          <FieldLabel k="filterName" />
          <input
            type="text"
            value={filters.name}
            onChange={(e) => setFilters((f) => ({ ...f, name: e.target.value }))}
            placeholder={t("filterNamePlaceholder")}
            className="min-h-[52px] w-full rounded-aurion border border-line bg-paper px-4 text-ink placeholder:text-muted outline-none focus:border-gold-deep"
          />
        </div>

        <div>
          <FieldLabel k="propertyLabel" />
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...f, property: null }))}
              className={[
                "min-h-[48px] rounded-aurion px-2 text-[14px] transition-colors",
                filters.property === null
                  ? "border-2 border-gold bg-gold-tint font-bold text-ink"
                  : "border border-line bg-paper text-ink-soft",
              ].join(" ")}
            >
              {t("filterAll")}
            </button>
            {PROPERTIES.map((p) => {
              const on = filters.property === p.slug;
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => setFilters((f) => ({ ...f, property: p.slug }))}
                  className={[
                    "min-h-[48px] rounded-aurion px-2 text-[14px] transition-colors",
                    on
                      ? "border-2 border-gold bg-gold-tint font-bold text-ink"
                      : "border border-line bg-paper text-ink-soft",
                  ].join(" ")}
                >
                  {t(p.k)}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <FieldLabel k="shiftLabel" />
          <SegmentedSelect
            options={SHIFT_OPTIONS.map((s) => ({ value: s.value, k: s.k }))}
            value={filters.shift}
            onChange={(v) =>
              setFilters((f) => ({ ...f, shift: f.shift === v ? null : v }))
            }
            columns={3}
          />
        </div>

        <div>
          <FieldLabel k="filterStatus" />
          <SegmentedSelect
            options={[
              { value: "pending_incoming", k: "statusPending" },
              { value: "completed", k: "statusCompleted" },
            ]}
            value={filters.status}
            onChange={(v) =>
              setFilters((f) => ({ ...f, status: f.status === v ? null : v }))
            }
            columns={2}
          />
        </div>

        {/* Date range presets */}
        <div>
          <FieldLabel k="filterFrom" />
          <div className="flex flex-wrap gap-2">
            {([
              ["all", "rangeAll"],
              ["today", "rangeToday"],
              ["7d", "range7d"],
              ["30d", "range30d"],
            ] as const).map(([preset, key]) => {
              const on = activeRange === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setRange(preset)}
                  className={[
                    "min-h-[40px] rounded-full px-4 text-[14px] font-bold transition-colors",
                    on
                      ? "bg-navy text-cream"
                      : "border border-line bg-paper text-ink-soft",
                  ].join(" ")}
                >
                  {t(key)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom from/to */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel k="filterFrom" />
            <input
              type="date"
              dir="ltr"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="min-h-[52px] w-full rounded-aurion border border-line bg-paper px-3 text-ink outline-none focus:border-gold-deep"
            />
          </div>
          <div>
            <FieldLabel k="filterTo" />
            <input
              type="date"
              dir="ltr"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="min-h-[52px] w-full rounded-aurion border border-line bg-paper px-3 text-ink outline-none focus:border-gold-deep"
            />
          </div>
        </div>

        <label className="flex min-h-[44px] items-center gap-3">
          <input
            type="checkbox"
            checked={filters.mismatchOnly}
            onChange={(e) =>
              setFilters((f) => ({ ...f, mismatchOnly: e.target.checked }))
            }
            className="h-5 w-5 accent-[var(--color-gold-deep)]"
          />
          <span className="text-[15px] text-ink">{t("filterMismatchOnly")}</span>
        </label>
      </section>

      {/* Results summary — aggregates over ALL matching handovers */}
      <div className="glass-cream flex items-center justify-between rounded-aurion px-4 py-3">
        <span className="text-[14px] font-bold text-ink">
          {displayDigits(totals.count, lang)} {t("resultsCount")}
        </span>
        <span className="text-[13px] text-ink-soft">
          {t("totalDrawer")}: <span className="font-bold text-ink">{formatSAR(totals.cash, lang)}</span>
        </span>
      </div>

      {/* List */}
      {loading && rows.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-ink-soft">{t("loading")}</p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-[15px] text-ink-soft">
          {t("noHandovers")}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {rows.map((h) => (
            <li key={h.id}>
              <HistoryRow row={h} />
            </li>
          ))}
        </ul>
      )}

      {hasMore && !loading ? (
        <button
          type="button"
          onClick={loadMore}
          className="min-h-[44px] rounded-aurion border border-line-strong bg-paper text-[15px] font-bold text-ink"
        >
          {t("loadMore")}
        </button>
      ) : null}
    </main>
  );
}

function HistoryRow({ row }: { row: Row }) {
  const { t, lang } = useLang();
  const mismatch = hasCashMismatch(row);
  const propName = lang === "ar" ? row.properties?.name_ar : row.properties?.name_en;
  const shiftKey =
    SHIFT_OPTIONS.find((s) => s.value === row.shift_type)?.k ?? "shiftLabel";

  return (
    <Link
      href={`/history/${row.id}`}
      className="flex flex-col gap-2 glass rounded-aurion p-4 transition-colors hover:border-gold-deep"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-bold text-ink">{propName ?? "—"}</span>
        <span className="text-[13px] text-ink-soft">
          {formatDate(row.shift_date, lang)} · {t(shiftKey)}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 text-[14px] text-ink-soft">
        <span>
          {row.outgoing_name}
          {row.incoming_name ? ` → ${row.incoming_name}` : ""}
        </span>
        {row.status === "completed" ? (
          <span className={mismatch ? "font-bold text-red-700" : "text-ink-soft"}>
            {formatSAR(row.cash_variance, lang)}
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center rounded-full bg-cream px-2.5 py-0.5 text-[12px] font-bold text-ink-soft">
          {row.status === "completed" ? t("statusCompleted") : t("statusPending")}
        </span>
        <SyncBadge state={syncState(row)} />
      </div>
    </Link>
  );
}
