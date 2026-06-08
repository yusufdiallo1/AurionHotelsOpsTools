"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";

// Admin changes their own password (current + new, verified server-side).
export function ChangePassword() {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; key: StringKey } | null>(null);

  const inputCls =
    "min-h-[48px] w-full rounded-aurion border border-line bg-paper px-4 text-ink outline-none focus:border-gold-deep";

  async function submit() {
    if (busy || !current || next.length < 6) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const json = await res.json();
      if (json.ok) {
        setMsg({ ok: true, key: "passwordChanged" });
        setCurrent("");
        setNext("");
      } else {
        setMsg({
          ok: false,
          key:
            json.reason === "wrong_current"
              ? "errWrongCurrent"
              : json.reason === "too_short"
                ? "errPasswordShort"
                : "employeeError",
        });
      }
    } catch {
      setMsg({ ok: false, key: "employeeError" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass rounded-aurion p-4">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-[15px] font-bold text-ink"
      >
        {t("changePassword")}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={`h-4 w-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open ? (
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink">{t("currentPassword")}</span>
            <input type="password" dir="ltr" autoComplete="current-password" value={current} onChange={(e) => { setCurrent(e.target.value); setMsg(null); }} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-bold text-ink">{t("newPassword")}</span>
            <input type="password" dir="ltr" autoComplete="new-password" value={next} onChange={(e) => { setNext(e.target.value); setMsg(null); }} className={inputCls} />
          </label>
          {msg ? (
            <p className={`text-[14px] font-medium ${msg.ok ? "text-green-700" : "text-red-700"}`}>{t(msg.key)}</p>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={busy || !current || next.length < 6}
            className="min-h-[50px] rounded-aurion bg-navy text-[16px] font-bold text-cream disabled:bg-line-strong disabled:text-[#8A8270]"
          >
            {t("savePassword")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
