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

  // Is the viewer the outgoing receptionist? (match their profile name)
  const session = await getSessionProfile();
  const viewerName = session?.profile.full_name?.trim().toLowerCase() ?? "";
  const outgoingName = handover.outgoing_name?.trim().toLowerCase() ?? "";
  const isOutgoing =
    session?.role === "receptionist" && viewerName !== "" && viewerName === outgoingName;

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

  return (
    <IncomingForm
      handover={handover}
      propertyName={property?.name_en ?? ""}
      propertyNameAr={property?.name_ar ?? ""}
    />
  );
}
