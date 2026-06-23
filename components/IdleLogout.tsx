"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { signOut } from "@/lib/sign-out";

const WARN_SECONDS = 60; // show the countdown dialog during the final minute

// Global idle auto-logout. Admins & managers: 2 min; receptionists: 3 min. In the last 60s a
// countdown dialog appears with "I'm still here" / "Log out".
export function IdleLogout() {
  const { t, dir } = useLang();
  const { userId, role } = useAuth();

  const [warning, setWarning] = useState(false);
  const [remaining, setRemaining] = useState(WARN_SECONDS);

  // Mutable handles + flags kept in refs so the activity listener never re-binds.
  const warningRef = useRef(false);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  const armRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!userId) return;
    // Privileged roles (admin, manager) idle out faster than receptionists.
    const totalMs = (role === "admin" || role === "manager" ? 2 : 3) * 60 * 1000;

    const clearAll = () => {
      if (warnTimer.current) clearTimeout(warnTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (tick.current) clearInterval(tick.current);
    };

    const arm = () => {
      clearAll();
      warningRef.current = false;
      setWarning(false);
      warnTimer.current = setTimeout(() => {
        warningRef.current = true;
        setWarning(true);
        setRemaining(WARN_SECONDS);
        tick.current = setInterval(() => {
          setRemaining((s) => (s <= 1 ? 0 : s - 1));
        }, 1000);
      }, totalMs - WARN_SECONDS * 1000);
      idleTimer.current = setTimeout(() => signOut(), totalMs);
    };
    armRef.current = arm;

    const onActivity = () => {
      // Once the warning dialog is up, only the explicit button resets it.
      if (!warningRef.current) arm();
    };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    Promise.resolve().then(arm); // deferred so it's not a sync setState in the effect

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity));
      clearAll();
    };
  }, [userId, role]);

  if (!userId || !warning) return null;

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-5"
      role="alertdialog"
      aria-modal="true"
    >
      <div className="w-full max-w-[360px] rounded-aurion bg-paper p-6 text-center shadow-xl">
        <h2 className="text-[18px] font-bold text-ink">{t("idleTitle")}</h2>
        <p className="mt-2 text-[14px] text-ink-soft">
          {t("idleBody")}{" "}
          <span className="font-bold text-ink" dir="ltr">
            {remaining}
          </span>{" "}
          {t("idleSeconds")}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => armRef.current()}
            className="min-h-[50px] rounded-aurion bg-navy text-[16px] font-bold text-cream"
          >
            {t("stillHere")}
          </button>
          <button
            type="button"
            onClick={() => signOut()}
            className="min-h-[50px] rounded-aurion border border-line-strong bg-paper text-[16px] font-bold text-ink transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
          >
            {t("signOut")}
          </button>
        </div>
      </div>
    </div>
  );
}
