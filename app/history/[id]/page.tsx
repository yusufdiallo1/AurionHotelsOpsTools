import { AppHeader, PlaceholderPage } from "@/components/layout";
import { createServerClient } from "@/lib/supabase/server";
import { HandoverDetail } from "./HandoverDetail";

// Read-only handover detail: every field, variance, sync status, PDF, re-sync.
export default async function HistoryDetailPage({
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

  return (
    <>
      <AppHeader titleKey="detailTitle" />
      <HandoverDetail
        handover={handover}
        propertyNameEn={property?.name_en ?? ""}
        propertyNameAr={property?.name_ar ?? ""}
      />
    </>
  );
}
