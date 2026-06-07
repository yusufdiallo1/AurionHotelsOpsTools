"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { mt, type ManagerKey, type ManagerLang } from "@/lib/manager-i18n";

type AuditRow = {
  id: string;
  action: string;
  actor_name: string;
  handover_id: string | null;
  created_at: string | null;
};

const ACTION_KEY: Record<string, ManagerKey> = {
  handover_created: "actCreated",
  handover_completed: "actCompleted",
  sheet_synced: "actSynced",
  drive_uploaded: "actDrive",
};

// Manager-only live activity feed over the audit_log table.
export function ActivityLog({ lang }: { lang: ManagerLang }) {
  const t = (k: ManagerKey) => mt(k, lang);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const loaded = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const fetchRows = async () => {
      const { data } = await supabase
        .from("audit_log")
        .select("id, action, actor_name, handover_id, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (!cancelled) setRows((data ?? []) as AuditRow[]);
    };
    fetchRows();
    loaded.current = true;

    const channel = supabase
      .channel("audit-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "audit_log" },
        (payload) => {
          const r = payload.new as AuditRow;
          setRows((prev) => [r, ...prev].slice(0, 30));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  function ts(v: string | null): string {
    return v ? v.slice(0, 16).replace("T", " ") : "";
  }

  return (
    <section className="glass rounded-aurion p-4">
      <h2 className="mb-3 text-[15px] font-bold text-ink">{t("activity")}</h2>
      {rows.length === 0 ? (
        <p className="text-[14px] text-ink-soft">{t("activityNone")}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 border-b border-line/70 py-2.5 last:border-0"
            >
              <span className="flex flex-col">
                <span className="text-[14px] font-medium text-ink">
                  {t(ACTION_KEY[r.action] ?? "activity")}
                  {r.actor_name ? ` · ${r.actor_name}` : ""}
                </span>
                <span className="text-[12px] text-ink-soft" dir="ltr">
                  {ts(r.created_at)}
                </span>
              </span>
              {r.handover_id ? (
                <Link
                  href={`/history/${r.handover_id}`}
                  className="shrink-0 text-[13px] font-bold text-gold-deep"
                >
                  {t("viewItem")}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
