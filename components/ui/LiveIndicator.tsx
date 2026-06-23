"use client";

import { useLang } from "@/lib/i18n";
import type { RealtimeStatus } from "@/lib/useHandoverRealtime";

// Subtle live / reconnecting pill. (CLAUDE.md realtime)
export function LiveIndicator({ status }: { status: RealtimeStatus }) {
  const { t } = useLang();
  const live = status === "live";

  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-ink-soft">
      <span
        className={`h-2 w-2 rounded-full ${live ? "bg-green-500" : "animate-pulse bg-amber-500"}`}
        aria-hidden
      />
      {live ? t("live") : t("reconnecting")}
    </span>
  );
}
