"use client";

import { ToolCard } from "@/components/layout";
import { useLang } from "@/lib/i18n";
import { HomeSearch } from "./HomeSearch";
import { WidgetSwitcher } from "./widgets/WidgetSwitcher";

// An admin's display name is just their first token (e.g. "Abdullah Diallo" →
// "Abdullah") for a friendlier greeting.
function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? "";
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
    >
      <path d={d} />
    </svg>
  );
}

// Admin landing: greeting + dashboard widgets + receptionist search + tools.
export function AdminHome({ adminName }: { adminName: string }) {
  const { t } = useLang();
  const name = firstName(adminName);
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-3.5 px-5 py-8">
      {name ? (
        <h1 className="text-[22px] font-bold text-ink">
          {t("greeting")}, <span className="text-gold-deep">{name}</span>
        </h1>
      ) : null}
      <WidgetSwitcher role="admin" scope={{ kind: "portfolio" }} />
      <HomeSearch />
      <ToolCard
        href="/new"
        titleKey="navNewTitle"
        descKey="navNewDesc"
        icon={<Icon d="M12 5v14M5 12h14" />}
      />
      <ToolCard
        href="/history"
        titleKey="navHistoryTitle"
        descKey="navHistoryDesc"
        icon={<Icon d="M4 5h16M4 12h16M4 19h10" />}
      />
      <ToolCard
        href="/manager"
        titleKey="navManagerTitle"
        descKey="navManagerDesc"
        icon={<Icon d="M4 19V10M10 19V5M16 19v-7M22 19H2" />}
      />
    </main>
  );
}
