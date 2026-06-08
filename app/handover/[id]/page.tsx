import { AppHeader, PlaceholderPage } from "@/components/layout";
import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { HandoverView } from "./HandoverView";

// Read-only handover view for receptionists — their own past handovers, no edit.
export default async function HandoverViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSessionProfile();
  if (!session) return <PlaceholderPage titleKey="notFound" />;

  const db = createServiceClient();
  const { data: handover } = await db
    .from("handovers")
    .select("*, properties(name_en, name_ar)")
    .eq("id", id)
    .maybeSingle();
  if (!handover) return <PlaceholderPage titleKey="notFound" />;

  // Receptionists may only view handovers they were part of.
  if (session.role !== "admin") {
    const me = (session.profile.full_name ?? "").trim().toLowerCase();
    const isMine =
      (handover.outgoing_name ?? "").trim().toLowerCase() === me ||
      (handover.incoming_name ?? "").trim().toLowerCase() === me;
    if (!isMine) return <PlaceholderPage titleKey="notFound" />;
  }

  const props = handover.properties as { name_en: string; name_ar: string } | null;

  return (
    <>
      <AppHeader titleKey="detailTitle" />
      <HandoverView
        handover={handover}
        propertyNameEn={props?.name_en ?? ""}
        propertyNameAr={props?.name_ar ?? ""}
      />
    </>
  );
}
