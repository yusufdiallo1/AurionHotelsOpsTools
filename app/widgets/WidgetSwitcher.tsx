"use client";

import { useState } from "react";
import { useLang } from "@/lib/i18n";
import { translate, type StringKey } from "@/lib/strings";
import {
  tabsForRole,
  type Role,
  type WidgetKey,
  type WidgetScope,
} from "@/lib/homeWidgets";
import { HandoversPanel } from "./HandoversPanel";
import { CashPanel } from "./CashPanel";
import { OccupancyPanel } from "./OccupancyPanel";
import { IssuesPanel } from "./IssuesPanel";
import { WeekPanel } from "./WeekPanel";

// Each widget renders ONCE (compact when collapsed, full when expanded) so its
// realtime channel — keyed by a fixed channelName per panel — never collides.
function Panel({ k, scope, variant }: { k: WidgetKey; scope: WidgetScope; variant: "card" | "full" }) {
  switch (k) {
    case "handovers": return <HandoversPanel scope={scope} variant={variant} />;
    case "cash": return <CashPanel scope={scope} variant={variant} />;
    case "occupancy": return <OccupancyPanel scope={scope} variant={variant} />;
    case "issues": return <IssuesPanel scope={scope} variant={variant} />;
    case "week": return <WeekPanel scope={scope} variant={variant} />;
  }
}

export function WidgetSwitcher({ role, scope }: { role: Role; scope: WidgetScope }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  const tabs = tabsForRole(role);
  // Tap a card to expand it inline; tap again to collapse. Only one open at a time.
  const [expanded, setExpanded] = useState<WidgetKey | null>(null);

  return (
    <section className="grid grid-cols-2 gap-3">
      {tabs.map((tab) => {
        const isOpen = expanded === tab.key;

        // Expanded: full-width card with a collapse header, then the full panel.
        // (Not a <button> — the panel has its own interactive controls inside.)
        if (isOpen) {
          return (
            <div key={tab.key} className="glass col-span-2 rounded-aurion border-2 border-gold p-4">
              <button
                type="button"
                aria-expanded
                onClick={() => setExpanded(null)}
                className="mb-3 flex min-h-[44px] items-center gap-1.5 text-[13px] font-bold text-gold-deep"
              >
                ‹ {t("widgetTapToClose")}
              </button>
              <Panel k={tab.key} scope={scope} variant="full" />
            </div>
          );
        }

        // Collapsed: a compact summary tile that opens on tap.
        return (
          <button
            key={tab.key}
            type="button"
            aria-expanded={false}
            aria-label={t(tab.labelK)}
            onClick={() => setExpanded(tab.key)}
            className="glass flex min-h-[104px] flex-col rounded-aurion border border-line/60 p-4 text-start transition-colors active:bg-paper-tint"
          >
            <Panel k={tab.key} scope={scope} variant="card" />
            <span className="mt-auto pt-2 text-[12px] font-bold text-gold-deep">
              {t("widgetTapToOpen")} ›
            </span>
          </button>
        );
      })}
    </section>
  );
}
