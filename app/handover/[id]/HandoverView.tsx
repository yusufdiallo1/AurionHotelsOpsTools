"use client";

import Link from "next/link";
import { useLang } from "@/lib/i18n";
import { SHIFT_OPTIONS, formatDate, formatSAR, type Handover, type ShiftType } from "@/lib/handover";
import { displayDigits } from "@/lib/digits";
import type { StringKey } from "@/lib/strings";

type Row = Handover & { properties?: { name_en: string; name_ar: string } | null };

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="text-[14px] text-ink-soft">{label}</span>
      <span className="text-end text-[15px] font-medium text-ink">{value}</span>
    </div>
  );
}

// Read-only view of one handover (no editing). For receptionists viewing their
// own past handovers.
export function HandoverView({
  handover: h,
  propertyNameEn,
  propertyNameAr,
}: {
  handover: Row;
  propertyNameEn: string;
  propertyNameAr: string;
}) {
  const { t, lang } = useLang();
  const propName = lang === "ar" ? propertyNameAr : propertyNameEn;
  const shiftKey =
    SHIFT_OPTIONS.find((s) => s.value === (h.shift_type as ShiftType))?.k ??
    ("shiftLabel" as StringKey);
  const variance = h.cash_variance;

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-5 py-6">
      <section className="glass rounded-aurion p-4">
        <h2 className="mb-2 text-[15px] font-bold text-ink">{t("outgoingSummary")}</h2>
        <SummaryRow label={t("propertyLabel")} value={propName} />
        <SummaryRow label={t("fieldDate")} value={formatDate(h.shift_date, lang)} />
        <SummaryRow label={t("shiftLabel")} value={t(shiftKey)} />
        <SummaryRow label={t("fieldYourName")} value={h.outgoing_name} />
        <SummaryRow label={t("fieldRooms")} value={displayDigits(h.rooms_occupied, lang)} />
        <SummaryRow label={t("fieldCashDrawer")} value={formatSAR(h.cash_drawer, lang)} />
        {h.pending_requests ? (
          <SummaryRow label={t("fieldPending")} value={h.pending_requests} />
        ) : null}
        {h.maintenance_issues ? (
          <SummaryRow label={t("fieldMaintenance")} value={h.maintenance_issues} />
        ) : null}
        {h.notes ? <SummaryRow label={t("fieldNotes")} value={h.notes} /> : null}
      </section>

      {h.status === "completed" ? (
        <section className="glass rounded-aurion p-4">
          <h2 className="mb-2 text-[15px] font-bold text-ink">{t("incomingDetails")}</h2>
          {h.incoming_name ? (
            <SummaryRow label={t("fieldIncomingName")} value={h.incoming_name} />
          ) : null}
          {h.incoming_rooms != null ? (
            <SummaryRow label={t("fieldRoomsRecount")} value={displayDigits(h.incoming_rooms, lang)} />
          ) : null}
          {h.cash_recount != null ? (
            <SummaryRow label={t("fieldCashRecount")} value={formatSAR(h.cash_recount, lang)} />
          ) : null}
          {variance != null ? (
            <SummaryRow label={t("varianceLabel")} value={formatSAR(variance, lang)} />
          ) : null}
          {h.variance_note ? (
            <SummaryRow label={t("fieldVarianceNote")} value={h.variance_note} />
          ) : null}
        </section>
      ) : (
        <p className="rounded-aurion border border-line bg-paper-tint px-4 py-3 text-center text-[14px] text-ink-soft">
          {t("statusPending")}
        </p>
      )}

      <Link
        href="/"
        className="flex min-h-[52px] w-full items-center justify-center rounded-aurion bg-navy text-[16px] font-bold text-cream"
      >
        {t("navHome")}
      </Link>
    </main>
  );
}
