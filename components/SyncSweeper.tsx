"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// On every app load, retry any completed handovers that never reached Google
// Sheets. The sync route is idempotent, so this can't double-append. Runs once,
// best-effort, silent. (CLAUDE.md reliability #4)
export function SyncSweeper() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("handovers")
          .select("id")
          .eq("status", "completed")
          .eq("synced_to_sheets", false)
          .limit(25);
        if (cancelled || !data?.length) return;
        for (const row of data) {
          if (cancelled) break;
          try {
            await fetch("/api/sync-handover", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id: row.id }),
            });
          } catch {
            /* offline / transient — next load retries */
          }
        }
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
