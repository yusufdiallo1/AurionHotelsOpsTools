import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { pushToUser } from "@/lib/push";

const NEXT_SHIFT: Record<string, string> = {
  morning: "afternoon",
  afternoon: "night",
  night: "morning",
};

// POST: create an early-leave request (receptionist) OR resolve one (approve/deny).
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session) return Response.json({ ok: false }, { status: 401 });

  let body: { action?: "request" | "approve" | "deny"; id?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const admin = createServiceClient();

  // ---- Resolve (approve / deny) by the next-shift receptionist ----
  if (body.action === "approve" || body.action === "deny") {
    if (!body.id) return Response.json({ ok: false }, { status: 400 });
    const status = body.action === "approve" ? "approved" : "denied";
    const { data: reqRow, error } = await admin
      .from("early_leave_requests")
      .update({
        status,
        approver_id: session.userId,
        approver_name: session.profile.full_name,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .eq("status", "pending")
      .select("requester_id")
      .maybeSingle();
    if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });

    // Notify the requester of the decision.
    if (reqRow?.requester_id) {
      const title = status === "approved" ? "تمت الموافقة على المغادرة المبكرة" : "تم رفض المغادرة المبكرة";
      await admin.from("notifications").insert({
        recipient_id: reqRow.requester_id,
        type: status === "approved" ? "early_approved" : "early_denied",
        title,
        body: "",
      });
      await pushToUser(reqRow.requester_id, { title, body: "", url: "/new" });
    }
    return Response.json({ ok: true });
  }

  // ---- Request (the outgoing receptionist) ----
  if (session.role !== "receptionist" || !session.profile.property_id) {
    return Response.json({ ok: false, error: "not_receptionist" }, { status: 400 });
  }
  const propertyId = session.profile.property_id;
  const shift = session.profile.shift_type ?? "";
  const today = new Date().toISOString().slice(0, 10);

  // One pending request per person per day.
  const { data: existing } = await admin
    .from("early_leave_requests")
    .select("id, status")
    .eq("requester_id", session.userId)
    .eq("shift_date", today)
    .in("status", ["pending", "approved"])
    .maybeSingle();
  if (existing) {
    return Response.json({ ok: true, id: existing.id, status: existing.status });
  }

  const { data: created, error } = await admin
    .from("early_leave_requests")
    .insert({
      requester_id: session.userId,
      requester_name: session.profile.full_name,
      property_id: propertyId,
      shift_type: shift,
      shift_date: today,
      status: "pending",
    })
    .select("id")
    .single();
  if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });

  // Notify the next-shift receptionist(s) at this hotel (+ cover) so they can approve.
  const next = NEXT_SHIFT[shift] ?? null;
  const { data: roster } = await admin
    .from("profiles")
    .select("id, shift_type, full_name, property_id")
    .eq("role", "receptionist")
    .eq("active", true);
  const me = (session.profile.full_name ?? "").trim().toLowerCase();
  let targets = (roster ?? []).filter(
    (p) =>
      (p.property_id === propertyId || p.property_id === null) &&
      (p.full_name ?? "").trim().toLowerCase() !== me &&
      (!next || p.shift_type === next),
  );
  if (targets.length === 0) {
    targets = (roster ?? []).filter(
      (p) => (p.property_id === propertyId || p.property_id === null) && (p.full_name ?? "").trim().toLowerCase() !== me,
    );
  }
  const title = "طلب مغادرة مبكرة";
  const bodyText = `${session.profile.full_name} يريد المغادرة مبكرًا والتسليم الآن`;
  if (targets.length) {
    await admin.from("notifications").insert(
      targets.map((tg) => ({ recipient_id: tg.id, type: "early_request", title, body: bodyText })),
    );
    await Promise.all(targets.map((tg) => pushToUser(tg.id, { title, body: bodyText, url: "/" })));
  }

  return Response.json({ ok: true, id: created.id, status: "pending" });
}
