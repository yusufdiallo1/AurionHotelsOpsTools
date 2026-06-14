"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { SHIFT_OPTIONS, formatDate } from "@/lib/handover";
import { HandoverModal } from "@/components/HandoverModal";
import { WidgetSwitcher } from "./widgets/WidgetSwitcher";
import type { StringKey } from "@/lib/strings";

export type MyHandover = {
  id: string;
  outgoing_name: string;
  incoming_name: string | null;
  shift_type: string;
  shift_date: string;
  status: string;
  created_at: string | null;
  properties: { name_en: string; name_ar: string } | null;
};

export function ReceptionistHome({
  myName,
  pending,
  mine,
  propertyId,
  propSlug,
}: {
  myName: string;
  pending: MyHandover[];
  mine: MyHandover[];
  propertyId: string | null;
  propSlug: string | null;
}) {
  const { t, lang } = useLang();
  const [pend, setPend] = useState<MyHandover[]>(pending);
  const [viewId, setViewId] = useState<string | null>(null);

  const shiftLabel = (s: string) =>
    t(SHIFT_OPTIONS.find((o) => o.value === s)?.k ?? ("shiftLabel" as StringKey));
  const hotel = (h: MyHandover) =>
    h.properties ? (lang === "ar" ? h.properties.name_ar : h.properties.name_en) : "";

  // Live: a new pending incoming handover at my hotel should appear immediately,
  // and disappear once it's confirmed.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("recep-home")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "handovers" },
        async () => {
          // Re-fetch is simplest + always correct. Refresh the page data.
          const { data } = await supabase
            .from("handovers")
            .select("id, outgoing_name, incoming_name, shift_type, shift_date, status, created_at, properties(name_en, name_ar)")
            .eq("status", "pending_incoming")
            .order("created_at", { ascending: false });
          const fresh = (data ?? []).filter(
            (h) => (h.outgoing_name ?? "").trim().toLowerCase() !== myName.trim().toLowerCase(),
          ) as unknown as MyHandover[];
          setPend(fresh);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [myName]);

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-5 px-5 py-6">
      {propertyId && propSlug ? (
        <WidgetSwitcher
          role="receptionist"
          scope={{ kind: "hotel", slug: propSlug, propertyId }}
        />
      ) : null}

      {/* Pending incoming handovers — confirm now */}
      {pend.length > 0 ? (
        <section className="flex flex-col gap-3">
          {pend.map((h) => (
            <Link
              key={h.id}
              href={`/new/${h.id}`}
              className="glass-navy flex items-center justify-between gap-3 rounded-aurion p-4 text-cream shadow-md"
            >
              <span className="flex flex-col">
                <span className="text-[15px] font-bold">{t("incomingWaitingTitle")}</span>
                <span className="mt-0.5 text-[13px] text-cream/80">
                  {hotel(h)} · {shiftLabel(h.shift_type)} · {h.outgoing_name}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-gold px-3 py-1.5 text-[13px] font-bold text-navy-deep">
                {t("openHandover")}
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {/* Start a new handover */}
      <Link
        href="/new"
        className="flex items-center justify-between gap-3 rounded-aurion border border-line bg-paper p-4"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-aurion bg-gold-tint text-gold-deep">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-6 w-6">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </span>
          <span className="flex flex-col">
            <span className="text-[15px] font-bold text-ink">{t("navNewTitle")}</span>
            <span className="text-[13px] text-ink-soft">{t("navNewDesc")}</span>
          </span>
        </span>
        <span className="text-gold-deep">→</span>
      </Link>

      {/* My handovers */}
      <section>
        <h2 className="mb-2 text-[15px] font-bold text-ink">{t("myHandovers")}</h2>
        {mine.length === 0 ? (
          <p className="py-6 text-center text-[14px] text-ink-soft">{t("noMyHandovers")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {mine.map((h) => {
              const iAmOutgoing = (h.outgoing_name ?? "").trim().toLowerCase() === myName.trim().toLowerCase();
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setViewId(h.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-aurion border border-line bg-paper px-4 py-3 text-start"
                >
                  <span className="flex flex-col">
                    <span className="text-[14px] font-bold text-ink">
                      {hotel(h)} · {shiftLabel(h.shift_type)}
                    </span>
                    <span className="text-[12px] text-ink-soft" dir="ltr">
                      {formatDate(h.shift_date, lang)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        h.status === "completed" ? "bg-green-100 text-green-800" : "bg-gold-tint text-gold-deep"
                      }`}
                    >
                      {h.status === "completed" ? t("statusCompleted") : t("statusPending")}
                    </span>
                    <span className="text-[11px] text-muted">
                      {iAmOutgoing ? t("outgoingTag") : t("incomingTag")}
                    </span>
                  </span>
                </button>
              );
            })}
          </ul>
        )}
      </section>

      {viewId ? <HandoverModal id={viewId} onClose={() => setViewId(null)} /> : null}
    </main>
  );
}
