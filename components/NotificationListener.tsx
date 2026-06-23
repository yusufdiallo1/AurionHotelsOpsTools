"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

type Toast = { id: string; title: string; body: string; handoverId: string | null };

// urlBase64 → Uint8Array for the VAPID applicationServerKey.
function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function registerPush() {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapid) return;
    const reg = await navigator.serviceWorker.register("/sw.js");
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
    }
    if (Notification.permission !== "granted") return;
    const existing = await reg.pushManager.getSubscription();
    const sub =
      existing ??
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapid) as BufferSource,
      }));
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });
  } catch {
    /* push is best-effort */
  }
}

export function NotificationListener() {
  const { t, dir } = useLang();
  const { userId, role } = useAuth();
  const [toast, setToast] = useState<Toast | null>(null);

  // Register Web Push once for receptionists (they receive incoming-handover pushes).
  useEffect(() => {
    if (userId && role === "receptionist") registerPush();
  }, [userId, role]);

  // Subscribe to this user's notifications via realtime.
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    // On load, surface the most recent UNREAD notification (so it works even if
    // the user wasn't online when it was created).
    (async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, title, body, handover_id")
        .eq("recipient_id", userId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(1);
      const n = data?.[0];
      if (n) {
        setToast({
          id: n.id,
          title: n.title || t("incomingHandoverTitle"),
          body: n.body || t("incomingHandoverBody"),
          handoverId: n.handover_id,
        });
      }
    })();

    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as {
            id: string;
            title: string;
            body: string;
            handover_id: string | null;
          };
          setToast({
            id: n.id,
            title: n.title || t("incomingHandoverTitle"),
            body: n.body || t("incomingHandoverBody"),
            handoverId: n.handover_id,
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, t]);

  if (!toast) return null;

  async function markRead(id: string) {
    try {
      await createClient().from("notifications").update({ read: true }).eq("id", id);
    } catch {
      /* best-effort */
    }
  }

  return (
    <div
      dir={dir}
      className="fixed inset-x-0 top-20 z-50 flex justify-center px-3"
      role="alert"
    >
      <div className="w-full max-w-[440px] rounded-aurion border border-gold/30 bg-navy p-4 text-cream shadow-[0_8px_30px_rgba(19,30,51,0.5)]">
        <p className="text-[15px] font-bold">{toast.title}</p>
        <p className="mt-0.5 text-[13px] text-cream/80">{toast.body}</p>
        <div className="mt-3 flex gap-2">
          {toast.handoverId ? (
            <Link
              href={`/new/${toast.handoverId}`}
              onClick={() => {
                markRead(toast.id);
                setToast(null);
              }}
              className="min-h-[40px] flex-1 rounded-full bg-gold px-4 text-center text-[14px] font-bold leading-[40px] text-navy-deep"
            >
              {t("openHandover")}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => {
              markRead(toast.id);
              setToast(null);
            }}
            className="min-h-[40px] rounded-full bg-white/15 px-4 text-[14px] font-bold text-cream"
          >
            {t("dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
