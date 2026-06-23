import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout";
import { getSessionProfile } from "@/lib/auth";
import { HistoryList } from "./HistoryList";

// Handover history — admins only.
export default async function HistoryPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login?next=/history");
  if (session.role !== "admin") redirect("/");

  return (
    <>
      <AppHeader titleKey="historyTitle" />
      <Suspense>
        <HistoryList />
      </Suspense>
    </>
  );
}
