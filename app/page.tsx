"use client";

import { AppHeader, ToolCard } from "@/components/layout";
import { useAuth } from "@/lib/auth-context";
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

// Home: receptionists see New Handover only; admins also get search + History + Manager.
export default function Home() {
  const { role } = useAuth();
  const isAdmin = role === "admin";

  return (
    <>
      <AppHeader />

      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-3.5 px-5 py-8">
        {isAdmin ? <HomeSearch /> : null}

        {!isAdmin ? (
          <ToolCard
            href="/new"
            titleKey="navNewTitle"
            descKey="navNewDesc"
            icon={<Icon d="M12 5v14M5 12h14" />}
          />
        ) : null}

        {isAdmin ? (
          <>
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
          </>
        ) : null}
      </main>
    </>
  );
}
