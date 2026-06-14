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

export function WidgetSwitcher({ role, scope }: { role: Role; scope: WidgetScope }) {
  const { lang } = useLang();
  const t = (k: StringKey) => translate(k, lang);
  const tabs = tabsForRole(role);
  const [active, setActive] = useState<WidgetKey>(tabs[0].key);

  function renderPanel() {
    switch (active) {
      case "handovers": return <HandoversPanel scope={scope} />;
      case "cash": return <CashPanel scope={scope} />;
      case "occupancy": return <OccupancyPanel scope={scope} />;
      case "issues": return <IssuesPanel scope={scope} />;
      case "week": return <WeekPanel scope={scope} />;
    }
  }

  return (
    <section className="glass rounded-aurion p-4">
      {/* Glass pill tab bar */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-full bg-line/60 p-1">
        {tabs.map((tab) => {
          const on = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={on}
              onClick={() => setActive(tab.key)}
              className={[
                "min-h-[40px] shrink-0 rounded-full px-4 text-[13px] font-bold transition-colors",
                on
                  ? "border-2 border-gold bg-paper text-ink shadow-sm"
                  : "border-2 border-transparent text-ink-soft",
              ].join(" ")}
            >
              {t(tab.labelK)}
            </button>
          );
        })}
      </div>
      {renderPanel()}
    </section>
  );
}
