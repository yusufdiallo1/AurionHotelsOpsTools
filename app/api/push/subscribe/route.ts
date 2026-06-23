import { getSessionProfile } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Save (upsert) the current user's Web Push subscription.
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session) return Response.json({ ok: false }, { status: 401 });

  let sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    sub = await req.json();
  } catch {
    return Response.json({ ok: false, error: "bad request" }, { status: 400 });
  }
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return Response.json({ ok: false, error: "invalid subscription" }, { status: 400 });
  }

  const admin = createServiceClient();
  const { error } = await admin
    .from("push_subscriptions")
    .upsert(
      {
        user_id: session.userId,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      },
      { onConflict: "endpoint" },
    );
  if (error) return Response.json({ ok: false, error: error.message }, { status: 400 });
  return Response.json({ ok: true });
}
