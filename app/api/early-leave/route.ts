import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// POST: a receptionist requests early leave. No approval needed — it self-unlocks
// their handover immediately. Admins SEE the request on the dashboard (info only).
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session) return Response.json({ ok: false }, { status: 401 });
  if (session.role !== "receptionist" || !session.profile.property_id) {
    return Response.json({ ok: false, error: "not_receptionist" }, { status: 400 });
  }
  // Ignore body action — requesting always self-approves now.
  try {
    await req.json();
  } catch {
    /* no body needed */
  }

  const admin = createServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  // One record per person per day; reuse if it already exists.
  const { data: existing } = await admin
    .from("early_leave_requests")
    .select("id")
    .eq("requester_id", session.userId)
    .eq("shift_date", today)
    .maybeSingle();
  if (existing) {
    return Response.json({ ok: true, id: existing.id, status: "approved" });
  }

  const { data: created, error } = await admin
    .from("early_leave_requests")
    .insert({
      requester_id: session.userId,
      requester_name: session.profile.full_name,
      property_id: session.profile.property_id,
      shift_type: session.profile.shift_type ?? "",
      shift_date: today,
      status: "approved", // self-unlock; admin only observes
      resolved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });

  return Response.json({ ok: true, id: created.id, status: "approved" });
}
