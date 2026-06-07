"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { LiveIndicator, SyncBadge } from "@/components/ui";
import { useHandoverRealtime } from "@/lib/useHandoverRealtime";
import {
  SHIFT_OPTIONS,
  formatDate,
  formatSAR,
  hasCashMismatch,
  syncState,
  type Handover,
} from "@/lib/handover";
import { displayDigits } from "@/lib/digits";

type Props = {
  handover: Handover;
  propertyNameEn: string;
  propertyNameAr: string;
};

function Row({ label, value, red }: { label: string; value: string; red?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-2 last:border-0">
      <span className="text-[14px] text-ink-soft">{label}</span>
      <span className={`text-end text-[15px] ${red ? "font-bold text-red-700" : "font-medium text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass rounded-aurion p-4">
      <h2 className="mb-2 text-[15px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

export function HandoverDetail({ handover, propertyNameEn, propertyNameAr }: Props) {
  const { t, lang } = useLang();
  const [row, setRow] = useState<Handover>(handover);
  const [resyncing, setResyncing] = useState(false);
  const [resyncMsg, setResyncMsg] = useState<string | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  // Reflect live updates to THIS handover (e.g. incoming completes it on another
  // device, or a re-sync flips the badge elsewhere). (CLAUDE.md realtime)
  const liveStatus = useHandoverRealtime(
    {
      onUpsert: (incoming) => {
        if (incoming.id === handover.id) setRow(incoming);
      },
      onReconcile: async () => {
        const { createClient } = await import("@/lib/supabase/client");
        const { data } = await createClient()
          .from("handovers")
          .select("*")
          .eq("id", handover.id)
          .maybeSingle();
        if (data) setRow(data);
      },
    },
    { channelName: `handover-${handover.id}` },
  );

  const propName = lang === "ar" ? propertyNameAr : propertyNameEn;
  const mismatch = hasCashMismatch(row);
  const sync = syncState(row);
  const shiftKey =
    SHIFT_OPTIONS.find((s) => s.value === row.shift_type)?.k ?? "shiftLabel";

  function ts(value: string | null): string {
    if (!value) return "—";
    return displayDigits(value.slice(0, 16).replace("T", " "), lang);
  }

  async function handleResync() {
    if (resyncing) return;
    setResyncing(true);
    setResyncMsg(null);
    try {
      const res = await fetch("/api/sync-handover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const json = await res.json();
      if (json.ok) {
        const { createClient } = await import("@/lib/supabase/client");
        const { data } = await createClient()
          .from("handovers")
          .select("*")
          .eq("id", row.id)
          .maybeSingle();
        if (data) setRow(data);
        setResyncMsg(t("resyncOk"));
      } else {
        setResyncMsg(t("resyncFailed"));
      }
    } catch {
      setResyncMsg(t("resyncFailed"));
    } finally {
      setResyncing(false);
    }
  }

  async function handleDownloadPdf() {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { HandoverPdf } = await import("@/lib/pdf/HandoverPdf");
      const origin = window.location.origin;
      const blob = await pdf(
        <HandoverPdf
          data={{ ...row, propertyName: propName }}
          lang={lang}
          logoSrc={`${origin}/aurion-logo.png`}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `handover-${row.shift_date}-${row.id.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-5 py-6">
      <div className="flex justify-end">
        <LiveIndicator status={liveStatus} />
      </div>

      <Card title={t("outgoingSummary")}>
        <Row label={t("propertyLabel")} value={propName} />
        <Row label={t("fieldDate")} value={formatDate(row.shift_date, lang)} />
        <Row label={t("shiftLabel")} value={t(shiftKey)} />
        <Row label={t("fieldYourName")} value={row.outgoing_name} />
        <Row label={t("fieldRooms")} value={displayDigits(row.rooms_occupied, lang)} />
        {row.pending_requests ? (
          <Row label={t("fieldPending")} value={row.pending_requests} />
        ) : null}
        {row.maintenance_issues ? (
          <Row label={t("fieldMaintenance")} value={row.maintenance_issues} />
        ) : null}
        {row.notes ? <Row label={t("fieldNotes")} value={row.notes} /> : null}
      </Card>

      <Card title={t("sectionCash")}>
        <Row label={t("expectedLabel")} value={formatSAR(row.cash_drawer, lang)} />
        <Row label={t("countedLabel")} value={formatSAR(row.cash_recount, lang)} />
        <Row
          label={t("varianceLabel")}
          value={mismatch ? formatSAR(row.cash_variance, lang) : t("noVariance")}
          red={mismatch}
        />
        {mismatch && row.variance_note ? (
          <div className="mt-2 rounded-aurion bg-red-50 p-3 text-[14px] text-red-700">
            {t("fieldVarianceNote")}: {row.variance_note}
          </div>
        ) : null}
      </Card>

      <Card title={t("sectionIncoming")}>
        <Row label={t("fieldIncomingName")} value={row.incoming_name ?? "—"} />
        <Row label={`${t("sectionOutgoing")} — ${t("signedAt")}`} value={ts(row.outgoing_signed_at)} />
        <Row label={`${t("sectionIncoming")} — ${t("signedAt")}`} value={ts(row.incoming_signed_at)} />
        <Row
          label={t("filterStatus")}
          value={row.status === "completed" ? t("statusCompleted") : t("statusPending")}
        />
      </Card>

      <Card title={t("sectionSync")}>
        <div className="flex items-center justify-between">
          <SyncBadge state={sync} />
          {row.sheet_synced_at ? (
            <span className="text-[13px] text-ink-soft">
              {t("syncedAtLabel")}: {ts(row.sheet_synced_at)}
            </span>
          ) : null}
        </div>
        {row.sheet_sync_error && sync === "failed" ? (
          <p className="mt-2 text-[13px] text-red-700">{row.sheet_sync_error}</p>
        ) : null}
        {sync !== "synced" ? (
          <button
            type="button"
            onClick={handleResync}
            disabled={resyncing}
            className="mt-3 min-h-[44px] w-full rounded-aurion border border-line-strong bg-paper text-[15px] font-bold text-ink disabled:opacity-60"
          >
            {resyncing ? t("resyncing") : t("resync")}
          </button>
        ) : null}
        {resyncMsg ? (
          <p className="mt-2 text-[13px] text-ink-soft">{resyncMsg}</p>
        ) : null}
        {row.drive_file_id ? (
          <a
            href={`https://drive.google.com/file/d/${row.drive_file_id}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-[13px] font-bold text-gold-deep"
          >
            {t("viewInDrive")} ↗
          </a>
        ) : null}
      </Card>

      <button
        type="button"
        onClick={handleDownloadPdf}
        disabled={pdfBusy}
        className="min-h-[52px] w-full rounded-aurion bg-navy text-[17px] font-bold text-cream disabled:opacity-60"
      >
        {pdfBusy ? t("preparingPdf") : t("downloadPdf")}
      </button>
    </main>
  );
}
