"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  syncState,
  type Handover,
} from "@/lib/handover";

const PAGE_SIZE = 20;

type PropMeta = { name_en: string; name_ar: string; code: string };
type Row = Handover & {
  properties: { name_en: string; name_ar: string } | null;
};

// Does a row satisfy the active filters? Reused for the live path so realtime
// never injects a row the user has filtered out. (CLAUDE.md realtime)
function matchesFilters(h: Handover, f: Filters, propCode: string | undefined): boolean {
  if (f.shift && h.shift_type !== f.shift) return false;
  if (f.status && h.status !== f.status) return false;
  if (f.from && h.shift_date < f.from) return false;
  if (f.to && h.shift_date > f.to) return false;
  if (f.mismatchOnly && !(h.cash_variance !== null && h.cash_variance !== 0)) return false;
  if (f.property && propCode !== f.property) return false;
  return true;
}

type Filters = {
  property: PropertySlug | null;
  shift: string | null;
  status: string | null;
  from: string;
  to: string;
  mismatchOnly: boolean;
};

const EMPTY_FILTERS: Filters = {
  property: null,
  shift: null,
  status: null,
  from: "",
  to: "",
  mismatchOnly: false,
};

export function HistoryList() {
  const { t } = useLang();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [rows, setRows] = useState<Row[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
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
      let q = supabase
        .from("handovers")
        .select("*, properties(name_en, name_ar)")
        .order("created_at", { ascending: false })
        .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1);

      if (f.shift) q = q.eq("shift_type", f.shift);
      if (f.status) q = q.eq("status", f.status);
      if (f.from) q = q.gte("shift_date", f.from);
      if (f.to) q = q.lte("shift_date", f.to);
      if (f.mismatchOnly) q = q.neq("cash_variance", 0);
      if (f.property) {
        const prop = PROPERTIES.find((p) => p.slug === f.property);
        const { data: pr } = await supabase
          .from("properties")
          .select("id")
          .eq("code", prop!.slug)
          .maybeSingle();
        if (pr) q = q.eq("property_id", pr.id);
      }

      const { data } = await q;
      const batch = (data ?? []) as Row[];
      setHasMore(batch.length === PAGE_SIZE);
      setRows((prev) => (pageIndex === 0 ? batch : [...prev, ...batch]));
      setPage(pageIndex);
      setLoading(false);
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
    // fetchPage awaits a microtask before any setState, so this is not a
    // synchronous setState-in-effect; the rule can't see through the async hop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPage(0, filters);
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
    filters.mismatchOnly;

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 py-6">
      <div className="flex justify-end">
        <LiveIndicator status={status} />
      </div>

      {/* Filters */}
      <section className="flex flex-col gap-4 rounded-aurion border border-line bg-paper p-4">
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

        <div>
          <FieldLabel k="propertyLabel" />
          <SegmentedSelect
            options={PROPERTIES.map((p) => ({ value: p.slug, k: p.k }))}
            value={filters.property}
            onChange={(v) =>
              setFilters((f) => ({
                ...f,
                property: f.property === v ? null : (v as PropertySlug),
              }))
            }
            columns={3}
          />
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
      className="flex flex-col gap-2 rounded-aurion border border-line bg-paper p-4 transition-colors hover:border-gold-deep"
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
