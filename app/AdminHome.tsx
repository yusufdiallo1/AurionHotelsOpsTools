"use client";

import { ToolCard } from "@/components/layout";
import { HomeSearch } from "./HomeSearch";

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

// Admin landing: receptionist search + History + Manager.
export function AdminHome() {
  return (
    <main className="mx-auto flex w-full max-w-[480px] flex-col gap-3.5 px-5 py-8">
      <HomeSearch />
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
