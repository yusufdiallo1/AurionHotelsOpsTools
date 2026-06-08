"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout";
import {
  ConfirmDialog,
  NumberField,
  PrimaryButton,
  TextAreaField,
  TextField,
} from "@/components/ui";
import { useLang } from "@/lib/i18n";
import { useOnline } from "@/lib/useOnline";
import { createClient } from "@/lib/supabase/client";
import { withRetry } from "@/lib/retry";
import {
  MAX_NAME,
  MAX_TEXTAREA,
  formatDate,
  formatSAR,
  parseAmount,
  type Handover,
  type ShiftType,
} from "@/lib/handover";
import { SHIFT_OPTIONS } from "@/lib/handover";
import { displayDigits } from "@/lib/digits";
import type { StringKey } from "@/lib/strings";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="text-[14px] text-ink-soft">{label}</span>
      <span className="text-end text-[15px] font-medium text-ink">{value}</span>
    </div>
  );
}

export function IncomingForm({
  handover,
  propertyName,
  propertyNameAr,
  lockedIncomingName = "",
  incomingShift = "",
}: {
  handover: Handover;
  propertyName: string;
  propertyNameAr: string;
  lockedIncomingName?: string;
  incomingShift?: string;
}) {
  const { t, lang } = useLang();
  const online = useOnline();
  const propName = lang === "ar" ? propertyNameAr : propertyName;

  // A signed-in receptionist confirms as themselves — name is pre-filled + locked.
  const lockName = lockedIncomingName.trim().length > 0;
  const incomingShiftKey =
    SHIFT_OPTIONS.find((s) => s.value === incomingShift)?.k ?? null;
  const [step, setStep] = useState<2 | 3>(2);
  const [incomingName, setIncomingName] = useState(lockedIncomingName);
  const [rooms, setRooms] = useState("");
  const [recount, setRecount] = useState("");
  const [varianceNote, setVarianceNote] = useState("");
  const [roomsNote, setRoomsNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncRetry, setSyncRetry] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const recountNum = parseAmount(recount);
  const variance = useMemo(
    () => (recountNum === null ? null : recountNum - handover.cash_drawer),
    [recountNum, handover.cash_drawer],
  );
  const hasMismatch = variance !== null && Math.abs(variance) > 0.005;

  const roomsNum = rooms.trim() === "" ? null : parseInt(rooms, 10);
  // Room mismatch: incoming recount differs from the outgoing rooms_occupied.
  const roomsMismatch = roomsNum !== null && roomsNum !== handover.rooms_occupied;

  // Each discrepancy gets its OWN required note.
  const valid =
    incomingName.trim().length > 0 &&
    roomsNum !== null &&
    roomsNum >= 0 &&
    recountNum !== null &&
    recountNum >= 0 &&
    (!hasMismatch || varianceNote.trim().length > 0) &&
    (!roomsMismatch || roomsNote.trim().length > 0);

  const shiftKey =
    SHIFT_OPTIONS.find((s) => s.value === (handover.shift_type as ShiftType))?.k ??
    ("shiftLabel" as StringKey);

  async function doConfirm() {
    if (!valid || submitting || !online) return; // guard double-tap / offline
    setConfirmOpen(false);
    setSubmitting(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updErr } = await withRetry(async () =>
        supabase
          .from("handovers")
          .update({
            incoming_name: incomingName.trim(),
            incoming_rooms: roomsNum!,
            cash_recount: recountNum!,
            variance_note: hasMismatch ? varianceNote.trim() : null,
            rooms_note: roomsMismatch ? roomsNote.trim() : null,
            incoming_signed_at: new Date().toISOString(),
            status: "completed",
          })
          .eq("id", handover.id)
          .eq("status", "pending_incoming"), // idempotent: don't re-complete
      );
      if (updErr) throw updErr;

      // Sheets sync — never blocks success. Data is already safe in Supabase.
      try {
        const res = await fetch("/api/sync-handover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: handover.id }),
        });
        if (!res.ok) setSyncRetry(true);
      } catch {
        setSyncRetry(true);
      }

      setStep(3);
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 3) {
    return (
      <>
        <AppHeader titleKey="successTitle" steps={3} currentStep={3} />
        <main className="mx-auto flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-4 px-5 py-16 text-center">
          <span className="text-5xl text-gold-deep">✓</span>
          <h1 className="text-xl font-bold text-ink">{t("successTitle")}</h1>
          <p className="text-[15px] text-ink-soft">
            {syncRetry ? t("syncRetryNote") : t("successBody")}
          </p>
          <div className="mt-2 flex w-full flex-col gap-2">
            <Link
              href="/"
              className="flex min-h-[52px] w-full items-center justify-center rounded-aurion bg-navy text-[17px] font-bold text-cream"
            >
              {t("navHome")}
            </Link>
            <Link
              href="/new"
              className="flex min-h-[52px] w-full items-center justify-center rounded-aurion border border-line-strong bg-paper text-[17px] font-bold text-ink"
            >
              {t("newHandover")}
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader titleKey="step2Title" steps={3} currentStep={2} />

      {!online ? (
        <div className="bg-amber-100 px-5 py-2 text-center text-[13px] font-medium text-amber-900">
          {t("offlineBanner")}
        </div>
      ) : null}

      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-5 py-6">
        {/* Read-only outgoing summary */}
        <section className="glass rounded-aurion p-4">
          <h2 className="mb-2 text-[15px] font-bold text-ink">
            {t("outgoingSummary")}
          </h2>
          <SummaryRow label={t("propertyLabel")} value={propName} />
          <SummaryRow label={t("fieldDate")} value={formatDate(handover.shift_date, lang)} />
          <SummaryRow label={t("shiftLabel")} value={t(shiftKey)} />
          <SummaryRow label={t("fieldYourName")} value={handover.outgoing_name} />
          <SummaryRow
            label={t("fieldRooms")}
            value={displayDigits(handover.rooms_occupied, lang)}
          />
          <SummaryRow
            label={t("fieldCashDrawer")}
            value={formatSAR(handover.cash_drawer, lang)}
          />
          {handover.pending_requests ? (
            <SummaryRow label={t("fieldPending")} value={handover.pending_requests} />
          ) : null}
          {handover.maintenance_issues ? (
            <SummaryRow label={t("fieldMaintenance")} value={handover.maintenance_issues} />
          ) : null}
          {handover.notes ? (
            <SummaryRow label={t("fieldNotes")} value={handover.notes} />
          ) : null}
        </section>

        {lockName ? (
          /* Incoming receptionist identity — name + shift + hotel, all locked. */
          <section className="glass rounded-aurion p-4">
            <h2 className="mb-2 text-[15px] font-bold text-ink">{t("incomingDetails")}</h2>
            <SummaryRow label={t("fieldIncomingName")} value={incomingName} />
            {incomingShiftKey ? (
              <SummaryRow label={t("shiftLabel")} value={t(incomingShiftKey)} />
            ) : null}
            <SummaryRow label={t("propertyLabel")} value={propName} />
          </section>
        ) : (
          <TextField
            labelKey="fieldIncomingName"
            placeholderKey="fieldIncomingNamePlaceholder"
            value={incomingName}
            onChange={setIncomingName}
            autoComplete="name"
            maxLength={MAX_NAME}
          />
        )}

        {/* Incoming receptionist re-verifies the room count + recounts cash. */}
        <NumberField
          labelKey="fieldRoomsRecount"
          value={rooms}
          onChange={setRooms}
          mode="integer"
        />

        {/* Room count mismatch warning */}
        {roomsMismatch ? (
          <div className="flex flex-col gap-2 rounded-aurion border-2 border-red-600 bg-red-50 p-4">
            <p className="text-[15px] font-bold text-red-800">{t("roomsMismatchTitle")}</p>
            <p className="text-[14px] text-red-700">{t("roomsMismatchBody")}</p>
            <div className="flex justify-between text-[14px] text-red-800">
              <span dir="ltr">{t("expectedRooms")}: {handover.rooms_occupied}</span>
              <span dir="ltr">{t("countedRooms")}: {roomsNum}</span>
            </div>
            <TextAreaField
              labelKey="fieldRoomsNote"
              placeholderKey="fieldRoomsNotePlaceholder"
              value={roomsNote}
              onChange={setRoomsNote}
              maxLength={MAX_TEXTAREA}
            />
          </div>
        ) : null}

        <NumberField
          labelKey="fieldCashRecount"
          value={recount}
          onChange={setRecount}
          mode="money"
          suffix={lang === "ar" ? "ر.س" : "SAR"}
        />

        {/* Live variance readout */}
        {recountNum !== null ? (
          <div className="flex items-center justify-between rounded-aurion border border-line bg-paper-tint px-4 py-3 text-[14px]">
            <span className="text-ink-soft">{t("varianceLabel")}</span>
            <span
              className={
                hasMismatch ? "font-bold text-red-700" : "font-bold text-ink"
              }
            >
              {formatSAR(variance, lang)}
            </span>
          </div>
        ) : null}

        {/* Cash mismatch warning */}
        {hasMismatch ? (
          <div className="flex flex-col gap-2 rounded-aurion border-2 border-red-600 bg-red-50 p-4">
            <p className="text-[15px] font-bold text-red-800">{t("cashMismatchTitle")}</p>
            <p className="text-[14px] text-red-700">{t("cashMismatchBody")}</p>
            <div className="flex justify-between text-[14px] text-red-800">
              <span>
                {t("expectedLabel")}: {formatSAR(handover.cash_drawer, lang)}
              </span>
              <span>
                {t("countedLabel")}: {formatSAR(recountNum, lang)}
              </span>
            </div>
            <TextAreaField
              labelKey="fieldVarianceNote"
              placeholderKey="fieldVarianceNotePlaceholder"
              value={varianceNote}
              onChange={setVarianceNote}
              maxLength={MAX_TEXTAREA}
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="text-[14px] font-medium text-red-700">
            {error}
          </p>
        ) : null}

        <PrimaryButton
          labelKey={submitting ? "saving" : !online ? "offlineSubmit" : "step2Submit"}
          onClick={() => setConfirmOpen(true)}
          disabled={!valid || submitting || !online}
        />
      </main>

      <ConfirmDialog
        open={confirmOpen}
        titleKey="confirmSubmitTitle"
        bodyKey="confirmSubmitBody"
        confirmKey="step2Submit"
        busy={submitting}
        onConfirm={doConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
