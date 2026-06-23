import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout";
import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { AdminEmployees, type EmployeeRow } from "./AdminEmployees";
import { ChangePassword } from "./ChangePassword";
import { TempAccounts, type TempRow } from "./TempAccounts";

// /admin — employee management. Admins only.
export default async function AdminPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") redirect("/");

  // Service client: list all profiles + properties for the picker.
  const admin = createServiceClient();
  const [{ data: profiles }, { data: temps }, { data: properties }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, role, property_id, shift_type, phone, active, created_at, work_days, locked")
      .eq("role", "receptionist")
      .eq("is_temp", false) // employees list excludes temp cover accounts
      .order("created_at", { ascending: false }),
    admin
      .from("profiles")
      .select("id, full_name, email, property_id, shift_type, active, temp_active_until")
      .eq("is_temp", true)
      .order("full_name"),
    admin.from("properties").select("id, code, name_en, name_ar"),
  ]);

  return (
    <>
      <AppHeader titleKey="adminTitle" />
      <AdminEmployees
        initial={(profiles ?? []) as EmployeeRow[]}
        properties={(properties ?? []) as { id: string; code: string; name_en: string; name_ar: string }[]}
      />
      <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-4 pb-8">
        <TempAccounts initial={(temps ?? []) as TempRow[]} />
        <ChangePassword />
      </div>
    </>
  );
}
