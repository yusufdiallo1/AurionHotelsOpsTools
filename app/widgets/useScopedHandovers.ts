"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useHandoverRealtime } from "@/lib/useHandoverRealtime";
import type { ManagerRow } from "@/lib/manager";
import type { WidgetScope } from "@/lib/homeWidgets";

type Filter =
  | { byDate: string }
  | { fromDate: string; toDate: string };

/**
 * Fetch handovers (joined to properties) for a date or range, optionally scoped
 * to one hotel, and keep them fresh via realtime (debounced). Returns null while
 * loading, [] on error (with `error=true`). channelName must be unique per panel.
 */
export function useScopedHandovers(
  scope: WidgetScope,
  filter: Filter,
  channelName: string,
): { rows: ManagerRow[] | null; error: boolean } {
  const [rows, setRows] = useState<ManagerRow[] | null>(null);
  const [error, setError] = useState(false);

  const filterKey =
    "byDate" in filter ? `d:${filter.byDate}` : `r:${filter.fromDate}:${filter.toDate}`;
  const propertyId = scope.kind === "hotel" ? scope.propertyId : null;

  const load = useCallback(async () => {
    setError(false);
    const supabase = createClient();
    let q = supabase.from("handovers").select("*, properties(name_en, name_ar, code)");
    if ("byDate" in filter) q = q.eq("shift_date", filter.byDate);
    else q = q.gte("shift_date", filter.fromDate).lte("shift_date", filter.toDate);
    if (propertyId) q = q.eq("property_id", propertyId);
    const { data, error: err } = await q;
    if (err) {
      setError(true);
      setRows([]);
      return;
    }
    setRows((data ?? []) as ManagerRow[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey, propertyId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  useHandoverRealtime(
    {
      onUpsert: () => {
        if (debounce.current) clearTimeout(debounce.current);
        debounce.current = setTimeout(() => load(), 300);
      },
      onReconcile: () => load(),
    },
    { channelName },
  );

  return { rows, error };
}
