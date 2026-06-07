// Server-side audit-log writer (service role). Best-effort; never throws.
import { createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export type AuditAction =
  | "handover_created"
  | "handover_completed"
  | "sheet_synced"
  | "drive_uploaded";

export async function logAudit(params: {
  action: AuditAction;
  handoverId?: string | null;
  actorId?: string | null;
  actorName?: string;
  meta?: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createServiceClient();
    await admin.from("audit_log").insert({
      action: params.action,
      handover_id: params.handoverId ?? null,
      actor_id: params.actorId ?? null,
      actor_name: params.actorName ?? "",
      meta: (params.meta ?? {}) as Json,
    });
  } catch {
    /* audit is best-effort */
  }
}
