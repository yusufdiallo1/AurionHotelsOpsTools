import { createServerClient } from "@/lib/supabase/server";
import { PlaceholderPage } from "@/components/layout";
import { IncomingForm } from "./IncomingForm";

// Step 2/3 — continue an existing handover (incoming receptionist).
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
  if (handover.status === "completed") {
    return <PlaceholderPage titleKey="alreadyCompleted" />;
  }

  const { data: property } = await supabase
    .from("properties")
    .select("name_en, name_ar")
    .eq("id", handover.property_id)
    .maybeSingle();

  return (
    <IncomingForm
      handover={handover}
      propertyName={property?.name_en ?? ""}
      propertyNameAr={property?.name_ar ?? ""}
    />
  );
}
