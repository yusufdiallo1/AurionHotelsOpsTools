import { cookies } from "next/headers";
import { AppHeader } from "@/components/layout";
import { MANAGER_COOKIE, cookieMatches } from "@/lib/manager-auth";
import { UnlockForm } from "./UnlockForm";
import { ManagerDashboard } from "./ManagerDashboard";

// /manager — gated behind a shared passcode (cookie). The rest of the app is open.
export default async function ManagerPage() {
  const cookieStore = await cookies();
  const unlocked = cookieMatches(cookieStore.get(MANAGER_COOKIE)?.value);

  return (
    <>
      <AppHeader titleKey="managerTitle" />
      {unlocked ? <ManagerDashboard /> : <UnlockForm />}
    </>
  );
}
