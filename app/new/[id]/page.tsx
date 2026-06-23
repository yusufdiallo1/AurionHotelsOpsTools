import { createServerClient } from "@/lib/supabase/server";
import { PlaceholderPage } from "@/components/layout";
import { getSessionProfile } from "@/lib/auth";
import { IncomingForm } from "./IncomingForm";
import { WaitingBanner } from "./WaitingBanner";

// Step 2/3 — continue an existing handover.
// - The OUTGOING receptionist (who just submitted) sees a live "waiting for
//   incoming to confirm" banner that flips to "confirmed" in real time.
// - The INCOMING receptionist (a different person) sees the confirm form.
export default async function ContinueHandoverPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: handover } = await supabase
    .from("handovers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!handover) {
    return <PlaceholderPage titleKey="notFound" />;
  }

  const { data: property } = await supabase
    .from("properties")
    .select("name_en, name_ar")
    .eq("id", handover.property_id)
    .maybeSingle();

  // Is the viewer the outgoing receptionist? (match their profile name, whitespace-insensitive)
  const norm = (s: string | null | undefined) =>
    (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const session = await getSessionProfile();
  const viewerName = norm(session?.profile.full_name);
  const isOutgoing =
    session?.role === "receptionist" && viewerName !== "" && viewerName === norm(handover.outgoing_name);

  if (isOutgoing) {
    return (
      <WaitingBanner
        handoverId={handover.id}
        initialStatus={handover.status}
        initialIncomingName={handover.incoming_name}
        propertyName={property?.name_en ?? ""}
        propertyNameAr={property?.name_ar ?? ""}
      />
    );
  }

  if (handover.status === "completed") {
    return <PlaceholderPage titleKey="alreadyCompleted" />;
  }

  // Pre-fill the incoming receptionist's own identity (locked) when a receptionist
  // is signed in — name + their own shift.
  const isRecep = session?.role === "receptionist";
  const incomingName = isRecep ? (session!.profile.full_name ?? "") : "";
  const incomingShift = isRecep ? (session!.profile.shift_type ?? "") : "";

  return (
    <IncomingForm
      handover={handover}
      propertyName={property?.name_en ?? ""}
      propertyNameAr={property?.name_ar ?? ""}
      lockedIncomingName={incomingName}
      incomingShift={incomingShift}
    />
  );
}
