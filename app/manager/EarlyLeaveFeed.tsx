"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mt, type ManagerLang } from "@/lib/manager-i18n";

type Row = { id: string; requester_name: string; shift_type: string; created_at: string | null };

// Manager-only, read-only feed of today's early-leave requests (info, no action).
export function EarlyLeaveFeed({ lang }: { lang: ManagerLang }) {
  const t = (k: Parameters<typeof mt>[0]) => mt(k, lang);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const load = async () => {
      const { data } = await supabase
        .from("early_leave_requests")
        .select("id, requester_name, shift_type, created_at")
        .eq("shift_date", today)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Row[]);
    };
    load();
    const channel = supabase
      .channel("mgr-early")
      .on("postgres_changes", { event: "*", schema: "public", table: "early_leave_requests" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function ts(v: string | null) {
    return v ? v.slice(11, 16) : "";
  }

  return (
    <section className="glass rounded-aurion p-4">
      <h2 className="mb-3 text-[15px] font-bold text-ink">{t("earlyLeaves")}</h2>
      {rows.length === 0 ? (
        <p className="text-[14px] text-ink-soft">{t("earlyLeavesNone")}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 last:border-0">
              <span className="text-[14px] text-ink">
                <span className="font-bold">{r.requester_name}</span> {t("leftEarly")}
              </span>
              <span className="text-[12px] text-ink-soft" dir="ltr">{ts(r.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
