"use client";

import { useState } from "react";
import { mt, type ManagerKey, type ManagerLang } from "@/lib/manager-i18n";

export type PasscodeRow = {
  id: string;
  full_name: string;
  email: string;
};

// The username is the part before @aurion.local; it's also the default passcode.
function usernameOf(email: string): string {
  return (email || "").split("@")[0] || email;
}

// View + reset the per-hotel shared login passcodes (temp cover accounts).
// Visible to admins AND managers (managers cannot activate/deactivate, only see + reset).
export function Passcodes({ initial, lang }: { initial: PasscodeRow[]; lang: ManagerLang }) {
  const t = (k: ManagerKey) => mt(k, lang);
  const [rows] = useState<PasscodeRow[]>(initial);
  // Current passcode shown per account (defaults to the username); updated on reset.
  const [codes, setCodes] = useState<Record<string, string>>(
    () => Object.fromEntries(initial.map((r) => [r.id, usernameOf(r.email)])),
  );
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  async function save(id: string) {
    const next = draft.trim();
    if (busy || next.length < 4) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/manager/passcode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, password: next }),
      });
      const json = await res.json();
      if (json.ok) {
        setCodes((prev) => ({ ...prev, [id]: next }));
        setReveal((prev) => ({ ...prev, [id]: true }));
        setEditing(null);
        setMsg({ id, ok: true, text: t("passcodeUpdated") });
      } else {
        setMsg({ id, ok: false, text: t("passcodeError") });
      }
    } catch {
      setMsg({ id, ok: false, text: t("passcodeError") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="glass rounded-aurion p-4">
      <h2 className="mb-1 text-[15px] font-bold text-ink">{t("passcodes")}</h2>
      <p className="mb-3 text-[12px] text-ink-soft">{t("passcodesHint")}</p>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => {
          const shown = reveal[r.id];
          const code = codes[r.id];
          return (
            <li key={r.id} className="rounded-aurion border border-line bg-paper p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-[15px] font-bold text-ink">{r.full_name}</span>
                  <span className="truncate text-[12px] text-ink-soft" dir="ltr">
                    {usernameOf(r.email)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-[14px] font-bold text-ink" dir="ltr">
                    {shown ? code : "••••••"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReveal((p) => ({ ...p, [r.id]: !shown }))}
                    className="text-[12px] font-bold text-gold-deep"
                  >
                    {shown ? t("hide") : t("show")}
                  </button>
                </div>
              </div>

              {editing === r.id ? (
                <div className="mt-3 flex flex-col gap-2">
                  <input
                    dir="ltr"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={t("newPasscode")}
                    className="min-h-[44px] w-full rounded-aurion border border-line bg-paper px-3 text-ink outline-none focus:border-gold-deep"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => save(r.id)}
                      disabled={busy || draft.trim().length < 4}
                      className="min-h-[44px] rounded-aurion bg-navy text-[14px] font-bold text-cream disabled:bg-line-strong disabled:text-[#8A8270]"
                    >
                      {busy ? t("saving") : t("save")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(null)}
                      className="min-h-[44px] rounded-aurion border border-line-strong bg-paper text-[14px] font-bold text-ink"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(r.id);
                    setDraft("");
                    setMsg(null);
                  }}
                  className="mt-3 min-h-[44px] w-full rounded-aurion border border-line-strong bg-paper text-[14px] font-bold text-ink"
                >
                  {t("changePasscode")}
                </button>
              )}

              {msg && msg.id === r.id ? (
                <p className={`mt-2 text-[13px] font-medium ${msg.ok ? "text-green-700" : "text-red-700"}`}>
                  {msg.text}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
