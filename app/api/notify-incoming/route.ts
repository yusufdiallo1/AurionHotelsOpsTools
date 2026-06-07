import { getSessionProfile } from "@/lib/auth";
import { notifyIncoming } from "@/lib/push";

// Fire the incoming-handover notification + Web Push for a just-created handover.
// Called by the wizard right after Step 1 inserts the pending handover.
export async function POST(req: Request) {
  const session = await getSessionProfile();
  if (!session) return Response.json({ ok: false }, { status: 401 });

  let id: string | undefined;
  try {
    ({ id } = await req.json());
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
  if (!id) return Response.json({ ok: false, error: "missing id" }, { status: 400 });

  try {
    await notifyIncoming(id);
  } catch {
    // Best-effort: never block the handover on a notification failure.
  }
  return Response.json({ ok: true });
}
