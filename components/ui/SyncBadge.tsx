"use client";

import { useLang } from "@/lib/i18n";
import { SYNC_STRING_KEY, type SyncState } from "@/lib/handover";

const STYLES: Record<SyncState, string> = {
  synced: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
};

// Small pill showing the Google Sheets sync state. (CLAUDE.md)
export function SyncBadge({ state }: { state: SyncState }) {
  const { t } = useLang();
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold ${STYLES[state]}`}
    >
      {t(SYNC_STRING_KEY[state])}
    </span>
  );
}
