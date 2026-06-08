"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { SHIFT_OPTIONS, formatClock12 } from "@/lib/handover";
import type { StringKey } from "@/lib/strings";

export type TempRow = {
  id: string;
  full_name: string;
  email: string;
  property_id: string | null;
  shift_type: string | null;
  active: boolean;
  temp_active_until: string | null;
};

// Per-hotel temp cover accounts: admin activates one for a shift (auto-locks
// 1.5h after that shift ends). Same fixed username/password reused each time.
export function TempAccounts({ initial }: { initial: TempRow[] }) {
  const { t } = useLang();
  const [rows, setRows] = useState<TempRow[]>(initial);
  const [picking, setPicking] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const username = (email: string) => (email || "").split("@")[0];

  async function activate(row: TempRow, shift: string) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/temp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, activate: true, property_id: row.property_id, shift }),
      });
      const json = await res.json();
      if (json.ok) {
        setRows((prev) =>
          prev.map((r) =>
            r.id === row.id ? { ...r, active: true, shift_type: shift, temp_active_until: json.until } : r,
          ),
        );
        setPicking(null);
      }
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(row: TempRow) {
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, active: false, temp_active_until: null } : r)));
    await fetch("/api/admin/temp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, activate: false }),
    });
  }

  return (
    <section className="glass rounded-aurion p-4">
      <h2 className="mb-3 text-[15px] font-bold text-ink">{t("tempAccounts")}</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const until = r.temp_active_until ? new Date(r.temp_active_until) : null;
          return (
            <li key={r.id} className="rounded-aurion border border-line bg-paper p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[15px] font-bold text-ink">{r.full_name}</span>
                  <span className="text-[12px] text-ink-soft" dir="ltr">
                    {t("tempLogin")}: {username(r.email)} / {username(r.email)}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    r.active ? "bg-green-100 text-green-800" : "bg-line text-ink-soft"
                  }`}
                >
                  {r.active && until ? `${t("tempActive")} ${formatClock12(until)}` : t("tempInactive")}
                </span>
              </div>

              {r.active ? (
                <button
                  type="button"
                  onClick={() => deactivate(r)}
                  className="mt-3 min-h-[44px] w-full rounded-aurion border border-line-strong bg-paper text-[14px] font-bold text-ink"
                >
                  {t("deactivateTemp")}
                </button>
              ) : picking === r.id ? (
                <div className="mt-3 flex flex-col gap-2">
                  <span className="text-[13px] font-bold text-ink">{t("pickShift")}</span>
                  <div className="grid grid-cols-3 gap-2">
                    {SHIFT_OPTIONS.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        disabled={busy}
                        onClick={() => activate(r, s.value)}
                        className="min-h-[44px] rounded-aurion border border-line bg-paper text-[14px] font-bold text-ink hover:border-gold-deep disabled:opacity-60"
                      >
                        {t(s.k as StringKey)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPicking(r.id)}
                  className="mt-3 min-h-[44px] w-full rounded-aurion bg-navy text-[14px] font-bold text-cream"
                >
                  {t("activateTemp")}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
