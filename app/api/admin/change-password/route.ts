import { createClient } from "@supabase/supabase-js";
import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Admin changes their OWN password. Requires the current password (re-verified).
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session || session.role !== "admin") {
    return Response.json({ ok: false, reason: "forbidden" }, { status: 403 });
  }

  let body: { current?: string; next?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const current = body.current ?? "";
  const next = body.next ?? "";
  if (next.length < 6) {
    return Response.json({ ok: false, reason: "too_short" }, { status: 400 });
  }

  // Re-verify the current password with a throwaway client (no session persisted).
  const verifier = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { error: signInErr } = await verifier.auth.signInWithPassword({
    email: session.email,
    password: current,
  });
  if (signInErr) {
    return Response.json({ ok: false, reason: "wrong_current" }, { status: 401 });
  }

  // Update the password via the Auth admin API.
  const admin = createServiceClient();
  const { error } = await admin.auth.admin.updateUserById(session.userId, { password: next });
  if (error) {
    return Response.json({ ok: false, reason: "update_failed" }, { status: 400 });
  }
  return Response.json({ ok: true });
}
