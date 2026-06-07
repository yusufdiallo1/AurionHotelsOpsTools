import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout";
import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { AdminEmployees, type EmployeeRow } from "./AdminEmployees";

// /admin — employee management. Admins only.
export default async function AdminPage() {
  const session = await getSessionProfile();
  if (!session) redirect("/login?next=/admin");
  if (session.role !== "admin") redirect("/");

  // Service client: list all profiles + properties for the picker.
  const admin = createServiceClient();
  const [{ data: profiles }, { data: properties }] = await Promise.all([
    admin
      .from("profiles")
      .select("id, full_name, email, role, property_id, shift_type, phone, active, created_at")
      .order("created_at", { ascending: false }),
    admin.from("properties").select("id, code, name_en, name_ar"),
  ]);

  return (
    <>
      <AppHeader titleKey="adminTitle" />
      <AdminEmployees
        initial={(profiles ?? []) as EmployeeRow[]}
        properties={(properties ?? []) as { id: string; code: string; name_en: string; name_ar: string }[]}
      />
    </>
  );
}
