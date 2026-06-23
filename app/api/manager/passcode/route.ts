import { canSeeManager, getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Reset a per-hotel temp account's passcode (shared login). Available to admins
// and the restricted manager role. Limited to is_temp accounts so a manager can
// never change a real employee's or admin's password through this endpoint.
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session || !canSeeManager(session.role)) {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: { id?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const id = (body.id ?? "").trim();
  const password = (body.password ?? "").trim();
  if (!id || password.length < 4) {
    return Response.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const admin = createServiceClient();

  // Confirm the target is a temp account before touching its auth password.
  const { data: target } = await admin
    .from("profiles")
    .select("id, is_temp")
    .eq("id", id)
    .maybeSingle();
  if (!target || !target.is_temp) {
    return Response.json({ ok: false, error: "not_temp" }, { status: 403 });
  }

  const { error } = await admin.auth.admin.updateUserById(id, { password });
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
