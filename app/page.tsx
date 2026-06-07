"use client";

import { AppHeader, ToolCard } from "@/components/layout";

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

// Home: logo header + the three entry points for the Shift Handover app.
export default function Home() {
  return (
    <>
      <AppHeader />

      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-3.5 px-5 py-8">
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
    </>
  );
}
