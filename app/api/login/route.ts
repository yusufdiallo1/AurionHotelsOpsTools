import { createServerClient as createSsrClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { publicSupabaseEnv } from "@/lib/supabase/env";

const MAX_ATTEMPTS = 5;

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
    .select("id, locked, failed_attempts, is_temp, temp_active_until")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    return Response.json({ ok: false, reason: "not_found" }, { status: 401 });
  }
  // Temp account whose activation window has passed → auto-lock it now.
  if (
    profile.is_temp &&
    profile.temp_active_until &&
    new Date(profile.temp_active_until).getTime() < Date.now()
  ) {
    await admin.from("profiles").update({ locked: true, active: false }).eq("id", profile.id);
    return Response.json({ ok: false, reason: "locked" }, { status: 423 });
  }
  if (profile.locked) {
    return Response.json({ ok: false, reason: "locked" }, { status: 423 });
  }

  // 2) Attempt the sign-in via an SSR client so the session cookie is set.
  // Pull config through the validated helper: a missing/misnamed Supabase env
  // var throws a clear, named error instead of silently building a broken client
  // (which would surface to users as an opaque "login failed").
  const cookieStore = await cookies();
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = publicSupabaseEnv();
  const supabase = createSsrClient(
    supabaseUrl,
    supabaseAnonKey,
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
