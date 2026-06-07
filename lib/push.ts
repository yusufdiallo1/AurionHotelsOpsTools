// Server-side Web Push helpers + notification fan-out. Service-role only.
import webpush from "web-push";
import { createServiceClient } from "@/lib/supabase/server";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@aurion.local";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
  return true;
}

type PushPayload = { title: string; body: string; url?: string; tag?: string };

/** Send a Web Push to all of a user's subscriptions; prune dead (404/410) ones. */
export async function pushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;
  const admin = createServiceClient();
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!subs?.length) return;

  const body = JSON.stringify(payload);
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body,
        );
      } catch (err) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }),
  );
}

/**
 * Notify the incoming receptionist(s) of a hotel about a started handover:
 * insert an in-app notification row + send Web Push. Targets active receptionists
 * of the property (optionally the matching incoming shift). Best-effort.
 */
export async function notifyIncoming(handoverId: string): Promise<void> {
  const admin = createServiceClient();
  const { data: h } = await admin
    .from("handovers")
    .select("id, property_id, shift_type, properties(name_en, name_ar)")
    .eq("id", handoverId)
    .maybeSingle();
  if (!h) return;

  const { data: recipients } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "receptionist")
    .eq("active", true)
    .eq("property_id", h.property_id);
  if (!recipients?.length) return;

  const hotel =
    (h.properties as { name_en?: string } | null)?.name_en ?? "the hotel";
  const title = "Incoming handover";
  const bodyText = `A shift handover at ${hotel} is waiting for you.`;
  const url = `/new/${h.id}`;

  // In-app notifications (realtime) for every recipient.
  await admin.from("notifications").insert(
    recipients.map((r) => ({
      recipient_id: r.id,
      type: "incoming_handover",
      handover_id: h.id,
      title,
      body: bodyText,
    })),
  );

  // Web Push to each recipient.
  await Promise.all(
    recipients.map((r) => pushToUser(r.id, { title, body: bodyText, url, tag: `handover-${h.id}` })),
  );
}
