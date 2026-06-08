import { createServerClient as createSsrClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_ATTEMPTS = 3;

// Username/password login with precise errors + per-account lockout.
// Reasons: "not_found" | "wrong_password" | "locked" | "ok".
export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }
  const raw = (body.username ?? "").trim();
  const password = body.password ?? "";
  if (!raw || !password) {
    return Response.json({ ok: false, reason: "bad_request" }, { status: 400 });
  }

  // Username → internal email (admins may type their full email directly).
  const email = raw.includes("@")
    ? raw.toLowerCase()
    : `${raw.toLowerCase().replace(/[^a-z0-9._-]/g, "")}@aurion.local`;

  const admin = createServiceClient();

  // 1) Does the account exist? + is it locked?
  const { data: profile } = await admin
    .from("profiles")
    .select("id, locked, failed_attempts")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    return Response.json({ ok: false, reason: "not_found" }, { status: 401 });
  }
  if (profile.locked) {
    return Response.json({ ok: false, reason: "locked" }, { status: 423 });
  }

  // 2) Attempt the sign-in via an SSR client so the session cookie is set.
  const cookieStore = await cookies();
  const supabase = createSsrClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
      },
    },
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Wrong password → increment; lock at the threshold.
    const next = (profile.failed_attempts ?? 0) + 1;
    const lock = next >= MAX_ATTEMPTS;
    await admin
      .from("profiles")
      .update({ failed_attempts: next, locked: lock })
      .eq("id", profile.id);
    return Response.json(
      { ok: false, reason: lock ? "locked" : "wrong_password", remaining: Math.max(0, MAX_ATTEMPTS - next) },
      { status: lock ? 423 : 401 },
    );
  }

  // 3) Success → reset the counter.
  if (profile.failed_attempts > 0) {
    await admin.from("profiles").update({ failed_attempts: 0 }).eq("id", profile.id);
  }
  return Response.json({ ok: true });
}
