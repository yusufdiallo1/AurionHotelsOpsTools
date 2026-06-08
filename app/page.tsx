import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout";
import { AdminHome } from "./AdminHome";
import { ReceptionistHome, type MyHandover } from "./ReceptionistHome";

// Home. Admins: search + History + Manager. Receptionists: pending incoming
// handovers to confirm + their own handover list.
export default async function Home() {
  const session = await getSessionProfile();

  if (!session || session.role === "admin") {
    return (
      <>
        <AppHeader />
        <AdminHome />
      </>
    );
  }

  // Receptionist: fetch what's theirs. (Service client; scoped by name/hotel below.)
  const db = createServiceClient();
  const name = session.profile.full_name ?? "";
  const propertyId = session.profile.property_id;

  // Pending incoming handovers at their hotel that AREN'T their own outgoing.
  const { data: pendingRaw } = propertyId
    ? await db
        .from("handovers")
        .select("id, outgoing_name, shift_type, created_at, properties(name_en, name_ar)")
        .eq("property_id", propertyId)
        .eq("status", "pending_incoming")
        .order("created_at", { ascending: false })
    : { data: [] };
  const pending = (pendingRaw ?? []).filter(
    (h) => (h.outgoing_name ?? "").trim().toLowerCase() !== name.trim().toLowerCase(),
  );

  // Their own handovers — where they're outgoing OR incoming.
  const { data: mineRaw } = await db
    .from("handovers")
    .select(
      "id, outgoing_name, incoming_name, shift_type, shift_date, status, cash_drawer, rooms_occupied, created_at, properties(name_en, name_ar)",
    )
    .or(`outgoing_name.ilike.${name},incoming_name.ilike.${name}`)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <>
      <AppHeader />
      <ReceptionistHome
        myName={name}
        pending={(pending ?? []) as unknown as MyHandover[]}
        mine={(mineRaw ?? []) as unknown as MyHandover[]}
      />
    </>
  );
}
