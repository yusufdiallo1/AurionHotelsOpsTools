import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout";
import { getSessionProfile } from "@/lib/auth";
import { ManagerDashboard } from "./ManagerDashboard";

// /manager — admins only (enforced server-side). Non-admins are sent home.
export default async function ManagerPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login?next=/manager");
  if (session.role !== "admin") redirect("/");

  return (
    <>
      <AppHeader titleKey="managerTitle" hideLanguageToggle />
      <ManagerDashboard greetingName={session.profile.full_name} />
    </>
  );
}
