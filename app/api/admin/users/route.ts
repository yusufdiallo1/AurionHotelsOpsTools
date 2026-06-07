import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type Body = {
  email?: string;
  password?: string;
  full_name?: string;
  role?: "admin" | "receptionist";
  property_id?: string | null;
  shift_type?: "night" | "morning" | "afternoon" | null;
  phone?: string | null;
  work_days?: number[] | null;
};

// Create an employee (admin or receptionist). Admin-only. Uses the Auth admin API
// (service role) + the auto-create-profile trigger, then patches profile details.
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session || session.role !== "admin") {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const role = body.role === "admin" ? "admin" : "receptionist";
  if (!email || password.length < 8) {
    return Response.json(
      { ok: false, error: "email required + password ≥ 8 chars" },
      { status: 400 },
    );
  }

  const admin = createServiceClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role, full_name: body.full_name ?? "" },
  });
  if (createErr || !created?.user) {
    const msg = createErr?.message ?? "create failed";
    const status = /already|exists|registered/i.test(msg) ? 409 : 400;
    return Response.json({ ok: false, error: msg }, { status });
  }

  // Fill in the rest of the profile (trigger already created the base row).
  const { error: profErr } = await admin
    .from("profiles")
    .update({
      role,
      full_name: body.full_name ?? "",
      email,
      property_id: role === "receptionist" ? (body.property_id ?? null) : null,
      shift_type: role === "receptionist" ? (body.shift_type ?? null) : null,
      work_days: role === "receptionist" ? (body.work_days ?? []) : [],
      phone: body.phone ?? null,
      active: true,
    })
    .eq("id", created.user.id);
  if (profErr) {
    return Response.json({ ok: false, error: profErr.message }, { status: 400 });
  }

  return Response.json({ ok: true, id: created.user.id });
}

// Update a profile (role/active/details). Admin-only.
export async function PATCH(req: Request) {
  const session = await getSessionProfile();
  if (!session || session.role !== "admin") {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  let body: (Body & { id?: string }) | null = null;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  if (!body?.id) return Response.json({ ok: false, error: "missing id" }, { status: 400 });

  const admin = createServiceClient();
  const b = body as Body & { id: string; active?: boolean };
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {};
  if (b.full_name !== undefined) patch.full_name = b.full_name;
  if (b.role !== undefined) patch.role = b.role;
  if (b.property_id !== undefined) patch.property_id = b.property_id;
  if (b.shift_type !== undefined) patch.shift_type = b.shift_type;
  if (b.phone !== undefined) patch.phone = b.phone;
  if (b.work_days !== undefined && b.work_days !== null) patch.work_days = b.work_days;
  if (typeof b.active === "boolean") patch.active = b.active;
  const { error } = await admin.from("profiles").update(patch).eq("id", body.id);
  if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
