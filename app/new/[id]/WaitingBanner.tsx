"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";

// What the OUTGOING receptionist sees after submitting Step 1: a live "waiting"
// banner that flips to "confirmed" in real time when the incoming receptionist
// confirms (handover row → status 'completed' + incoming_name set).
export function WaitingBanner({
  handoverId,
  initialStatus,
  initialIncomingName,
  propertyName,
  propertyNameAr,
}: {
  handoverId: string;
  initialStatus: string;
  initialIncomingName: string | null;
  propertyName: string;
  propertyNameAr: string;
}) {
  const { t, lang } = useLang();
  const [status, setStatus] = useState(initialStatus);
  const [incomingName, setIncomingName] = useState(initialIncomingName);

  const confirmed = status === "completed";
  const hotel = lang === "ar" ? propertyNameAr : propertyName;

  useEffect(() => {
    if (confirmed) return;
    const supabase = createClient();

    // Catch any change that happened between the server render and subscribe.
    const refetch = async () => {
      const { data } = await supabase
        .from("handovers")
        .select("status, incoming_name")
        .eq("id", handoverId)
        .maybeSingle();
      if (data) {
        setStatus(data.status);
        setIncomingName(data.incoming_name);
      }
    };
    refetch();

    const channel = supabase
      .channel(`handover-${handoverId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "handovers", filter: `id=eq.${handoverId}` },
        (payload) => {
          const row = payload.new as { status: string; incoming_name: string | null };
          setStatus(row.status);
          setIncomingName(row.incoming_name);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [handoverId, confirmed]);

  return (
    <>
      <AppHeader titleKey="navNewTitle" />
      <main className="mx-auto flex w-full max-w-[480px] flex-col items-center gap-5 px-5 py-12 text-center">
        {confirmed ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-700">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-8 w-8">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-ink">{t("confirmedTitle")}</h1>
              {incomingName ? (
                <p className="mt-1 text-[15px] text-ink-soft">
                  {t("confirmedBy")} <span className="font-bold text-ink">{incomingName}</span>
                </p>
              ) : null}
              {hotel ? <p className="mt-0.5 text-[13px] text-muted">{hotel}</p> : null}
            </div>
          </>
        ) : (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-tint text-gold-deep">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-8 w-8 animate-pulse">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-[22px] font-bold text-ink">{t("waitingTitle")}</h1>
              <p className="mt-1 text-[15px] text-ink-soft">{t("waitingForConfirm")}</p>
              {hotel ? <p className="mt-0.5 text-[13px] text-muted">{hotel}</p> : null}
            </div>
          </>
        )}

        <Link
          href="/"
          className="mt-2 min-h-[48px] rounded-aurion border border-line-strong bg-paper px-6 text-[15px] font-bold leading-[48px] text-ink"
        >
          {t("backHome")}
        </Link>
      </main>
    </>
  );
}
