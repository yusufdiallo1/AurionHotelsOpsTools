"use client";

import { AppHeader, ToolCard } from "@/components/layout";

// Home: logo header + the three entry points for the Shift Handover app.
export default function Home() {
  return (
    <>
      <AppHeader />

      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-5 py-8">
        <ToolCard
          href="/new"
          titleKey="navNewTitle"
          descKey="navNewDesc"
          icon="✎"
        />
        <ToolCard
          href="/history"
          titleKey="navHistoryTitle"
          descKey="navHistoryDesc"
          icon="🗂"
        />
        <ToolCard
          href="/manager"
          titleKey="navManagerTitle"
          descKey="navManagerDesc"
          icon="📊"
        />
      </main>
    </>
  );
}
