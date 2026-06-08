"use client";

import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { SHIFT_OPTIONS, formatDate, formatSAR, type ShiftType } from "@/lib/handover";
import { displayDigits } from "@/lib/digits";
import type { StringKey } from "@/lib/strings";

type Full = {
  id: string;
  outgoing_name: string;
  incoming_name: string | null;
  shift_type: string;
  shift_date: string;
  status: string;
  rooms_occupied: number;
  incoming_rooms: number | null;
  cash_drawer: number;
  cash_recount: number | null;
  cash_variance: number | null;
  pending_requests: string | null;
  maintenance_issues: string | null;
  notes: string | null;
  variance_note: string | null;
  properties: { name_en: string; name_ar: string } | null;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="text-[13px] text-ink-soft">{label}</span>
      <span className="text-end text-[14px] font-medium text-ink">{value}</span>
    </div>
  );
}

// Read-only handover details in a modal (receptionist stays on the current page).
export function HandoverModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { t, lang, dir } = useLang();
  const [h, setH] = useState<Full | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("handovers")
      .select(
        "id, outgoing_name, incoming_name, shift_type, shift_date, status, rooms_occupied, incoming_rooms, cash_drawer, cash_recount, cash_variance, pending_requests, maintenance_issues, notes, variance_note, properties(name_en, name_ar)",
      )
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => setH(data as unknown as Full));
  }, [id]);

  const propName = h?.properties ? (lang === "ar" ? h.properties.name_ar : h.properties.name_en) : "";
  const shiftKey = h
    ? SHIFT_OPTIONS.find((s) => s.value === (h.shift_type as ShiftType))?.k ?? ("shiftLabel" as StringKey)
    : ("shiftLabel" as StringKey);

  return (
    <div
      dir={dir}
      className="fixed inset-0 z-[75] flex items-start justify-center bg-black/40 px-4 pt-16"
      onClick={onClose}
    >
      <div
        className="max-h-[80vh] w-full max-w-[460px] overflow-y-auto rounded-aurion bg-paper p-4 text-ink shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[16px] font-bold">{t("detailTitle")}</h2>
          <button type="button" onClick={onClose} className="text-[13px] font-bold text-ink-soft">
            {t("close")}
          </button>
        </div>

        {!h ? (
          <p className="py-8 text-center text-[14px] text-ink-soft">{t("loading")}</p>
        ) : (
          <>
            <section className="mb-3 rounded-aurion border border-line p-3">
              <h3 className="mb-1 text-[14px] font-bold">{t("outgoingSummary")}</h3>
              <Row label={t("propertyLabel")} value={propName} />
              <Row label={t("fieldDate")} value={formatDate(h.shift_date, lang)} />
              <Row label={t("shiftLabel")} value={t(shiftKey)} />
              <Row label={t("fieldYourName")} value={h.outgoing_name} />
              <Row label={t("fieldRooms")} value={displayDigits(h.rooms_occupied, lang)} />
              <Row label={t("fieldCashDrawer")} value={formatSAR(h.cash_drawer, lang)} />
              {h.pending_requests ? <Row label={t("fieldPending")} value={h.pending_requests} /> : null}
              {h.maintenance_issues ? <Row label={t("fieldMaintenance")} value={h.maintenance_issues} /> : null}
              {h.notes ? <Row label={t("fieldNotes")} value={h.notes} /> : null}
            </section>

            {h.status === "completed" ? (
              <section className="rounded-aurion border border-line p-3">
                <h3 className="mb-1 text-[14px] font-bold">{t("incomingDetails")}</h3>
                {h.incoming_name ? <Row label={t("fieldIncomingName")} value={h.incoming_name} /> : null}
                {h.incoming_rooms != null ? (
                  <Row label={t("fieldRoomsRecount")} value={displayDigits(h.incoming_rooms, lang)} />
                ) : null}
                {h.cash_recount != null ? (
                  <Row label={t("fieldCashRecount")} value={formatSAR(h.cash_recount, lang)} />
                ) : null}
                {h.cash_variance != null ? (
                  <Row label={t("varianceLabel")} value={formatSAR(h.cash_variance, lang)} />
                ) : null}
                {h.variance_note ? <Row label={t("fieldVarianceNote")} value={h.variance_note} /> : null}
              </section>
            ) : (
              <p className="rounded-aurion border border-line bg-paper-tint px-4 py-3 text-center text-[14px] text-ink-soft">
                {t("statusPending")}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
