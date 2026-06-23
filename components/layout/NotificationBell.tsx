"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

type Notif = {
  id: string;
  title: string;
  body: string;
  handover_id: string | null;
  read: boolean;
  created_at: string | null;
};

// Bell in the header: unread badge + a modal listing all of the user's notifications.
export function NotificationBell() {
  const { t, dir } = useLang();
  const { userId } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);

  const unread = items.filter((n) => !n.read).length;

  async function load() {
    if (!userId) return;
    const { data } = await createClient()
      .from("notifications")
      .select("id, title, body, handover_id, read, created_at")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setItems((data ?? []) as Notif[]);
  }

  useEffect(() => {
    if (!userId) return;
    Promise.resolve().then(load);
    const supabase = createClient();
    const channel = supabase
      .channel(`bell-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  async function markAllRead() {
    if (!userId) return;
    await createClient().from("notifications").update({ read: true }).eq("recipient_id", userId).eq("read", false);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function ts(v: string | null) {
    return v ? v.slice(0, 16).replace("T", " ") : "";
  }

  if (!userId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("notificationsTitle")}
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-cream hover:bg-white/20"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a2 2 0 0 0 3.4 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          dir={dir}
          className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 px-4 pt-20"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[440px] rounded-aurion bg-paper p-4 text-ink shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-bold">{t("notificationsTitle")}</h2>
              <div className="flex items-center gap-3">
                {unread > 0 ? (
                  <button type="button" onClick={markAllRead} className="text-[13px] font-bold text-gold-deep">
                    {t("markAllRead")}
                  </button>
                ) : null}
                <button type="button" onClick={() => setOpen(false)} className="text-[13px] font-bold text-ink-soft">
                  {t("close")}
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="py-8 text-center text-[14px] text-ink-soft">{t("notificationsEmpty")}</p>
            ) : (
              <ul className="flex max-h-[60vh] flex-col overflow-y-auto">
                {items.map((n) => {
                  const inner = (
                    <div
                      className={`flex flex-col gap-0.5 rounded-aurion px-3 py-2.5 ${n.read ? "" : "bg-gold-tint/60"}`}
                    >
                      <div className="flex items-center gap-2">
                        {!n.read ? <span className="h-2 w-2 shrink-0 rounded-full bg-gold-deep" /> : null}
                        <span className="text-[14px] font-bold">{n.title}</span>
                      </div>
                      <span className="text-[13px] text-ink-soft">{n.body}</span>
                      <span className="text-[11px] text-muted" dir="ltr">{ts(n.created_at)}</span>
                    </div>
                  );
                  return (
                    <li key={n.id} className="border-b border-line/60 last:border-0">
                      {n.handover_id ? (
                        <Link href={`/new/${n.handover_id}`} onClick={() => setOpen(false)} className="block">
                          {inner}
                        </Link>
                      ) : (
                        inner
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
