import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout";
import { canSeeManager, getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { ManagerDashboard } from "./ManagerDashboard";
import type { PasscodeRow } from "./Passcodes";

// /manager — admins (full) + managers (restricted) only. Others are sent home.
export default async function ManagerPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login?next=/manager");
  if (!canSeeManager(session.role)) redirect("/");

  // Temp account passcodes (the per-hotel shared logins) for the Passcodes panel.
  const admin = createServiceClient();
  const { data: temps } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .eq("is_temp", true)
    .order("full_name");

  return (
    <>
      <AppHeader titleKey="managerTitle" hideLanguageToggle />
      <ManagerDashboard
        greetingName={session.profile.full_name}
        role={session.role}
        passcodes={(temps ?? []) as PasscodeRow[]}
      />
    </>
  );
}
