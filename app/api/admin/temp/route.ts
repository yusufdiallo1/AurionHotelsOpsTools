import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { handoverWindow, type ShiftType } from "@/lib/handover";

// Admin activates (or deactivates) a per-hotel temp account for one shift.
// On activate: unlock + set hotel/shift + auto-lock deadline (shift end + 90 min).
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session || session.role !== "admin") {
    return Response.json({ ok: false }, { status: 403 });
  }

  let body: { id?: string; activate?: boolean; property_id?: string; shift?: ShiftType };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  if (!body.id) return Response.json({ ok: false, error: "missing id" }, { status: 400 });

  const admin = createServiceClient();

  if (!body.activate) {
    // Deactivate / lock now.
    await admin
      .from("profiles")
      .update({ active: false, locked: true, temp_active_until: null })
      .eq("id", body.id)
      .eq("is_temp", true);
    return Response.json({ ok: true });
  }

  if (!body.property_id || !body.shift) {
    return Response.json({ ok: false, error: "missing hotel/shift" }, { status: 400 });
  }

  // Auto-lock when the covered shift's handover window closes (end + 90 min).
  const { closesAt } = handoverWindow(body.shift, new Date());

  const { error } = await admin
    .from("profiles")
    .update({
      active: true,
      locked: false,
      failed_attempts: 0,
      property_id: body.property_id,
      shift_type: body.shift,
      temp_active_until: closesAt.toISOString(),
      // Temp covers every day while active.
      work_days: [],
    })
    .eq("id", body.id)
    .eq("is_temp", true);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });

  return Response.json({ ok: true, until: closesAt.toISOString() });
}
