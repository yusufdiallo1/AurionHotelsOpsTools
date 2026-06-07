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
// Shift rotation: the incoming shift is the one AFTER the outgoing shift.
const NEXT_SHIFT: Record<string, string> = {
  morning: "afternoon",
  afternoon: "night",
  night: "morning",
};

export async function notifyIncoming(handoverId: string): Promise<void> {
  const admin = createServiceClient();
  const { data: h } = await admin
    .from("handovers")
    .select("id, property_id, shift_type, outgoing_name, properties(name_en, name_ar)")
    .eq("id", handoverId)
    .maybeSingle();
  if (!h) return;

  // Active receptionists at this hotel, PLUS floating cover staff (no fixed
  // property) who can work either hotel.
  const { data: roster } = await admin
    .from("profiles")
    .select("id, full_name, shift_type, work_days, property_id")
    .eq("role", "receptionist")
    .eq("active", true);
  const all = (roster ?? []).filter(
    (p) => p.property_id === h.property_id || p.property_id === null,
  );
  if (!all.length) return;

  const todayDow = new Date().getDay(); // 0=Sun … 6=Sat
  const nextShift = NEXT_SHIFT[h.shift_type] ?? null;
  const outgoing = (h.outgoing_name ?? "").trim().toLowerCase();

  // Prefer: works today + is the next shift + isn't the outgoing person.
  const worksToday = (p: { work_days: number[] | null }) =>
    !p.work_days || p.work_days.length === 0 || p.work_days.includes(todayDow);
  const notOutgoing = (p: { full_name: string }) =>
    (p.full_name ?? "").trim().toLowerCase() !== outgoing;

  let recipients = all.filter(
    (p) => worksToday(p) && notOutgoing(p) && (!nextShift || p.shift_type === nextShift),
  );
  // Fallbacks: anyone working today (not outgoing); else everyone but outgoing.
  if (recipients.length === 0) recipients = all.filter((p) => worksToday(p) && notOutgoing(p));
  if (recipients.length === 0) recipients = all.filter(notOutgoing);
  if (recipients.length === 0) return;

  const props = h.properties as { name_en?: string; name_ar?: string } | null;
  const hotelAr = props?.name_ar ?? props?.name_en ?? "الفندق";
  const hotelEn = props?.name_en ?? "the hotel";
  // Bilingual (Arabic-first, default language) — the server can't know each
  // recipient's UI language, so include both.
  const title = "تسليم وارد · Incoming handover";
  const bodyText = `تسليم وردية في ${hotelAr} بانتظارك · A shift handover at ${hotelEn} is waiting for you.`;
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
