"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import { msUntilWindow, type ShiftType } from "@/lib/handover";

// Gate for /new: a receptionist can only start a handover within 30 min of their
// shift end — unless they've requested early leave and the next-shift receptionist
// approved it. Admins are never gated.
export function HandoverGate({ children }: { children: React.ReactNode }) {
  const { t, dir } = useLang();
  const { userId, role, shiftType } = useAuth();

  const [now, setNow] = useState<Date | null>(null);
  const [early, setEarly] = useState<"none" | "pending" | "approved" | "denied">("none");
  const [busy, setBusy] = useState(false);
  const reqId = useRef<string | null>(null);

  // Tick the clock once mounted (avoids SSR/now mismatch). Deferred a microtask
  // so the first set isn't a synchronous setState in the effect body.
  useEffect(() => {
    Promise.resolve().then(() => setNow(new Date()));
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load any existing early-leave request for today + watch it live.
  useEffect(() => {
    if (!userId || role !== "receptionist") return;
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    const load = async () => {
      const { data } = await supabase
        .from("early_leave_requests")
        .select("id, status")
        .eq("requester_id", userId)
        .eq("shift_date", today)
        .order("created_at", { ascending: false })
        .limit(1);
      const r = data?.[0];
      if (r) {
        reqId.current = r.id;
        setEarly(r.status as "pending" | "approved" | "denied");
      }
    };
    load();
    const channel = supabase
      .channel(`early-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "early_leave_requests", filter: `requester_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, role]);

  // Admins (or anyone without a shift) are never gated.
  if (role !== "receptionist" || !shiftType) return <>{children}</>;
  if (!now) return null; // wait for the client clock

  const remainingMs = msUntilWindow(shiftType as ShiftType, now);
  const open = remainingMs <= 0 || early === "approved";
  if (open) return <>{children}</>;

  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const countdown = hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;

  async function requestEarly() {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/early-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request" }),
      });
      const json = await res.json();
      if (json.ok) setEarly(json.status === "approved" ? "approved" : "pending");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <AppHeader titleKey="navNewTitle" />
      <main dir={dir} className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-5 px-5 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-tint text-gold-deep">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-8 w-8">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-[22px] font-bold text-ink">{t("handoverLockedTitle")}</h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            {t("handoverOpensIn")}{" "}
            <span className="font-bold text-ink" dir="ltr">{countdown}</span>
          </p>
        </div>

        {early === "pending" ? (
          <p className="rounded-aurion border border-gold/40 bg-gold-tint/50 px-4 py-3 text-[14px] font-medium text-ink">
            {t("earlyRequested")}
          </p>
        ) : early === "denied" ? (
          <p className="rounded-aurion border-2 border-red-600 bg-red-50 px-4 py-3 text-[14px] font-medium text-red-800">
            {t("earlyDenied")}
          </p>
        ) : (
          <div className="flex w-full flex-col items-center gap-2">
            <p className="text-[14px] text-ink-soft">{t("leaveEarly")}</p>
            <button
              type="button"
              onClick={requestEarly}
              disabled={busy}
              className="min-h-[50px] w-full rounded-aurion bg-navy text-[16px] font-bold text-cream disabled:opacity-60"
            >
              {t("requestEarlyLeave")}
            </button>
          </div>
        )}

        <Link href="/" className="text-[14px] font-bold text-gold-deep">
          {t("navHome")}
        </Link>
      </main>
    </>
  );
}
